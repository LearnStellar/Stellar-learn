import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { GemSource, Prisma, prisma } from '@stellar-learn/database'
import { clerkEnabled } from '@/lib/auth'
import { pickRandomCharacter } from '@/lib/characters'
import { loggerFromHeaders } from '@/lib/correlation'
import {
  CLIENT_SPENDABLE_SOURCES,
  InsufficientGemBalanceError,
  InvalidGemAmountError,
  InvalidGemMetadataError,
  listGemTransactions,
  spendGems,
} from '@/lib/gems'

/**
 * Server-authoritative gem economy surface for the signed-in player.
 *
 * GET  -> current balance + recent ledger entries.
 * POST -> apply a spend. Every gem EARN happens through a feature route that
 * owns its reward logic (e.g. /api/checkin credits DAILY_CHECK_IN with a
 * streak-scaled amount and a timezone-aware idempotency key); this route only
 * handles spends so there is exactly one server-authoritative path that can
 * credit a balance. Spends carry a client-supplied amount because they're
 * driven by a marketplace price list the caller already knows, but every
 * mutation still goes through lib/gems.ts, which enforces the balance floor
 * and idempotency regardless of the caller.
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

type SpendBody = { action: 'spend'; source: 'MARKETPLACE_PURCHASE'; amount: number; idempotencyKey: string; metadata?: unknown }
type GemRequestBody = SpendBody

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

  if (body?.action !== 'spend') {
    return NextResponse.json({ error: 'action must be "spend"' }, { status: 400 })
  }

  try {
    const user = await resolveUser(clerkId)

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
