import { Redis } from '@upstash/redis'

/** Upstash sorted set holding every player's XP, highest first. */
export const LEADERBOARD_KEY = 'leaderboard:global'

/** True only when real Upstash REST credentials are present. */
export function redisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

/**
 * Push a player's running XP total into the global leaderboard ZSET.
 *
 * No-ops (and never throws) when Upstash isn't configured or the call fails —
 * the leaderboard is a regenerable projection of the XP stored in Postgres, so
 * a Redis hiccup must never break saving a player's progress.
 */
export async function updateLeaderboard(
  userId: string,
  username: string,
  totalXP: number
): Promise<void> {
  if (!redisConfigured()) return
  try {
    const redis = Redis.fromEnv()
    await redis.zadd(LEADERBOARD_KEY, { score: totalXP, member: `${userId}:${username}` })
  } catch (err) {
    console.error('[leaderboard] update failed:', err)
  }
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/**
 * Parse the `limit` query param into a whole number in 1..100.
 *
 * A non-numeric value would reach zrange as NaN, and a zero or negative one
 * would make the stop index negative, which Redis reads as an offset from the
 * end of the set — both return the wrong rows.
 */
export function clampLimit(raw: string | null): number {
  // `?limit=` yields an empty string, which Number() reads as 0 — treat it as
  // absent rather than as a request for zero rows.
  if (raw === null || raw.trim() === '') return DEFAULT_LIMIT
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_LIMIT)
}
