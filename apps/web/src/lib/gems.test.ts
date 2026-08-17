import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Mocks @stellar-learn/database with an in-memory user + ledger store.
 * $transaction serializes callbacks through a queue the same way a real
 * Postgres `SELECT ... FOR UPDATE` would serialize concurrent transactions
 * on the same row, so these tests exercise the same race the real DB
 * protects against without needing a live database in CI.
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
  // Serializes every $transaction callback, one at a time — the mock's
  // stand-in for a Postgres row lock.
  let queue: Promise<unknown> = Promise.resolve()

  const txClient = {
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
        txCounter += 1
        const row: MockTx = { id: `tx_${txCounter}`, createdAt: new Date(), ...data }
        transactions.push(row)
        return row
      },
    },
    $queryRaw: async (_strings: TemplateStringsArray, userId: string) => {
      const user = users.get(userId)
      return user ? [{ gemBalance: user.gemBalance }] : []
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
    $transaction: async <T>(fn: (tx: typeof txClient) => Promise<T>): Promise<T> => {
      const run = queue.then(() => fn(txClient))
      queue = run.then(
        () => undefined,
        () => undefined
      )
      return run
    },
  }

  return {
    GemSource,
    Prisma: {},
    prisma,
    __mock: {
      seedUser: (id: string, gemBalance: number) => users.set(id, { id, gemBalance }),
      reset: () => {
        users.clear()
        transactions.length = 0
        txCounter = 0
        queue = Promise.resolve()
      },
      transactions,
    },
  }
})

const db = (await import('@stellar-learn/database')) as unknown as {
  __mock: { seedUser: (id: string, gemBalance: number) => void; reset: () => void; transactions: unknown[] }
  GemSource: Record<string, string>
}
const { earnGems, spendGems, getGemBalance, InsufficientGemBalanceError, InvalidGemAmountError } = await import(
  './gems'
)

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

  it('is idempotent: repeating the same idempotencyKey never double-awards, even fired concurrently', async () => {
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
