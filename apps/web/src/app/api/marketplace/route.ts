import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { GemSource, prisma } from '@stellar-learn/database'
import { getItemsByTier, getMarketplaceItem } from '@stellar-learn/content/marketplace'
import { generateKeypair, mintItemNFT } from '@stellar-learn/stellar'
import { clerkEnabled } from '@/lib/auth'
import { pickRandomCharacter } from '@/lib/characters'
import { loggerFromHeaders } from '@/lib/correlation'
import { earnGems, getGemBalance, InsufficientGemBalanceError, spendGems } from '@/lib/gems'

/**
 * Marketplace catalog + purchase surface.
 *
 * GET  -> catalog grouped by tier, the caller's owned item ids, and gem
 *         balance — one request, no per-item follow-ups.
 * POST -> { itemId } only. The server resolves the authoritative price from
 *         the catalog; a client-sent price is never read or trusted.
 *
 * Purchase ordering (deliberately in this sequence — see the inline
 * comments in POST for why): authenticate, resolve the catalog item,
 * reject if already owned, verify the balance WITHOUT deducting, mint on
 * testnet, and only once the mint has actually succeeded, deduct gems and
 * record ownership. A failed mint never touches gemBalance or the
 * ownership table.
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

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  )
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
      prisma.itemOwnership.findMany({ where: { userId: user.id }, select: { itemId: true } }),
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

  // 2. Resolve the item from the catalog — the ONLY source of truth for
  // price. A client-supplied price is never read anywhere in this route.
  const item = getMarketplaceItem(itemId)
  if (!item) {
    return NextResponse.json({ error: 'Unknown item' }, { status: 404 })
  }

  try {
    const user = await resolveUser(clerkId)

    // 3. Already owned? Reject before doing any work. The unique constraint
    // on ItemOwnership is the backstop for a concurrent duplicate request
    // that races past this check — handled below via the create()/P2002
    // path, which refunds instead of leaving a double-charge.
    const alreadyOwned = await prisma.itemOwnership.findUnique({
      where: { userId_itemId: { userId: user.id, itemId } },
    })
    if (alreadyOwned) {
      return NextResponse.json({ error: 'Item already owned' }, { status: 409 })
    }

    // 4. Verify the balance WITHOUT deducting yet — spending happens only
    // after a successful mint (step 6).
    const balance = await getGemBalance(user.id)
    if (balance < item.priceGems) {
      return NextResponse.json({ error: 'Insufficient gems' }, { status: 402 })
    }

    const ownerPublicKey = await ensureStellarPublicKey(user.id, user.stellarPublicKey)

    // 5. Mint on testnet. A failure here stops the purchase cold: nothing
    // has been charged and nothing has been recorded.
    let mint
    try {
      mint = await mintItemNFT({ itemId: item.id, owner: ownerPublicKey, metadata: { userId: user.id } })
    } catch (error) {
      log.error('marketplace mint failed', { clerkId, itemId }, error)
      return NextResponse.json({ error: 'Failed to mint item on the Stellar testnet' }, { status: 502 })
    }

    // 6. Mint succeeded — deduct gems (spendGems is the only code allowed to
    // touch gemBalance, and is itself atomic + row-locked) and record
    // ownership. A fixed idempotencyKey per (user, item) means a retried
    // request after a partial failure below is answered from the original
    // spend instead of double-charging.
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
        // Balance dropped between the check in step 4 and this spend (a
        // concurrent purchase). The item was minted but never charged for —
        // no ownership row is written, so nothing was given away for free.
        return NextResponse.json({ error: 'Insufficient gems' }, { status: 402 })
      }
      log.error('marketplace gem spend failed after successful mint', { clerkId, itemId, txHash: mint.transactionHash }, error)
      return NextResponse.json({ error: 'Failed to complete purchase' }, { status: 500 })
    }

    // Recoverability: if this create() throws for any reason other than a
    // concurrent duplicate (e.g. a transient DB error), the gem spend above
    // already committed with idempotencyKey set, and this same request body
    // retried later will short-circuit spendGems (idempotent: true, no
    // double-charge) and simply retry this create() — self-healing with no
    // separate recovery path needed.
    try {
      const ownership = await prisma.itemOwnership.create({
        data: {
          userId: user.id,
          itemId: item.id,
          stellarAssetId: mint.assetId,
          stellarTxHash: mint.transactionHash,
          status: 'complete',
        },
      })

      log.info('marketplace purchase complete', { clerkId, itemId, txHash: mint.transactionHash })
      return NextResponse.json({
        item,
        gemBalance: spend.balance,
        ownership: { itemId: ownership.itemId, purchasedAt: ownership.purchasedAt },
        txHash: mint.transactionHash,
        network: 'testnet',
      })
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        // A concurrent request for the same item won the race and already
        // recorded ownership. This request's spend was real, so refund it
        // rather than leaving the user charged twice for one item — reusing
        // the same idempotencyKey scoped to this specific spend keeps a
        // retry of the refund itself from double-refunding.
        const refund = await earnGems({
          userId: user.id,
          amount: item.priceGems,
          source: GemSource.REFUND,
          idempotencyKey: `${idempotencyKey}:race-refund`,
          metadata: { itemId: item.id, reason: 'concurrent duplicate purchase' },
        })
        log.info('marketplace purchase race — refunded duplicate spend', { clerkId, itemId })
        return NextResponse.json(
          { error: 'Item already owned', gemBalance: refund.balance },
          { status: 409 }
        )
      }
      throw error
    }
  } catch (error) {
    log.error('marketplace purchase failed', { clerkId, itemId }, error)
    return NextResponse.json({ error: 'Failed to complete purchase' }, { status: 500 })
  }
}
