import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Mocks @stellar-learn/database with an in-memory user + ledger store that
 * mirrors two real-Postgres behaviors precisely, because the tests here
 * exist to catch races that only show up when they're modeled correctly:
 *
 * 1. `$queryRaw` (standing in for `SELECT ... FOR UPDATE`) is the ONLY
 *    thing that serializes concurrent transactions for the same user. Code
 *    that runs before a transaction's `$queryRaw` call is free to interleave
 *    with another concurrent transaction's code that also hasn't reached its
 *    `$queryRaw` yet — exactly like Postgres, where nothing is serialized
 *    until the row lock is actually acquired. A mock that serialized the
 *    entire transaction callback up front would hide any bug in code that
 *    runs before the lock (which is exactly what shipped originally: an
 *    idempotency check before the lock that let two concurrent duplicates
 *    both pass it).
 * 2. `gemTransaction.create` throws on a duplicate (userId, idempotencyKey),
 *    the same way Postgres' `@@unique([userId, idempotencyKey])` would
 *    respond with a P2002 error.
 */
vi.mock('@stellar-learn/database', () => {
  const GemSource = {
    DAILY_CHECK_IN: 'DAILY_CHECK_IN',
    QUEST_REWARD: 'QUEST_REWARD',
    LEVEL_UP: 'LEVEL_UP',
    ACHIEVEMENT_UNLOCK: 'ACHIEVEMENT_UNLOCK',
    MARKETPLACE_PURCHASE: 'MARKETPLACE_PURCHASE',
    ADMIN_ADJUSTMENT: 'ADMIN_ADJUSTMENT',
    REFUND: 'REFUND',
  } as const

  class PrismaClientKnownRequestError extends Error {
    code: string
    constructor(message: string, code: string) {
      super(message)
      this.name = 'PrismaClientKnownRequestError'
      this.code = code
    }
  }

  type MockUser = { id: string; gemBalance: number }
  type MockTx = {
    id: string
    userId: string
    amount: number
    resultingBalance: number
    source: string
    metadata: unknown
    idempotencyKey: string | null
    createdAt: Date
  }

  const users = new Map<string, MockUser>()
  const transactions: MockTx[] = []
  let txCounter = 0

  // Per-user lock queue: acquireUserLock(userId) resolves to a release
  // function once it's this caller's turn. Chaining onto the map is what
  // makes concurrent acquisitions for the SAME user serialize while
  // acquisitions for DIFFERENT users (or code before any acquisition)
  // proceed freely — the same shape as a Postgres row lock.
  const userLockChains = new Map<string, Promise<void>>()
  function acquireUserLock(userId: string): Promise<() => void> {
    const previous = userLockChains.get(userId) ?? Promise.resolve()
    let release!: () => void
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    userLockChains.set(
      userId,
      previous.then(() => held)
    )
    return previous.then(() => release)
  }

  const sharedTxMethods = {
    user: {
      update: async ({ where, data }: { where: { id: string }; data: { gemBalance: number } }) => {
        const user = users.get(where.id)
        if (!user) throw new Error('not found')
        user.gemBalance = data.gemBalance
        return user
      },
    },
    gemTransaction: {
      findUnique: async ({
        where,
      }: {
        where: { userId_idempotencyKey: { userId: string; idempotencyKey: string } }
      }) => {
        const { userId, idempotencyKey } = where.userId_idempotencyKey
        return transactions.find((t) => t.userId === userId && t.idempotencyKey === idempotencyKey) ?? null
      },
      create: async ({ data }: { data: Omit<MockTx, 'id' | 'createdAt'> }) => {
        if (
          data.idempotencyKey &&
          transactions.some((t) => t.userId === data.userId && t.idempotencyKey === data.idempotencyKey)
        ) {
          throw new PrismaClientKnownRequestError(
            'Unique constraint failed on the fields: (`userId`,`idempotencyKey`)',
            'P2002'
          )
        }
        txCounter += 1
        const row: MockTx = { id: `tx_${txCounter}`, createdAt: new Date(), ...data }
        transactions.push(row)
        return row
      },
    },
  }

  const prisma = {
    user: {
      findUnique: async ({ where, select }: { where: { id: string }; select?: { gemBalance?: boolean } }) => {
        const user = users.get(where.id)
        if (!user) return null
        return select?.gemBalance ? { gemBalance: user.gemBalance } : user
      },
    },
    gemTransaction: {
      findMany: async ({ where }: { where: { userId: string } }) =>
        transactions
          .filter((t) => t.userId === where.userId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    },
    $transaction: async <T>(fn: (tx: typeof sharedTxMethods & { $queryRaw: unknown }) => Promise<T>): Promise<T> => {
      // Plain `let` + closure mutation defeats TS's control-flow narrowing
      // here (the only assignment is inside a nested async arrow), so the
      // release handle is held in a mutable container instead.
      const lock: { release: (() => void) | null } = { release: null }
      const txClient = {
        ...sharedTxMethods,
        // Acquiring the lock is the only serialization point — everything
        // the callback does before calling this runs unserialized, just
        // like Postgres before `SELECT ... FOR UPDATE` actually executes.
        $queryRaw: async (_strings: TemplateStringsArray, userId: string) => {
          lock.release = await acquireUserLock(userId)
          const user = users.get(userId)
          return user ? [{ gemBalance: user.gemBalance }] : []
        },
      }
      try {
        return await fn(txClient)
      } finally {
        // Released once the whole callback settles, mirroring the lock
        // being held until COMMIT/ROLLBACK rather than until the query
        // returns.
        lock.release?.()
      }
    },
  }

  return {
    GemSource,
    Prisma: { PrismaClientKnownRequestError },
    prisma,
    __mock: {
      seedUser: (id: string, gemBalance: number) => users.set(id, { id, gemBalance }),
      reset: () => {
        users.clear()
        transactions.length = 0
        txCounter = 0
        userLockChains.clear()
      },
      transactions,
    },
  }
})

const db = (await import('@stellar-learn/database')) as unknown as {
  __mock: { seedUser: (id: string, gemBalance: number) => void; reset: () => void; transactions: unknown[] }
  GemSource: Record<string, string>
}
const { earnGems, spendGems, getGemBalance, InsufficientGemBalanceError, InvalidGemAmountError, InvalidGemMetadataError } =
  await import('./gems')

beforeEach(() => {
  db.__mock.reset()
})

describe('earnGems / spendGems', () => {
  it('applies a simple earn and writes a matching ledger row', async () => {
    db.__mock.seedUser('u1', 0)

    const result = await earnGems({ userId: 'u1', amount: 10, source: db.GemSource.DAILY_CHECK_IN as never })

    expect(result.balance).toBe(10)
    expect(result.idempotent).toBe(false)
    expect(result.transaction.amount).toBe(10)
    expect(result.transaction.resultingBalance).toBe(10)
    expect(await getGemBalance('u1')).toBe(10)
  })

  it('never lets balance go negative and throws InsufficientGemBalanceError', async () => {
    db.__mock.seedUser('u1', 5)

    await expect(
      spendGems({ userId: 'u1', amount: 6, source: db.GemSource.MARKETPLACE_PURCHASE as never })
    ).rejects.toBeInstanceOf(InsufficientGemBalanceError)

    // Balance is untouched by the failed spend.
    expect(await getGemBalance('u1')).toBe(5)
  })

  it('rejects non-positive amounts before touching the balance', async () => {
    db.__mock.seedUser('u1', 5)
    await expect(
      earnGems({ userId: 'u1', amount: 0, source: db.GemSource.DAILY_CHECK_IN as never })
    ).rejects.toBeInstanceOf(InvalidGemAmountError)
    await expect(
      spendGems({ userId: 'u1', amount: -3, source: db.GemSource.MARKETPLACE_PURCHASE as never })
    ).rejects.toBeInstanceOf(InvalidGemAmountError)
  })

  it('rejects metadata that is not a bounded plain object', async () => {
    db.__mock.seedUser('u1', 5)
    await expect(
      earnGems({
        userId: 'u1',
        amount: 1,
        source: db.GemSource.DAILY_CHECK_IN as never,
        metadata: 'not-an-object' as never,
      })
    ).rejects.toBeInstanceOf(InvalidGemMetadataError)
    await expect(
      earnGems({
        userId: 'u1',
        amount: 1,
        source: db.GemSource.DAILY_CHECK_IN as never,
        metadata: { blob: 'x'.repeat(3000) },
      })
    ).rejects.toBeInstanceOf(InvalidGemMetadataError)
  })

  it('is idempotent: repeating the same idempotencyKey sequentially never double-awards', async () => {
    db.__mock.seedUser('u1', 0)
    const idempotencyKey = 'checkin:u1:2026-08-17'

    const first = await earnGems({ userId: 'u1', amount: 10, source: db.GemSource.DAILY_CHECK_IN as never, idempotencyKey })
    const second = await earnGems({ userId: 'u1', amount: 10, source: db.GemSource.DAILY_CHECK_IN as never, idempotencyKey })

    expect(first.idempotent).toBe(false)
    expect(second.idempotent).toBe(true)
    expect(second.balance).toBe(10)
    expect(await getGemBalance('u1')).toBe(10)
    expect(db.__mock.transactions).toHaveLength(1)
  })

  it('is idempotent under TRUE concurrency: two requests racing on the same idempotencyKey never double-award and never throw', async () => {
    db.__mock.seedUser('u1', 0)
    const idempotencyKey = 'checkin:u1:2026-08-17'

    // Both calls start before either has acquired the row lock, so this
    // reproduces the exact race a naive "check idempotency, then lock"
    // ordering is vulnerable to: both see no existing row, both proceed,
    // and only the ledger's unique constraint stops a double-award. With
    // the fix, the loser must recover cleanly (idempotent: true) instead of
    // throwing a raw P2002 up to the caller.
    const results = await Promise.all([
      earnGems({ userId: 'u1', amount: 10, source: db.GemSource.DAILY_CHECK_IN as never, idempotencyKey }),
      earnGems({ userId: 'u1', amount: 10, source: db.GemSource.DAILY_CHECK_IN as never, idempotencyKey }),
    ])

    expect(await getGemBalance('u1')).toBe(10)
    expect(db.__mock.transactions).toHaveLength(1)
    expect(results.filter((r) => !r.idempotent)).toHaveLength(1)
    expect(results.filter((r) => r.idempotent)).toHaveLength(1)
    expect(results.every((r) => r.balance === 10)).toBe(true)
  })

  it('is idempotent under concurrency with three racing callers on the same key', async () => {
    db.__mock.seedUser('u1', 0)
    const idempotencyKey = 'checkin:u1:2026-08-17'

    const [first, second, third] = await Promise.all([
      earnGems({ userId: 'u1', amount: 10, source: db.GemSource.DAILY_CHECK_IN as never, idempotencyKey }),
      earnGems({ userId: 'u1', amount: 10, source: db.GemSource.DAILY_CHECK_IN as never, idempotencyKey }),
      earnGems({ userId: 'u1', amount: 10, source: db.GemSource.DAILY_CHECK_IN as never, idempotencyKey }),
    ])

    expect(await getGemBalance('u1')).toBe(10)
    expect([first, second, third].filter((r) => !r.idempotent)).toHaveLength(1)
    expect([first, second, third].filter((r) => r.idempotent)).toHaveLength(2)
    expect(db.__mock.transactions).toHaveLength(1)
  })

  it('serializes concurrent spends so the balance can never be overdrawn', async () => {
    db.__mock.seedUser('u1', 10)

    // Two concurrent spends of 6 against a balance of 10: exactly one must
    // succeed, the other must be rejected — never both, never neither.
    const results = await Promise.allSettled([
      spendGems({ userId: 'u1', amount: 6, source: db.GemSource.MARKETPLACE_PURCHASE as never, idempotencyKey: 'buy-1' }),
      spendGems({ userId: 'u1', amount: 6, source: db.GemSource.MARKETPLACE_PURCHASE as never, idempotencyKey: 'buy-2' }),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect(await getGemBalance('u1')).toBe(4)
  })
})
