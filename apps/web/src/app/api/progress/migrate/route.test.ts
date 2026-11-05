import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const CLERK_ID = 'clerk_migrate_user'
const KNOWN_QUEST_ID = 'world-1-origin-plains-level-1-q1-what-is-a-blockchain'

let dbUser: { id: string; clerkId: string; username: string; currentXP: number }
let dbProgress: Array<{
  id: string
  userId: string
  questId: string
  status: string
  score?: number | null
  xpEarned: number
}>

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => ({ userId: CLERK_ID }),
  currentUser: async () => ({
    emailAddresses: [{ emailAddress: 'migrator@example.com' }],
    username: 'migrator_player',
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
      upsert: async () => ({ ...dbUser }),
      update: async ({
        data,
      }: {
        data: { currentXP?: { increment: number }; lastActiveAt?: Date }
      }) => {
        if (data.currentXP?.increment) {
          dbUser.currentXP += data.currentXP.increment
        }
        return { ...dbUser }
      },
    },
    progress: {
      findMany: async ({ where }: { where: { userId: string; questId: { in: string[] } } }) => {
        return dbProgress.filter(
          (p) => p.userId === where.userId && where.questId.in.includes(p.questId)
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
          score?: number | null
        }
        update: { status: string; xpEarned: number; score?: number | null }
      }) => {
        const idx = dbProgress.findIndex(
          (p) =>
            p.userId === where.userId_questId.userId && p.questId === where.userId_questId.questId
        )
        const current = dbProgress[idx]
        if (current) {
          dbProgress[idx] = {
            id: current.id,
            userId: current.userId,
            questId: current.questId,
            status: update.status,
            xpEarned: update.xpEarned,
            score: update.score,
          }
          return dbProgress[idx]
        }
        const created = {
          id: `prog-${Date.now()}-${Math.random()}`,
          userId: create.userId,
          questId: create.questId,
          status: create.status,
          xpEarned: create.xpEarned,
          score: create.score,
        }
        dbProgress.push(created)
        return created
      },
    },
  },
}))

describe('api/progress/migrate', () => {
  beforeEach(() => {
    dbUser = {
      id: 'db-user-migrate',
      clerkId: CLERK_ID,
      username: 'migrator_player',
      currentXP: 0,
    }
    dbProgress = []
    updateLeaderboardMock.mockClear()
  })

  it('rejects invalid JSON body with 400', async () => {
    const req = new Request('http://localhost/api/progress/migrate', {
      method: 'POST',
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Send a JSON body')
  })

  it('rejects payload when quests is not an array', async () => {
    const req = new Request('http://localhost/api/progress/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quests: 'not-an-array' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('quests must be an array')
  })

  it('rejects payload exceeding max quests limit', async () => {
    const manyQuests = Array.from({ length: 201 }, (_, i) => ({ questId: `quest-${i}` }))
    const req = new Request('http://localhost/api/progress/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quests: manyQuests }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('at most 200 entries')
  })

  it('migrates valid guest progress and credits curriculum-defined XP', async () => {
    const req = new Request('http://localhost/api/progress/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quests: [
          { questId: KNOWN_QUEST_ID, score: 95 },
          { questId: 'non-existent-quest-id' }, // ignored
        ],
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.migrated).toBe(1)
    expect(json.skipped).toBe(0)
    expect(json.xpAwarded).toBe(50) // Lesson reward is 50 XP
    expect(json.totalXP).toBe(50)
    expect(dbUser.currentXP).toBe(50)
    expect(updateLeaderboardMock).toHaveBeenCalledWith('db-user-migrate', 'migrator_player', 50)
  })

  it('is idempotent: skips quests already completed on the account', async () => {
    dbProgress.push({
      id: 'existing-prog-1',
      userId: dbUser.id,
      questId: KNOWN_QUEST_ID,
      status: 'COMPLETED',
      xpEarned: 50,
    })
    dbUser.currentXP = 50

    const req = new Request('http://localhost/api/progress/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quests: [{ questId: KNOWN_QUEST_ID, score: 100 }],
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.migrated).toBe(0)
    expect(json.skipped).toBe(1)
    expect(json.xpAwarded).toBe(0)
    expect(json.totalXP).toBe(50)
  })
})
