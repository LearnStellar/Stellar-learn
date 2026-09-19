import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * End-to-end API test for the daily check-in (issue #76). Every genuinely
 * external dependency is mocked — Clerk auth, the gem economy sink, and the
 * Prisma client (with an in-memory CheckIn ledger + a faithful P2002 on the
 * @@unique([userId, dayKey]) insert). The route module itself — validation,
 * the timezone-aware streak math (via lib/checkin), the idempotent
 * double-claim guards, and the 10-day badge grant — runs for real, so this is
 * the automated stand-in for the "prove the day-boundary logic" Loom the issue
 * asks for.
 */

const h = vi.hoisted(() => ({
  balance: 0,
  forceCreateP2002: false,
  authUserId: 'clerk_test_user',
  authEnabled: true,
  checkIns: [] as Array<{
    id: string
    userId: string
    dayKey: string
    streak: number
    gemsAwarded: number
    badgeAwarded: boolean
  }>,
  dbUser: { id: 'user_1', clerkId: 'clerk_test_user', characterId: 'warrior' },
  PrismaClientKnownRequestError: class extends Error {
    code: string
    constructor(message: string, code: string) {
      super(message)
      this.name = 'PrismaClientKnownRequestError'
      this.code = code
    }
  },
}))

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => ({ userId: h.authUserId }),
  currentUser: async () => ({
    emailAddresses: [{ emailAddress: 'tester@example.com' }],
    username: 'tester',
    imageUrl: null,
  }),
}))

// Expose clerkEnabled as a getter so tests can toggle auth on/off at runtime.
vi.mock('@/lib/auth', () => ({
  get clerkEnabled() {
    return h.authEnabled
  },
}))

// In-memory gem sink: earnGems credits the shared balance. The route's primary
// double-claim guard is the CheckIn unique constraint (exercised below), so a
// naive increment is enough here.
vi.mock('@/lib/gems', () => ({
  earnGems: async ({ userId, amount }: { userId: string; amount: number }) => {
    h.balance += amount
    return {
      balance: h.balance,
      transaction: { id: 't', userId, amount, resultingBalance: h.balance, source: 'DAILY_CHECK_IN', metadata: null, idempotencyKey: null, createdAt: new Date() },
      idempotent: false,
    }
  },
  getGemBalance: async () => h.balance,
}))

vi.mock('@stellar-learn/database', () => {
  const Prisma = { PrismaClientKnownRequestError: h.PrismaClientKnownRequestError }
  const GemSource = { DAILY_CHECK_IN: 'DAILY_CHECK_IN' }
  const prisma = {
    user: {
      findUnique: async ({ where }: { where: { clerkId: string } }) =>
        where.clerkId === h.dbUser.clerkId ? h.dbUser : null,
      upsert: async () => h.dbUser,
    },
    checkIn: {
      findFirst: async ({ where, orderBy, select }: any) => {
        let rows = h.checkIns.filter((c) => c.userId === h.dbUser.id)
        if (where?.badgeAwarded === true) rows = rows.filter((c) => c.badgeAwarded)
        if (orderBy?.dayKey === 'desc') rows = [...rows].sort((a, b) => b.dayKey.localeCompare(a.dayKey))
        const r = rows[0]
        return r ? (select ? { dayKey: r.dayKey, streak: r.streak, badgeAwarded: r.badgeAwarded, id: r.id } : r) : null
      },
      findMany: async ({ where, orderBy, take, select }: any) => {
        let rows = h.checkIns.filter((c) => c.userId === h.dbUser.id)
        if (orderBy?.dayKey === 'desc') rows = [...rows].sort((a, b) => b.dayKey.localeCompare(a.dayKey))
        rows = rows.slice(0, take ?? rows.length)
        return rows.map((r: any) => (select ? { dayKey: r.dayKey, streak: r.streak, gemsAwarded: r.gemsAwarded, badgeAwarded: r.badgeAwarded } : r))
      },
      findUnique: async ({ where: { userId_dayKey } }: any) => {
        const r = h.checkIns.find((c) => c.userId === userId_dayKey.userId && c.dayKey === userId_dayKey.dayKey)
        return r ?? null
      },
      create: async ({ data }: any) => {
        // Faithful @@unique([userId, dayKey]) collision => Prisma P2002.
        if (h.forceCreateP2002 || h.checkIns.some((c) => c.userId === data.userId && c.dayKey === data.dayKey)) {
          throw new h.PrismaClientKnownRequestError('Unique constraint failed', 'P2002')
        }
        const row = { id: `c${h.checkIns.length}`, createdAt: new Date(), ...data }
        h.checkIns.push(row)
        return row
      },
    },
  }
  return { prisma, GemSource, Prisma }
})

function post(body: unknown) {
  return new Request('http://localhost/api/checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
function get() {
  return new Request('http://localhost/api/checkin')
}

describe('api/checkin (issue #76)', () => {
  beforeEach(() => {
    h.balance = 0
    h.checkIns.length = 0
    h.forceCreateP2002 = false
    h.authUserId = 'clerk_test_user'
    h.authEnabled = true
  })

  it('first check-in starts a streak of 1 and awards 10 gems', async () => {
    const { POST } = await import('./route')
    const res = await POST(post({ tzOffsetMinutes: 0 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ claimedToday: false, streak: 1, gemsAwarded: 10, badgeAwarded: false, balance: 10 })
    expect(h.balance).toBe(10)
  })

  it('claiming twice in one local day is rejected and credits no extra gems', async () => {
    const { POST } = await import('./route')
    const first = await POST(post({ tzOffsetMinutes: 0 }))
    expect((await first.json()).balance).toBe(10)

    const second = await POST(post({ tzOffsetMinutes: 0 }))
    expect(second.status).toBe(200)
    const body = await second.json()
    expect(body).toMatchObject({ claimedToday: true, streak: 1, gemsAwarded: 0, balance: 10 })
    // Exactly one CheckIn row written for the day.
    expect(h.checkIns).toHaveLength(1)
  })

  it('the streak increments across consecutive days and scales the gem reward', async () => {
    const { localDayKey, previousDayKey } = await import('@/lib/checkin')
    const yesterday = previousDayKey(localDayKey(new Date(), 0))
    h.checkIns.push({ id: 'seed', userId: h.dbUser.id, dayKey: yesterday, streak: 1, gemsAwarded: 10, badgeAwarded: false })

    const { POST } = await import('./route')
    const body = await (await POST(post({ tzOffsetMinutes: 0 }))).json()
    expect(body.streak).toBe(2)
    expect(body.gemsAwarded).toBe(11) // base 10 + 1 for day 2
    expect(h.balance).toBe(11)
  })

  it('a missed day resets the streak to 1', async () => {
    h.checkIns.push({ id: 'seed', userId: h.dbUser.id, dayKey: '2000-01-01', streak: 5, gemsAwarded: 14, badgeAwarded: false })
    const { POST } = await import('./route')
    const body = await (await POST(post({ tzOffsetMinutes: 0 }))).json()
    expect(body.streak).toBe(1)
  })

  it('reaching a 10-day streak grants the badge and persists it for GET', async () => {
    const { localDayKey, previousDayKey } = await import('@/lib/checkin')
    const yesterday = previousDayKey(localDayKey(new Date(), 0))
    h.checkIns.push({ id: 'seed', userId: h.dbUser.id, dayKey: yesterday, streak: 9, gemsAwarded: 18, badgeAwarded: false })

    const { POST, GET } = await import('./route')
    const postBody = await (await POST(post({ tzOffsetMinutes: 0 }))).json()
    expect(postBody.streak).toBe(10)
    expect(postBody.badgeAwarded).toBe(true)
    expect(postBody.badge?.slug).toBe('daily-streak-10')

    const getBody = await (await GET(get())).json()
    expect(getBody.badgeEarned).toBe(true)
    expect(getBody.badge?.slug).toBe('daily-streak-10')
  })

  it('survives a concurrent double-claim (P2002) as an idempotent success', async () => {
    const { localDayKey, previousDayKey } = await import('@/lib/checkin')
    const yesterday = previousDayKey(localDayKey(new Date(), 0))
    h.checkIns.push({ id: 'seed', userId: h.dbUser.id, dayKey: yesterday, streak: 3, gemsAwarded: 13, badgeAwarded: false })
    h.forceCreateP2002 = true // simulate the insert losing the race to another request

    const { POST } = await import('./route')
    const res = await POST(post({ tzOffsetMinutes: 0 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.claimedToday).toBe(true)
    expect(h.balance).toBe(13) // gems credited exactly once, despite the insert loss
  })

  it('rejects unauthenticated claims (no Clerk session)', async () => {
    h.authUserId = null
    const { POST } = await import('./route')
    const res = await POST(post({ tzOffsetMinutes: 0 }))
    expect(res.status).toBe(401)
  })

  it('fails closed when auth is not configured', async () => {
    h.authEnabled = false
    const { POST, GET } = await import('./route')
    expect((await POST(post({ tzOffsetMinutes: 0 }))).status).toBe(401)
    expect((await GET(get())).status).toBe(401)
  })
})
