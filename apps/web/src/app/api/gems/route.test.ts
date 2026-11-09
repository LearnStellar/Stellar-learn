import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'

const CLERK_ID = 'clerk_gems_test_user'

let dbUser: {
  id: string
  clerkId: string
  username: string
  gemBalance: number
} | null

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => ({ userId: CLERK_ID }),
  currentUser: async () => ({
    emailAddresses: [{ emailAddress: 'gems_player@example.com' }],
    username: 'gems_tester',
    imageUrl: null,
  }),
}))

vi.mock('@/lib/auth', () => ({ clerkEnabled: true }))

const mockListGemTransactions = vi.fn().mockResolvedValue([])
const mockEarnGems = vi.fn()
const mockSpendGems = vi.fn()

vi.mock('@/lib/gems', async () => {
  const actual = await vi.importActual<typeof import('@/lib/gems')>('@/lib/gems')
  return {
    ...actual,
    listGemTransactions: (...args: unknown[]) => mockListGemTransactions(...args),
    earnGems: (...args: unknown[]) => mockEarnGems(...args),
    spendGems: (...args: unknown[]) => mockSpendGems(...args),
  }
})

vi.mock('@stellar-learn/database', async () => {
  const actual =
    await vi.importActual<typeof import('@stellar-learn/database')>('@stellar-learn/database')
  return {
    ...actual,
    prisma: {
      user: {
        findUnique: async ({ where }: { where: { clerkId?: string; id?: string } }) => {
          if (!dbUser) return null
          if (where.clerkId && where.clerkId === dbUser.clerkId) return { ...dbUser }
          if (where.id && where.id === dbUser.id) return { ...dbUser }
          return null
        },
        upsert: async () => {
          if (!dbUser) {
            dbUser = {
              id: 'db-user-gems-1',
              clerkId: CLERK_ID,
              username: 'gems_tester',
              gemBalance: 50,
            }
          }
          return { ...dbUser }
        },
      },
    },
  }
})

describe('api/gems', () => {
  beforeEach(() => {
    dbUser = {
      id: 'db-user-gems-1',
      clerkId: CLERK_ID,
      username: 'gems_tester',
      gemBalance: 100,
    }
    mockListGemTransactions.mockClear()
    mockEarnGems.mockReset()
    mockSpendGems.mockReset()
  })

  describe('GET', () => {
    it('returns balance and transaction history for authenticated user', async () => {
      mockListGemTransactions.mockResolvedValueOnce([
        { id: 'tx-1', amount: 10, source: 'DAILY_CHECK_IN', resultingBalance: 10 },
      ])

      const req = new Request('http://localhost/api/gems')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.balance).toBe(100)
      expect(data.transactions).toHaveLength(1)
    })

    it('returns 0 balance if user has no database record', async () => {
      dbUser = null
      const req = new Request('http://localhost/api/gems')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.balance).toBe(0)
      expect(data.transactions).toEqual([])
    })
  })

  describe('POST', () => {
    it('processes DAILY_CHECK_IN earn action', async () => {
      mockEarnGems.mockResolvedValueOnce({
        balance: 110,
        idempotent: false,
        transaction: { id: 'tx-earn', amount: 10 },
      })

      const req = new Request('http://localhost/api/gems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'earn', source: 'DAILY_CHECK_IN' }),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.balance).toBe(110)
      expect(mockEarnGems).toHaveBeenCalled()
    })

    it('processes MARKETPLACE_PURCHASE spend action', async () => {
      mockSpendGems.mockResolvedValueOnce({
        balance: 60,
        idempotent: false,
        transaction: { id: 'tx-spend', amount: -40 },
      })

      const req = new Request('http://localhost/api/gems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'spend',
          source: 'MARKETPLACE_PURCHASE',
          amount: 40,
          idempotencyKey: 'idemp-123',
        }),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.balance).toBe(60)
      expect(mockSpendGems).toHaveBeenCalled()
    })

    it('rejects invalid or unauthorized action schemas', async () => {
      const req = new Request('http://localhost/api/gems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unknown' }),
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })
  })
})
