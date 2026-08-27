import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { GemSource, prisma } from '@stellar-learn/database'
import { getItemsByTier, getMarketplaceItem } from '@stellar-learn/content/marketplace'
import { generateKeypair, mintItemNFT } from '@stellar-learn/stellar'
import { clerkEnabled } from '@/lib/auth'
import { pickRandomCharacter } from '@/lib/characters'
import { loggerFromHeaders } from '@/lib/correlation'
import { getGemBalance, InsufficientGemBalanceError, spendGems } from '@/lib/gems'

/**
 * Marketplace catalog + purchase surface.
 *
 * GET  -> catalog grouped by tier, the caller's owned item ids, and gem
 *         balance — one request, no per-item follow-ups.
 * POST -> { itemId } only. The server resolves the authoritative price from
 *         the catalog; a client-sent price is never read or trusted.
 *
 * Purchase flow — RESERVE FIRST, then mint, then charge:
 *   1. authenticate
 *   2. resolve the catalog item (404 if unknown)
 *   3. reserve an ItemOwnership row for (userId, itemId) as "pending" —
 *      this is the concurrency gate. The @@unique([userId, itemId])
 *      constraint means at most one request can hold the reservation for a
 *      given item at a time; a second concurrent request for the same item
 *      is rejected immediately (409), before it ever mints or charges
 *      anything. This is what actually prevents a race from minting the
 *      same item twice or handing it out for free — see reserveOwnership().
 *   4. verify gem balance >= price (do NOT deduct yet)
 *   5. mint on testnet
 *   6. deduct gems (spendGems — the only code allowed to touch gemBalance)
 *   7. flip the reservation to "complete" with the real Stellar identifiers
 *
 * A failure at step 4 or 5 releases the reservation (deletes the pending
 * row) so the same user can immediately retry. A failure at step 6 or 7
 * deliberately does NOT release it — see the comments at those call sites.
 */

/** How long a "pending" reservation is honored before a later request may reclaim it as abandoned. */
const RESERVATION_STALE_AFTER_MS = 60_000

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  )
}

type ReserveResult =
  | { reserved: true; ownershipId: string }
  | { reserved: false; reason: 'owned' | 'in-progress' }

/**
 * Reserve the (userId, itemId) pair for this purchase attempt, or report why
 * it couldn't be reserved. Three cases:
 *
 * - No existing row: try to create one as "pending". If a concurrent
 *   request wins the create first, our create() hits the unique constraint
 *   (P2002) — we lost the race, report "in-progress".
 * - An existing "complete" row: the item is already owned.
 * - An existing "pending" row younger than RESERVATION_STALE_AFTER_MS:
 *   another attempt is genuinely in flight — report "in-progress" rather
 *   than reserving on top of it.
 * - An existing "pending" row OLDER than the threshold: treated as an
 *   abandoned attempt (the process that reserved it crashed, or its mint/
 *   spend/flip step never finished). Reclaimed via a compare-and-swap
 *   update — the WHERE clause requires createdAt to still match what we
 *   just read, so if two requests both try to reclaim the same stale row
 *   at once, only one update() actually matches a row (count 1); the loser
 *   sees count 0 and correctly reports "in-progress" instead of also
 *   reserving it.
 */
async function reserveOwnership(userId: string, itemId: string): Promise<ReserveResult> {
  const existing = await prisma.itemOwnership.findUnique({
    where: { userId_itemId: { userId, itemId } },
  })

  if (!existing) {
    try {
      const created = await prisma.itemOwnership.create({
        data: { userId, itemId, status: 'pending' },
      })
      return { reserved: true, ownershipId: created.id }
    } catch (error) {
      if (isUniqueConstraintViolation(error)) return { reserved: false, reason: 'in-progress' }
      throw error
    }
  }

  if (existing.status === 'complete') {
    return { reserved: false, reason: 'owned' }
  }

  const age = Date.now() - existing.createdAt.getTime()
  if (age < RESERVATION_STALE_AFTER_MS) {
    return { reserved: false, reason: 'in-progress' }
  }

  const reclaimed = await prisma.itemOwnership.updateMany({
    where: { id: existing.id, createdAt: existing.createdAt },
    data: { createdAt: new Date() },
  })
  if (reclaimed.count === 0) {
    // Someone else reclaimed (or completed) it between our read and this write.
    return { reserved: false, reason: 'in-progress' }
  }
  return { reserved: true, ownershipId: existing.id }
}

/** Delete an unfulfilled reservation so the same user can retry immediately. */
async function releaseReservation(ownershipId: string) {
  await prisma.itemOwnership.delete({ where: { id: ownershipId } }).catch(() => {
    /* already gone (e.g. reclaimed by a retry) — nothing to clean up */
  })
}

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

/**
 * Every mint needs a destination public key. This codebase never persists a
 * player's Stellar SECRET key anywhere (see `User.stellarPublicKey`, which
 * has no matching secret column) — generating one here only to hand the
 * secret to the player would be a real wallet-custody feature (secure
 * delivery, later signing, recovery) that's out of scope for the
 * marketplace itself. So the generated secret is used for nothing and kept
 * nowhere: only the public key is persisted, purely as a stable identity
 * for claimable-balance delivery. A real player-controlled wallet/claim
 * flow is a separate, bigger feature — see the PR's human follow-ups.
 */
async function ensureStellarPublicKey(userId: string, existing: string | null): Promise<string> {
  if (existing) return existing
  const { publicKey } = generateKeypair()
  await prisma.user.update({ where: { id: userId }, data: { stellarPublicKey: publicKey } })
  return publicKey
}

export async function GET(request: Request) {
  const log = loggerFromHeaders(request.headers)
  if (!clerkEnabled) return NextResponse.json({ error: 'Auth not configured' }, { status: 401 })

  const { userId: clerkId } = auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ tiers: getItemsByTier(), ownedItemIds: [], gemBalance: 0 })
    }

    const [ownerships, gemBalance] = await Promise.all([
      prisma.itemOwnership.findMany({
        where: { userId: user.id, status: 'complete' },
        select: { itemId: true },
      }),
      getGemBalance(user.id),
    ])

    return NextResponse.json({
      tiers: getItemsByTier(),
      ownedItemIds: ownerships.map((o) => o.itemId),
      gemBalance,
    })
  } catch (error) {
    log.error('marketplace fetch failed', { clerkId }, error)
    return NextResponse.json({ error: 'Failed to load marketplace' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const log = loggerFromHeaders(request.headers)
  if (!clerkEnabled) return NextResponse.json({ error: 'Auth not configured' }, { status: 401 })

  const { userId: clerkId } = auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as { itemId?: unknown }
  if (typeof body.itemId !== 'string' || body.itemId.length === 0) {
    return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
  }
  const itemId = body.itemId

  // Resolve the item from the catalog — the ONLY source of truth for price.
  // A client-supplied price is never read anywhere in this route.
  const item = getMarketplaceItem(itemId)
  if (!item) {
    return NextResponse.json({ error: 'Unknown item' }, { status: 404 })
  }

  try {
    const user = await resolveUser(clerkId)

    const reservation = await reserveOwnership(user.id, itemId)
    if (!reservation.reserved) {
      const message =
        reservation.reason === 'owned' ? 'Item already owned' : 'Purchase already in progress for this item'
      return NextResponse.json({ error: message }, { status: 409 })
    }

    // From here on this request exclusively holds the (user, item)
    // reservation — no other request can also be minting/charging for it.
    const balance = await getGemBalance(user.id)
    if (balance < item.priceGems) {
      await releaseReservation(reservation.ownershipId)
      return NextResponse.json({ error: 'Insufficient gems' }, { status: 402 })
    }

    const ownerPublicKey = await ensureStellarPublicKey(user.id, user.stellarPublicKey)

    let mint
    try {
      mint = await mintItemNFT({ itemId: item.id, owner: ownerPublicKey, metadata: { userId: user.id } })
    } catch (error) {
      // Minting has no idempotency of its own — nothing happened on-chain,
      // so releasing the reservation for an immediate retry is correct.
      await releaseReservation(reservation.ownershipId)
      log.error('marketplace mint failed', { clerkId, itemId }, error)
      return NextResponse.json({ error: 'Failed to mint item on the Stellar testnet' }, { status: 502 })
    }

    // Deduct gems. idempotencyKey is fixed per (user, item) forever, so a
    // retry of this exact purchase — even a manual one after the process
    // crashed here — can never double-charge: spendGems short-circuits to
    // the original result if it already committed.
    const idempotencyKey = `marketplace:${user.id}:${item.id}`
    let spend
    try {
      spend = await spendGems({
        userId: user.id,
        amount: item.priceGems,
        source: GemSource.MARKETPLACE_PURCHASE,
        idempotencyKey,
        metadata: { itemId: item.id, txHash: mint.transactionHash, assetId: mint.assetId },
      })
    } catch (error) {
      if (error instanceof InsufficientGemBalanceError) {
        // Balance genuinely dropped between the check above and this spend
        // (e.g. gems spent elsewhere in another request) — release so the
        // user can retry once they have enough.
        await releaseReservation(reservation.ownershipId)
        return NextResponse.json({ error: 'Insufficient gems' }, { status: 402 })
      }
      // Deliberately NOT released: the mint already happened, and this spend
      // may or may not have actually committed (e.g. a timeout after the DB
      // commit but before we got the response). Leaving the row "pending"
      // means a retry finds it via reserveOwnership() and completes the
      // same purchase — via the idempotencyKey above if the spend did
      // commit, or a fresh spend if it didn't — rather than a fresh
      // reservation minting a second, redundant NFT.
      log.error(
        'marketplace gem spend failed after successful mint',
        { clerkId, itemId, txHash: mint.transactionHash },
        error
      )
      return NextResponse.json({ error: 'Failed to complete purchase' }, { status: 500 })
    }

    const ownership = await prisma.itemOwnership.update({
      where: { id: reservation.ownershipId },
      data: {
        stellarAssetId: mint.assetId,
        stellarTxHash: mint.transactionHash,
        status: 'complete',
        completedAt: new Date(),
      },
    })

    log.info('marketplace purchase complete', { clerkId, itemId, txHash: mint.transactionHash })
    return NextResponse.json({
      item,
      gemBalance: spend.balance,
      ownership: { itemId: ownership.itemId, purchasedAt: ownership.completedAt },
      txHash: mint.transactionHash,
      network: 'testnet',
    })
  } catch (error) {
    log.error('marketplace purchase failed', { clerkId, itemId }, error)
    return NextResponse.json({ error: 'Failed to complete purchase' }, { status: 500 })
  }
}
