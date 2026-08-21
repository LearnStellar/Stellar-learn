import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { GemSource, Prisma, prisma } from '@stellar-learn/database'
import { clerkEnabled } from '@/lib/auth'
import { pickRandomCharacter } from '@/lib/characters'
import { loggerFromHeaders } from '@/lib/correlation'
import {
  CLIENT_SPENDABLE_SOURCES,
  CLIENT_TRIGGERED_EARN_AMOUNTS,
  InsufficientGemBalanceError,
  InvalidGemAmountError,
  InvalidGemMetadataError,
  checkInIdempotencyKey,
  earnGems,
  listGemTransactions,
  spendGems,
} from '@/lib/gems'

/**
 * Server-authoritative gem economy surface for the signed-in player.
 *
 * GET  -> current balance + recent ledger entries.
 * POST -> apply an earn or spend. The client never supplies an amount for
 * an earn — it selects a `source` and the amount is looked up from
 * CLIENT_TRIGGERED_EARN_AMOUNTS on the server, so the request body cannot
 * be tampered with to award more gems. Spends carry a client-supplied
 * amount because they're driven by a marketplace price list the caller
 * already knows, but every mutation goes through lib/gems.ts, which
 * enforces the balance floor and idempotency regardless of the caller.
 */

async function resolveUser(clerkId: string) {
  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? `${clerkId}@noemail.local`
  const username = clerkUser?.username ?? `player_${clerkId.slice(-8)}`

  return prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: {
      clerkId,
      email,
      username,
      avatarUrl: clerkUser?.imageUrl ?? null,
      characterId: pickRandomCharacter(),
    },
  })
}

export async function GET(request: Request) {
  const log = loggerFromHeaders(request.headers)
  if (!clerkEnabled) return NextResponse.json({ error: 'Auth not configured' }, { status: 401 })

  const { userId: clerkId } = auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true, gemBalance: true } })
    if (!user) return NextResponse.json({ balance: 0, transactions: [] })

    const transactions = await listGemTransactions(user.id)
    return NextResponse.json({ balance: user.gemBalance, transactions })
  } catch (error) {
    log.error('gem balance fetch failed', { clerkId }, error)
    return NextResponse.json({ error: 'Failed to load gem balance' }, { status: 500 })
  }
}

type EarnBody = { action: 'earn'; source: 'DAILY_CHECK_IN' }
type SpendBody = { action: 'spend'; source: 'MARKETPLACE_PURCHASE'; amount: number; idempotencyKey: string; metadata?: unknown }
type GemRequestBody = EarnBody | SpendBody

export async function POST(request: Request) {
  const log = loggerFromHeaders(request.headers)
  if (!clerkEnabled) return NextResponse.json({ error: 'Auth not configured' }, { status: 401 })

  const { userId: clerkId } = auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: GemRequestBody
  try {
    body = (await request.json()) as GemRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body?.action !== 'earn' && body?.action !== 'spend') {
    return NextResponse.json({ error: 'action must be "earn" or "spend"' }, { status: 400 })
  }

  try {
    const user = await resolveUser(clerkId)

    if (body.action === 'earn') {
      // Only sources in CLIENT_TRIGGERED_EARN_AMOUNTS may be earned directly
      // through this route; the amount always comes from that server-side
      // table, never from the request body.
      const source = GemSource[body.source as keyof typeof GemSource]
      const amount = source ? CLIENT_TRIGGERED_EARN_AMOUNTS[source] : undefined
      if (!source || amount === undefined) {
        return NextResponse.json({ error: `source "${body.source}" is not directly earnable` }, { status: 400 })
      }

      // Deterministic per-day key: calling this twice in the same UTC day
      // returns the first result instead of awarding gems twice.
      const idempotencyKey = checkInIdempotencyKey(user.id)
      const result = await earnGems({ userId: user.id, amount, source, idempotencyKey })

      log.info('gem earn applied', { clerkId, source, amount, idempotent: result.idempotent })
      return NextResponse.json({
        success: true,
        balance: result.balance,
        idempotent: result.idempotent,
        transaction: result.transaction,
      })
    }

    // spend
    const { source: sourceKey, amount, idempotencyKey, metadata } = body
    const source = GemSource[sourceKey as keyof typeof GemSource]
    // Only a fixed whitelist of sources may be spent through this public
    // route — a client must never be able to write ADMIN_ADJUSTMENT, REFUND,
    // or an earn-only source into the audit ledger.
    if (!source || !CLIENT_SPENDABLE_SOURCES.has(source)) {
      return NextResponse.json({ error: `source "${sourceKey}" cannot be spent through this route` }, { status: 400 })
    }
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return NextResponse.json({ error: 'idempotencyKey is required for spends' }, { status: 400 })
    }
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive integer' }, { status: 400 })
    }

    const result = await spendGems({
      userId: user.id,
      amount,
      source,
      idempotencyKey,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    })

    log.info('gem spend applied', { clerkId, source, amount, idempotent: result.idempotent })
    return NextResponse.json({
      success: true,
      balance: result.balance,
      idempotent: result.idempotent,
      transaction: result.transaction,
    })
  } catch (error) {
    if (error instanceof InsufficientGemBalanceError) {
      return NextResponse.json({ error: 'Insufficient gem balance' }, { status: 409 })
    }
    if (error instanceof InvalidGemAmountError || error instanceof InvalidGemMetadataError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    log.error('gem mutation failed', { clerkId }, error)
    return NextResponse.json({ error: 'Failed to update gem balance' }, { status: 500 })
  }
}
