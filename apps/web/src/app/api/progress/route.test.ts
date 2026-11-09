import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'

const CLERK_ID = 'clerk_progress_test_user'
const KNOWN_QUEST_ID = 'world-1-origin-plains-level-1-q1-what-is-a-blockchain'

let dbUser: {
  id: string
  clerkId: string
  username: string
  currentXP: number
  gemBalance: number
  level: number
} | null

let dbProgress: Array<{
  id: string
  userId: string
  questId: string
  status: string
  score: number | null
  xpEarned: number
  completedAt: Date
  attempts: number
}>

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => ({ userId: CLERK_ID }),
  currentUser: async () => ({
    emailAddresses: [{ emailAddress: 'player@example.com' }],
    username: 'progress_tester',
    imageUrl: null,
  }),
}))

vi.mock('@/lib/auth', () => ({ clerkEnabled: true }))

const updateLeaderboardMock = vi.fn()
vi.mock('@/lib/leaderboard', () => ({
  updateLeaderboard: (...args: unknown[]) => updateLeaderboardMock(...args),
}))

vi.mock('@stellar-learn/database', () => ({
  prisma: {
    user: {
      findUnique: async ({ where }: { where: { clerkId?: string; id?: string } }) => {
        if (!dbUser) return null
        if (where.clerkId && where.clerkId === dbUser.clerkId)
          return { ...dbUser, progress: dbProgress }
        if (where.id && where.id === dbUser.id) return { ...dbUser, progress: dbProgress }
        return null
      },
      upsert: async () => {
        if (!dbUser) {
          dbUser = {
            id: 'db-user-1',
            clerkId: CLERK_ID,
            username: 'progress_tester',
            currentXP: 0,
            gemBalance: 0,
            level: 1,
          }
        }
        return { ...dbUser }
      },
      update: async ({
        data,
      }: {
        data: { currentXP?: { increment: number }; lastActiveAt?: Date }
      }) => {
        if (!dbUser) throw new Error('user not found')
        if (data.currentXP?.increment) {
          dbUser.currentXP += data.currentXP.increment
        }
        return { ...dbUser }
      },
    },
    progress: {
      findUnique: async ({
        where,
      }: {
        where: { userId_questId: { userId: string; questId: string } }
      }) => {
        return (
          dbProgress.find(
            (p) =>
              p.userId === where.userId_questId.userId && p.questId === where.userId_questId.questId
          ) ?? null
        )
      },
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { userId_questId: { userId: string; questId: string } }
        create: {
          userId: string
          questId: string
          status: string
          xpEarned: number
          score: number | null
        }
        update: {
          status: string
          xpEarned: number
          score: number | null
        }
      }) => {
        const existing = dbProgress.find(
          (p) =>
            p.userId === where.userId_questId.userId && p.questId === where.userId_questId.questId
        )
        if (existing) {
          existing.status = update.status
          existing.xpEarned = update.xpEarned
          existing.score = update.score
          existing.attempts += 1
          return existing
        }
        const created = {
          id: `prog-${Date.now()}`,
          userId: create.userId,
          questId: create.questId,
          status: create.status,
          xpEarned: create.xpEarned,
          score: create.score,
          completedAt: new Date(),
          attempts: 1,
        }
        dbProgress.push(created)
        return created
      },
    },
  },
}))

describe('api/progress', () => {
  beforeEach(() => {
    dbUser = {
      id: 'db-user-1',
      clerkId: CLERK_ID,
      username: 'progress_tester',
      currentXP: 100,
      gemBalance: 20,
      level: 1,
    }
    dbProgress = []
    updateLeaderboardMock.mockClear()
  })

  describe('GET', () => {
    it('returns progress list, xp, gems, and level for user', async () => {
      const req = new Request('http://localhost/api/progress')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.xp).toBe(100)
      expect(data.gems).toBe(20)
      expect(data.level).toBe(1)
      expect(Array.isArray(data.progress)).toBe(true)
    })

    it('returns empty progress when user row does not exist yet', async () => {
      dbUser = null
      const req = new Request('http://localhost/api/progress')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.progress).toEqual([])
      expect(data.xp).toBe(0)
      expect(data.gems).toBe(0)
    })
  })

  describe('POST', () => {
    it('rejects invalid or missing questId with 400', async () => {
      const req = new Request('http://localhost/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId: '' }),
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('rejects out-of-range scores with 400', async () => {
      const req = new Request('http://localhost/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId: KNOWN_QUEST_ID, score: 120 }),
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('rejects unknown questId with 404', async () => {
      const req = new Request('http://localhost/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId: 'non-existent-quest-id' }),
      })
      const res = await POST(req)
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Unknown questId')
    })

    it('records progress and awards curriculum-defined XP', async () => {
      const req = new Request('http://localhost/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId: KNOWN_QUEST_ID, score: 90 }),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.awarded).toBeGreaterThan(0)
      expect(dbProgress.length).toBe(1)
      expect(dbProgress[0]?.questId).toBe(KNOWN_QUEST_ID)
      expect(updateLeaderboardMock).toHaveBeenCalled()
    })

    it('does not re-award XP for replaying already completed quests', async () => {
      dbProgress.push({
        id: 'prog-existing',
        userId: 'db-user-1',
        questId: KNOWN_QUEST_ID,
        status: 'COMPLETED',
        score: 80,
        xpEarned: 50,
        completedAt: new Date(),
        attempts: 1,
      })

      const req = new Request('http://localhost/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId: KNOWN_QUEST_ID, score: 100 }),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.awarded).toBe(0)
    })
  })
})
