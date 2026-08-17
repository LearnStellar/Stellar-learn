import { GemSource, Prisma, prisma } from '@stellar-learn/database'

/**
 * Shared gem-economy helper. This is the ONLY place that is allowed to
 * change a user's gemBalance — check-in, quest/level rewards, and the
 * marketplace all call earnGems()/spendGems() instead of writing to
 * User.gemBalance themselves, so balance logic (locking, idempotency,
 * ledger writes) exists in exactly one place.
 *
 * Server-authoritative by construction: every function here takes a
 * server-resolved userId and amount. Route handlers must resolve the
 * amount from a fixed, server-side table keyed by GemSource (see
 * apps/web/src/app/api/gems/route.ts) — a client must never be able to
 * pass an arbitrary amount over the wire and have it applied directly.
 */

export class InsufficientGemBalanceError extends Error {
  constructor(
    public readonly userId: string,
    public readonly requested: number,
    public readonly available: number
  ) {
    super(`user ${userId} has ${available} gems, cannot spend ${requested}`)
    this.name = 'InsufficientGemBalanceError'
  }
}

export class GemUserNotFoundError extends Error {
  constructor(public readonly userId: string) {
    super(`user ${userId} not found`)
    this.name = 'GemUserNotFoundError'
  }
}

export class InvalidGemAmountError extends Error {
  constructor(public readonly amount: number) {
    super(`gem amount must be a positive integer, got ${amount}`)
    this.name = 'InvalidGemAmountError'
  }
}

export interface GemTransactionResult {
  balance: number
  transaction: {
    id: string
    userId: string
    amount: number
    resultingBalance: number
    source: GemSource
    metadata: Prisma.JsonValue | null
    idempotencyKey: string | null
    createdAt: Date
  }
  /** True when an existing ledger row satisfied an idempotencyKey instead of a new mutation being applied. */
  idempotent: boolean
}

interface ApplyGemTransactionInput {
  userId: string
  amount: number
  source: GemSource
  /** Dedupe key. Repeating a call with the same key is a no-op after the first success. */
  idempotencyKey?: string | null
  metadata?: Prisma.InputJsonValue
}

function assertPositiveInteger(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) throw new InvalidGemAmountError(amount)
}

/**
 * Apply a signed balance change inside a single DB transaction: lock the
 * user's row, compute the new balance, guard against it going negative, and
 * write both the balance and the ledger row atomically.
 *
 * Concurrency safety: `SELECT ... FOR UPDATE` takes a row lock on the user
 * for the lifetime of the transaction, so two concurrent calls for the same
 * user are serialized by Postgres rather than racing on a read-modify-write
 * — the second call always sees the first call's committed balance before
 * it computes its own new balance. This is what prevents double-spend and
 * double-award under concurrent requests.
 *
 * Idempotency: when `idempotencyKey` is supplied, a prior transaction with
 * the same (userId, idempotencyKey) short-circuits the mutation and returns
 * the original result — a client retry (network timeout, double-click,
 * duplicate webhook delivery) can never apply the change twice.
 */
async function applyGemTransaction(
  input: ApplyGemTransactionInput & { direction: 'EARN' | 'SPEND' }
): Promise<GemTransactionResult> {
  const { userId, amount, source, idempotencyKey, metadata, direction } = input
  assertPositiveInteger(amount)
  const signedAmount = direction === 'EARN' ? amount : -amount

  return prisma.$transaction(async (tx) => {
    if (idempotencyKey) {
      const existing = await tx.gemTransaction.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
      })
      if (existing) {
        return { balance: existing.resultingBalance, transaction: existing, idempotent: true }
      }
    }

    // Row lock: blocks any other transaction from reading this user's
    // balance until this one commits or rolls back.
    const locked = await tx.$queryRaw<{ gemBalance: number }[]>`
      SELECT "gemBalance" FROM "users" WHERE "id" = ${userId} FOR UPDATE
    `
    const current = locked[0]
    if (!current) throw new GemUserNotFoundError(userId)

    const nextBalance = current.gemBalance + signedAmount
    if (nextBalance < 0) {
      throw new InsufficientGemBalanceError(userId, amount, current.gemBalance)
    }

    await tx.user.update({ where: { id: userId }, data: { gemBalance: nextBalance } })

    const transaction = await tx.gemTransaction.create({
      data: {
        userId,
        amount: signedAmount,
        resultingBalance: nextBalance,
        source,
        metadata,
        idempotencyKey: idempotencyKey ?? null,
      },
    })

    return { balance: nextBalance, transaction, idempotent: false }
  })
}

/** Credit a user's gem balance. `amount` must be a positive integer resolved server-side, never taken from the client verbatim. */
export function earnGems(input: ApplyGemTransactionInput): Promise<GemTransactionResult> {
  return applyGemTransaction({ ...input, direction: 'EARN' })
}

/** Debit a user's gem balance. Throws InsufficientGemBalanceError rather than letting the balance go negative. */
export function spendGems(input: ApplyGemTransactionInput): Promise<GemTransactionResult> {
  return applyGemTransaction({ ...input, direction: 'SPEND' })
}

/** Current server-authoritative balance for a user. */
export async function getGemBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { gemBalance: true } })
  if (!user) throw new GemUserNotFoundError(userId)
  return user.gemBalance
}

/** Most recent ledger entries for a user, newest first. */
export function listGemTransactions(userId: string, limit = 50) {
  return prisma.gemTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
  })
}

/**
 * Fixed reward table for earn sources that are triggered directly by an
 * end-user request (currently just the daily check-in). Keeping this here
 * — rather than accepting an amount from the request body — is what makes
 * the /api/gems earn path tamper-proof: the client can only ever select a
 * `source`, never a value.
 *
 * Sources like QUEST_REWARD or LEVEL_UP are awarded by trusted server code
 * (e.g. the progress route) that already knows the correct amount from
 * curriculum content, so they call earnGems() directly and don't need an
 * entry here.
 */
export const CLIENT_TRIGGERED_EARN_AMOUNTS: Partial<Record<GemSource, number>> = {
  [GemSource.DAILY_CHECK_IN]: 10,
}

/** UTC-day key used as the idempotency key for check-in earns, so repeat calls within the same day never double-award. */
export function checkInIdempotencyKey(userId: string, date: Date = new Date()): string {
  const day = date.toISOString().slice(0, 10) // YYYY-MM-DD
  return `checkin:${userId}:${day}`
}
