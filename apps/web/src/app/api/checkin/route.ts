import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { GemSource, Prisma, prisma } from '@stellar-learn/database'
import { clerkEnabled } from '@/lib/auth'
import { loggerFromHeaders } from '@/lib/correlation'
import { earnGems, getGemBalance } from '@/lib/gems'
import {
  CHECKIN_STREAK_BADGE,
  checkinIdempotencyKey,
  computeClaim,
  isClaimedToday,
  type CheckInState,
} from '@/lib/checkin'
import { pickRandomCharacter } from '@/lib/characters'

/**
 * Daily check-in API (issue #76).
 *
 * POST -> claim today's check-in. The route is server-authoritative: the
 * client may send only its timezone OFFSET (never a chosen day, streak, or
 * gem count). The streak math, gem curve, and 10-day badge contract all live
 * in apps/web/src/lib/checkin.ts and are unit-tested there. This handler only
 * resolves the authenticated user, reads/writes the CheckIn ledger, and
 * credits gems through the shared economy (apps/web/src/lib/gems.ts).
 *
 * Idempotency / double-claim safety (two independent guards):
 *   1. computeClaim() answers a same-local-day re-submit with claimedToday:true
 *      and credits no gems.
 *   2. The CheckIn row carries @@unique([userId, dayKey]) at the DB level, so a
 *      concurrent double-claim collides on insert (P2002) and is answered
 *      idempotently too.
 *   3. The gem earn is additionally keyed by checkinIdempotencyKey(user,
 *      localDay) so even a retried request can never credit the same day twice.
 *
 * GET -> current state for the check-in UI (streak, claimedToday, badge,
 * balance, and recent rows for the calendar strip).
 */

// Clamp the client timezone offset to a sane range so a garbage payload can
// never shift the "day" by more than the real-world ±14h. Anything out of
// range falls back to UTC (offset 0).
const MAX_TZ_OFFSET_MINUTES = 14 * 60

function parseTzOffsetMinutes(body: unknown): number {
  const raw = (body as { tzOffsetMinutes?: unknown } | null)?.tzOffsetMinutes
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0
  const rounded = Math.round(raw)
  if (rounded < -MAX_TZ_OFFSET_MINUTES || rounded > MAX_TZ_OFFSET_MINUTES) return 0
  return rounded
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

/** Reconstruct the player's persisted check-in state needed by computeClaim(). */
async function loadCheckInState(userId: string): Promise<CheckInState> {
  const latest = await prisma.checkIn.findFirst({
    where: { userId },
    orderBy: { dayKey: 'desc' },
    select: { dayKey: true, streak: true },
  })
  // The badge is "earned" for life once any claim set badgeAwarded; we don't
  // track it on the User row, so derive it from the ledger.
  const badgeRow = await prisma.checkIn.findFirst({
    where: { userId, badgeAwarded: true },
    select: { id: true },
  })

  return {
    latestDayKey: latest?.dayKey ?? null,
    latestStreak: latest?.streak ?? 0,
    badgeEarned: Boolean(badgeRow),
  }
}

function publicState(state: CheckInState, balance: number, recent: { dayKey: string; streak: number; gemsAwarded: number; badgeAwarded: boolean }[]) {
  return {
    streak: state.latestStreak,
    claimedToday: isClaimedToday(state.latestDayKey, new Date(), 0),
    badgeEarned: state.badgeEarned,
    balance,
    badge: state.badgeEarned ? CHECKIN_STREAK_BADGE : null,
    checkIns: recent,
  }
}

export async function GET(request: Request) {
  const log = loggerFromHeaders(request.headers)
  // No-auth guard: without Clerk there is no session, so fail closed.
  if (!clerkEnabled) return NextResponse.json({ error: 'Auth not configured' }, { status: 401 })

  const { userId: clerkId } = auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } })
    if (!user) {
      return NextResponse.json({ streak: 0, claimedToday: false, badgeEarned: false, balance: 0, badge: null, checkIns: [] })
    }

    const state = await loadCheckInState(user.id)
    const balance = await getGemBalance(user.id)
    const recent = await prisma.checkIn.findMany({
      where: { userId: user.id },
      orderBy: { dayKey: 'desc' },
      take: 14,
      select: { dayKey: true, streak: true, gemsAwarded: true, badgeAwarded: true },
    })

    return NextResponse.json(publicState(state, balance, recent))
  } catch (error) {
    log.error('check-in state load failed', { clerkId }, error)
    return NextResponse.json({ error: 'Failed to load check-in state' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const log = loggerFromHeaders(request.headers)
  if (!clerkEnabled) return NextResponse.json({ error: 'Auth not configured' }, { status: 401 })

  const { userId: clerkId } = auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    // An empty/malformed body is fine — timezone offset is optional.
  }

  const tzOffsetMinutes = parseTzOffsetMinutes(body)
  const now = new Date()

  try {
    const user = await resolveUser(clerkId)
    const state = await loadCheckInState(user.id)
    const claim = computeClaim(state, now, tzOffsetMinutes)

    // Guard 1: same local day already claimed. Answer idempotently, no gem credit.
    if (claim.claimedToday) {
      const balance = await getGemBalance(user.id)
      return NextResponse.json({
        claimedToday: true,
        streak: claim.streak,
        gemsAwarded: 0,
        badgeAwarded: false,
        balance,
        dayKey: claim.dayKey,
      })
    }

    // Credit gems FIRST (idempotent on the local-day key). If the CheckIn row
    // insert below collides, the loser's earnGems call is a no-op (same key),
    // so gems are never awarded twice and we never leave a claimed day with no
    // reward. earnGems() also re-checks the ledger under the user row lock.
    const idempotencyKey = checkinIdempotencyKey(user.id, claim.dayKey)
    const earned = await earnGems({
      userId: user.id,
      amount: claim.gemsAwarded,
      source: GemSource.DAILY_CHECK_IN,
      idempotencyKey,
    })

    let checkIn
    try {
      checkIn = await prisma.checkIn.create({
        data: {
          userId: user.id,
          dayKey: claim.dayKey,
          streak: claim.streak,
          gemsAwarded: claim.gemsAwarded,
          badgeAwarded: claim.badgeAwardedNow,
        },
      })
    } catch (error) {
      // Guard 2: a concurrent claim for the same local day lost the insert race.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await prisma.checkIn.findUnique({
          where: { userId_dayKey: { userId: user.id, dayKey: claim.dayKey } },
        })
        return NextResponse.json({
          claimedToday: true,
          streak: existing?.streak ?? claim.streak,
          gemsAwarded: 0,
          badgeAwarded: false,
          balance: earned.balance,
          dayKey: claim.dayKey,
        })
      }
      throw error
    }

    log.info('check-in claimed', {
      clerkId,
      dayKey: claim.dayKey,
      streak: claim.streak,
      gems: claim.gemsAwarded,
      badge: claim.badgeAwardedNow,
    })

    return NextResponse.json({
      claimedToday: false,
      streak: claim.streak,
      gemsAwarded: claim.gemsAwarded,
      badgeAwarded: claim.badgeAwardedNow,
      badge: claim.badgeAwardedNow ? CHECKIN_STREAK_BADGE : null,
      balance: earned.balance,
      dayKey: claim.dayKey,
    })
  } catch (error) {
    log.error('check-in claim failed', { clerkId }, error)
    return NextResponse.json({ error: 'Failed to record check-in' }, { status: 500 })
  }
}
