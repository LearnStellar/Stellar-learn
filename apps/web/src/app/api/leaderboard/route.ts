import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { loggerFromHeaders } from '@/lib/correlation'
import { LEADERBOARD_KEY, clampLimit, redisConfigured } from '@/lib/leaderboard'

export async function GET(request: Request) {
  const log = loggerFromHeaders(request.headers)
  const { searchParams } = new URL(request.url)
  // A non-numeric limit parses to NaN and a zero or negative one turns the
  // zrange stop index negative, which Redis reads as an offset from the end
  // of the set. Clamp to 1..100 so a bad query string cannot change which
  // rows come back.
  const limit = clampLimit(searchParams.get('limit'))

  // Upstash is optional. Without credentials the leaderboard is simply empty
  // rather than a 500 — Redis.fromEnv() throws when they are unset.
  if (!redisConfigured()) {
    return NextResponse.json({ leaderboard: [] })
  }

  try {
    const redis = Redis.fromEnv()
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

// There is deliberately no POST handler. Writes go through
// `updateLeaderboard` in `@/lib/leaderboard`, which api/progress calls after
// authenticating the player and reading the XP total back from Postgres. An
// HTTP write endpoint would let any caller set any score for any user, and
// the leaderboard is only a projection of the XP already stored in Postgres.
