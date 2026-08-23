import { beforeEach, describe, expect, it, vi } from 'vitest'

const CLERK_ID = 'clerk_test_user'
const KNOWN_ITEM_ID = 'sword-legendary' // real catalog item — price/category come from the real catalog, not a mock

let dbUser: { id: string; clerkId: string; stellarPublicKey: string | null }
let ownerships: { userId: string; itemId: string }[]
let gemBalance: number
// When true, the next itemOwnership.create() simulates a concurrent request
// having already recorded ownership a moment earlier (a race past the
// earlier findUnique check) instead of behaving normally.
let simulateRaceOnCreate = false

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => ({ userId: CLERK_ID }),
  currentUser: async () => ({
    emailAddresses: [{ emailAddress: 'tester@example.com' }],
    username: 'tester',
    imageUrl: null,
  }),
}))

vi.mock('@/lib/auth', () => ({ clerkEnabled: true }))

vi.mock('@stellar-learn/database', () => ({
  GemSource: { MARKETPLACE_PURCHASE: 'MARKETPLACE_PURCHASE', REFUND: 'REFUND' },
  prisma: {
    user: {
      findUnique: async ({ where }: { where: { clerkId: string } }) =>
        where.clerkId === dbUser.clerkId ? { ...dbUser } : null,
      upsert: async () => ({ ...dbUser }),
      update: async ({ data }: { data: Partial<typeof dbUser> }) => {
        dbUser = { ...dbUser, ...data }
        return { ...dbUser }
      },
    },
    itemOwnership: {
      findUnique: async ({ where }: { where: { userId_itemId: { userId: string; itemId: string } } }) =>
        ownerships.find(
          (o) => o.userId === where.userId_itemId.userId && o.itemId === where.userId_itemId.itemId
        ) ?? null,
      findMany: async ({ where }: { where: { userId: string } }) =>
        ownerships.filter((o) => o.userId === where.userId),
      create: async ({ data }: { data: { userId: string; itemId: string } }) => {
        if (simulateRaceOnCreate) {
          simulateRaceOnCreate = false
          ownerships.push({ userId: data.userId, itemId: data.itemId }) // the "winning" concurrent request
          const err = new Error('Unique constraint failed') as Error & { code: string }
          err.code = 'P2002'
          throw err
        }
        if (ownerships.some((o) => o.userId === data.userId && o.itemId === data.itemId)) {
          const err = new Error('Unique constraint failed') as Error & { code: string }
          err.code = 'P2002'
          throw err
        }
        const row = { ...data, purchasedAt: new Date() }
        ownerships.push(row)
        return row
      },
    },
  },
}))

vi.mock('@stellar-learn/stellar', () => ({
  generateKeypair: () => ({ publicKey: 'GENERATED_PUBLIC_KEY', secretKey: 'unused' }),
  mintItemNFT: vi.fn(async () => ({ transactionHash: 'fake-tx-hash', assetId: 'CODE123:GISSUER' })),
}))

vi.mock('@/lib/gems', async () => {
  const actual = await vi.importActual<typeof import('@/lib/gems')>('@/lib/gems')
  return {
    ...actual,
    getGemBalance: async () => gemBalance,
    spendGems: vi.fn(async ({ amount }: { amount: number }) => {
      if (amount > gemBalance) throw new actual.InsufficientGemBalanceError('user_1', amount, gemBalance)
      gemBalance -= amount
      return { balance: gemBalance, idempotent: false, transaction: {} }
    }),
    earnGems: vi.fn(async ({ amount }: { amount: number }) => {
      gemBalance += amount
      return { balance: gemBalance, idempotent: false, transaction: {} }
    }),
  }
})

function post(body: unknown) {
  return new Request('http://localhost/api/marketplace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function get() {
  return new Request('http://localhost/api/marketplace')
}

describe('api/marketplace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbUser = { id: 'user_1', clerkId: CLERK_ID, stellarPublicKey: 'GEXISTINGPUBLICKEY' }
    ownerships = []
    gemBalance = 10000
    simulateRaceOnCreate = false
  })

  it('GET returns the full catalog grouped by tier, plus ownership and balance, in one call', async () => {
    const { GET } = await import('./route')
    const res = await GET(get())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tiers.map((t: { tier: string }) => t.tier)).toEqual(['rare', 'epic', 'legendary', 'mythic'])
    expect(body.tiers.reduce((n: number, t: { items: unknown[] }) => n + t.items.length, 0)).toBe(20)
    expect(body.gemBalance).toBe(10000)
    expect(body.ownedItemIds).toEqual([])
  })

  it('404s for an unknown item id and never calls the mint or spend paths', async () => {
    const { POST } = await import('./route')
    const { mintItemNFT } = await import('@stellar-learn/stellar')
    const { spendGems } = await import('@/lib/gems')

    const res = await POST(post({ itemId: 'not-a-real-item' }))
    expect(res.status).toBe(404)
    expect(mintItemNFT).not.toHaveBeenCalled()
    expect(spendGems).not.toHaveBeenCalled()
  })

  it('completes a purchase: mints, deducts the catalog price (ignoring any client-sent price), and records ownership', async () => {
    const { POST } = await import('./route')
    const { mintItemNFT } = await import('@stellar-learn/stellar')

    // A client-sent priceGems must be completely ignored — the route type
    // doesn't even read it, but sending one proves it has no effect.
    const res = await POST(post({ itemId: KNOWN_ITEM_ID, priceGems: 1 }))
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.item.id).toBe(KNOWN_ITEM_ID)
    expect(body.txHash).toBe('fake-tx-hash')
    expect(body.network).toBe('testnet')
    expect(mintItemNFT).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: KNOWN_ITEM_ID, owner: 'GEXISTINGPUBLICKEY' })
    )
    expect(gemBalance).toBe(10000 - body.item.priceGems)
    expect(body.gemBalance).toBe(gemBalance)
    expect(ownerships).toEqual([
      expect.objectContaining({ userId: 'user_1', itemId: KNOWN_ITEM_ID }),
    ])
  })

  it('generates a Stellar public key for a user who does not have one yet', async () => {
    dbUser.stellarPublicKey = null
    const { POST } = await import('./route')
    const { mintItemNFT } = await import('@stellar-learn/stellar')

    await POST(post({ itemId: KNOWN_ITEM_ID }))
    expect(mintItemNFT).toHaveBeenCalledWith(expect.objectContaining({ owner: 'GENERATED_PUBLIC_KEY' }))
    expect(dbUser.stellarPublicKey).toBe('GENERATED_PUBLIC_KEY')
  })

  it('rejects a purchase when gem balance is insufficient, without minting or charging', async () => {
    gemBalance = 0
    const { POST } = await import('./route')
    const { mintItemNFT } = await import('@stellar-learn/stellar')

    const res = await POST(post({ itemId: KNOWN_ITEM_ID }))
    expect(res.status).toBe(402)
    expect(mintItemNFT).not.toHaveBeenCalled()
    expect(ownerships).toEqual([])
  })

  it('rejects a purchase for an already-owned item without minting again', async () => {
    ownerships.push({ userId: 'user_1', itemId: KNOWN_ITEM_ID })
    const { POST } = await import('./route')
    const { mintItemNFT } = await import('@stellar-learn/stellar')

    const res = await POST(post({ itemId: KNOWN_ITEM_ID }))
    expect(res.status).toBe(409)
    expect(mintItemNFT).not.toHaveBeenCalled()
  })

  it('leaves the user uncharged and unowning when the mint fails', async () => {
    const { mintItemNFT } = await import('@stellar-learn/stellar')
    vi.mocked(mintItemNFT).mockRejectedValueOnce(new Error('Horizon is down'))
    const { POST } = await import('./route')
    const { spendGems } = await import('@/lib/gems')

    const balanceBefore = gemBalance
    const res = await POST(post({ itemId: KNOWN_ITEM_ID }))

    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).not.toMatch(/Horizon is down/) // no internal error detail leaked
    expect(spendGems).not.toHaveBeenCalled()
    expect(gemBalance).toBe(balanceBefore)
    expect(ownerships).toEqual([])
  })

  it('refunds the spend if a concurrent request already recorded ownership (race)', async () => {
    simulateRaceOnCreate = true
    const { POST } = await import('./route')

    const balanceBefore = gemBalance
    const res = await POST(post({ itemId: KNOWN_ITEM_ID }))
    expect(res.status).toBe(409)
    expect(gemBalance).toBe(balanceBefore) // spent then refunded — net zero
  })
})
