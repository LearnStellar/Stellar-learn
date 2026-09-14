import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { loggerFromHeaders } from '@/lib/correlation'

const redis = Redis.fromEnv()

const LEADERBOARD_KEY = 'leaderboard:global'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/** Parse the `limit` query param into a whole number in 1..100. */
export function clampLimit(raw: string | null): number {
  // `?limit=` yields an empty string, which Number() reads as 0 — treat it as
  // absent rather than as a request for zero rows.
  if (raw === null || raw.trim() === '') return DEFAULT_LIMIT
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_LIMIT)
}

export async function GET(request: Request) {
  const log = loggerFromHeaders(request.headers)
  const { searchParams } = new URL(request.url)
  // A non-numeric limit parses to NaN and a zero or negative one turns the
  // zrange stop index negative, which Redis reads as an offset from the end
  // of the set. Clamp to 1..100 so a bad query string cannot change which
  // rows come back.
  const limit = clampLimit(searchParams.get('limit'))

  try {
    // Fetch top N from Redis sorted set (score = XP, higher = better)
    const entries = await redis.zrange(LEADERBOARD_KEY, 0, limit - 1, {
      rev: true,
      withScores: true,
    })

    log.info('leaderboard fetched', { limit, count: entries.length })
    return NextResponse.json({ leaderboard: entries })
  } catch (error) {
    log.error('leaderboard fetch failed', error)
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const log = loggerFromHeaders(request.headers)

  try {
    const body = (await request.json()) as { userId: string; username: string; xp: number }
    const { userId, username, xp } = body

    await redis.zadd(LEADERBOARD_KEY, { score: xp, member: `${userId}:${username}` })

    log.info('leaderboard updated', { userId, xp })
    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('leaderboard update failed', error)
    return NextResponse.json({ error: 'Failed to update leaderboard' }, { status: 500 })
  }
}
