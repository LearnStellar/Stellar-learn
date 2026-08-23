import { beforeEach, describe, expect, it, vi } from 'vitest'

const CLERK_ID = 'clerk_test_user'
const KNOWN_ITEM_ID = 'sword-legendary' // real catalog item — price/category come from the real catalog, not a mock

interface OwnershipRow {
  id: string
  userId: string
  itemId: string
  status: string
  createdAt: Date
  completedAt: Date | null
  stellarAssetId: string | null
  stellarTxHash: string | null
}

let dbUser: { id: string; clerkId: string; stellarPublicKey: string | null }
let ownerships: OwnershipRow[]
let gemBalance: number
let nextOwnershipId: number

function p2002(): never {
  const err = new Error('Unique constraint failed') as Error & { code: string }
  err.code = 'P2002'
  throw err
}

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
      findMany: async ({ where }: { where: { userId: string; status?: string } }) =>
        ownerships.filter((o) => o.userId === where.userId && (!where.status || o.status === where.status)),
      create: async ({ data }: { data: { userId: string; itemId: string; status?: string } }) => {
        if (ownerships.some((o) => o.userId === data.userId && o.itemId === data.itemId)) p2002()
        const row: OwnershipRow = {
          id: `own_${nextOwnershipId++}`,
          userId: data.userId,
          itemId: data.itemId,
          status: data.status ?? 'pending',
          createdAt: new Date(),
          completedAt: null,
          stellarAssetId: null,
          stellarTxHash: null,
        }
        ownerships.push(row)
        return row
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<OwnershipRow> }) => {
        const row = ownerships.find((o) => o.id === where.id)
        if (!row) throw new Error('not found')
        Object.assign(row, data)
        return row
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; createdAt: Date }
        data: Partial<OwnershipRow>
      }) => {
        const row = ownerships.find((o) => o.id === where.id && o.createdAt.getTime() === where.createdAt.getTime())
        if (!row) return { count: 0 }
        Object.assign(row, data)
        return { count: 1 }
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const index = ownerships.findIndex((o) => o.id === where.id)
        if (index !== -1) ownerships.splice(index, 1)
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
    nextOwnershipId = 1
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

  it('GET only reports "complete" ownerships, not an in-flight pending reservation', async () => {
    ownerships.push({
      id: 'own_pending',
      userId: 'user_1',
      itemId: KNOWN_ITEM_ID,
      status: 'pending',
      createdAt: new Date(),
      completedAt: null,
      stellarAssetId: null,
      stellarTxHash: null,
    })
    const { GET } = await import('./route')
    const body = await (await GET(get())).json()
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
    expect(ownerships).toHaveLength(1)
    expect(ownerships[0]).toMatchObject({
      userId: 'user_1',
      itemId: KNOWN_ITEM_ID,
      status: 'complete',
      stellarAssetId: 'CODE123:GISSUER',
      stellarTxHash: 'fake-tx-hash',
    })
  })

  it('generates a Stellar public key for a user who does not have one yet', async () => {
    dbUser.stellarPublicKey = null
    const { POST } = await import('./route')
    const { mintItemNFT } = await import('@stellar-learn/stellar')

    await POST(post({ itemId: KNOWN_ITEM_ID }))
    expect(mintItemNFT).toHaveBeenCalledWith(expect.objectContaining({ owner: 'GENERATED_PUBLIC_KEY' }))
    expect(dbUser.stellarPublicKey).toBe('GENERATED_PUBLIC_KEY')
  })

  it('rejects a purchase when gem balance is insufficient, releasing the reservation so a retry can succeed', async () => {
    gemBalance = 0
    const { POST } = await import('./route')
    const { mintItemNFT } = await import('@stellar-learn/stellar')

    const res = await POST(post({ itemId: KNOWN_ITEM_ID }))
    expect(res.status).toBe(402)
    expect(mintItemNFT).not.toHaveBeenCalled()
    expect(ownerships).toEqual([]) // reservation released, not left dangling
  })

  it('rejects a purchase for an already-owned (complete) item without minting again', async () => {
    ownerships.push({
      id: 'own_existing',
      userId: 'user_1',
      itemId: KNOWN_ITEM_ID,
      status: 'complete',
      createdAt: new Date(),
      completedAt: new Date(),
      stellarAssetId: 'X:Y',
      stellarTxHash: 'old-hash',
    })
    const { POST } = await import('./route')
    const { mintItemNFT } = await import('@stellar-learn/stellar')

    const res = await POST(post({ itemId: KNOWN_ITEM_ID }))
    expect(res.status).toBe(409)
    expect(mintItemNFT).not.toHaveBeenCalled()
  })

  it('leaves the user uncharged and releases the reservation when the mint fails', async () => {
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
    expect(ownerships).toEqual([]) // reservation released
  })

  it('rejects a second request for the same item while a fresh reservation is pending, without a second mint', async () => {
    ownerships.push({
      id: 'own_pending',
      userId: 'user_1',
      itemId: KNOWN_ITEM_ID,
      status: 'pending',
      createdAt: new Date(), // fresh — well within the staleness window
      completedAt: null,
      stellarAssetId: null,
      stellarTxHash: null,
    })
    const { POST } = await import('./route')
    const { mintItemNFT } = await import('@stellar-learn/stellar')

    const res = await POST(post({ itemId: KNOWN_ITEM_ID }))
    expect(res.status).toBe(409)
    expect(mintItemNFT).not.toHaveBeenCalled()
    expect(ownerships).toHaveLength(1) // still just the one pending row
  })

  it('reclaims a stale pending reservation (an abandoned earlier attempt) and completes the purchase', async () => {
    ownerships.push({
      id: 'own_stale',
      userId: 'user_1',
      itemId: KNOWN_ITEM_ID,
      status: 'pending',
      createdAt: new Date(Date.now() - 5 * 60_000), // 5 minutes old — well past the staleness window
      completedAt: null,
      stellarAssetId: null,
      stellarTxHash: null,
    })
    const { POST } = await import('./route')

    const res = await POST(post({ itemId: KNOWN_ITEM_ID }))
    expect(res.status).toBe(200)
    expect(ownerships).toHaveLength(1)
    expect(ownerships[0]).toMatchObject({ id: 'own_stale', status: 'complete' })
  })

  it('two truly concurrent purchases for the same item: exactly one succeeds, exactly one mint happens, no free item', async () => {
    const { POST } = await import('./route')
    const { mintItemNFT } = await import('@stellar-learn/stellar')

    const [a, b] = await Promise.all([
      POST(post({ itemId: KNOWN_ITEM_ID })),
      POST(post({ itemId: KNOWN_ITEM_ID })),
    ])
    const statuses = [a.status, b.status].sort()

    expect(statuses).toEqual([200, 409])
    expect(mintItemNFT).toHaveBeenCalledTimes(1)
    expect(ownerships).toHaveLength(1)
    expect(ownerships[0]?.status).toBe('complete')

    const winner = a.status === 200 ? a : b
    const winnerBody = await winner.json()
    expect(gemBalance).toBe(10000 - winnerBody.item.priceGems) // charged exactly once
  })
})
