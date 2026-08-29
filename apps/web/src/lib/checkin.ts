/**
 * Daily check-in logic (issue #76). Everything here is pure and dependency-free
 * so it can be unit-tested without a database or auth — the streak math, the
 * timezone-aware "local day" computation, the gem-reward curve, and the
 * 10-day-streak badge contract all live here. The route handler
 * (apps/web/src/app/api/checkin/route.ts) is responsible only for resolving
 * the authenticated user, reading/writing the DB, and crediting gems through
 * the shared gem economy (apps/web/src/lib/gems.ts) — it never recomputes the
 * streak or mints a badge on its own.
 *
 * Server-authoritative by construction: the client may only send its timezone
 * OFFSET. It can never choose a day, a streak, or a gem count — all of those
 * are derived here from server-observed state and a server-resolved clock.
 */

/** Palette/iconUrl for the 10-day-streak badge. The PNG itself lives at this exact
 *  path under apps/web/public and is asserted on by checkin-assets.test.ts. */
export const CHECKIN_STREAK_BADGE = {
  slug: 'daily-streak-10',
  title: '10-Day Streak',
  description: 'Claimed a daily check-in for 10 consecutive days.',
  iconUrl: '/assets/badges/badge-daily-streak-10.png',
  /** Prisma enum-agnostic rarity label used by the UI layer. */
  rarity: 'rare',
} as const

/** A streak of this many consecutive days unlocks the badge. */
export const STREAK_BADGE_THRESHOLD = 10

/** Gems awarded on a streak-1 (first) check-in. Scales up with streak length. */
export const CHECKIN_BASE_GEMS = 10

/** Maximum bonus gems on top of the base, so the economy can't inflate on very
 *  long streaks. Day 1 = base, day (1 + cap) and beyond = base + cap. */
export const CHECKIN_MAX_STREAK_BONUS = 10

/** Gems a check-in credits, scaling (+1 per consecutive day, capped) with streak. */
export function gemsForStreak(streak: number): number {
  const s = streak < 1 ? 1 : streak
  return CHECKIN_BASE_GEMS + Math.min(s - 1, CHECKIN_MAX_STREAK_BONUS)
}

/** Idempotency key for a user's check-in on a given local day. Matches the
 *  `checkin:{userId}:{day}` convention documented on GemTransaction.idempotencyKey
 *  in the schema, with the LOCAL day (not UTC) so a retry or concurrent double
 *  submit can never double-credit gems. */
export function checkinIdempotencyKey(userId: string, dayKey: string): string {
  return `checkin:${userId}:${dayKey}`
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/** YYYY-MM-DD for the UTC wall-clock of `date`. */
export function formatUtcDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

/**
 * The player's LOCAL calendar day as a YYYY-MM-DD string.
 *
 * `tzOffsetMinutes` is the raw value of JavaScript's
 * `Date.prototype.getTimezoneOffset()` — i.e. the number of minutes you ADD to
 * local time to obtain UTC (300 for UTC-5 "America/New_York" in winter,
 * -330 for UTC+5:30 "Asia/Kolkata"). We shift the UTC instant by that offset so
 * the resulting instant's UTC wall-clock IS the user's local wall-clock; the
 * date we read off it is therefore the user's local calendar day, not UTC's.
 *
 * This is what makes the streak timezone-aware: a player who checks in at
 * 23:30 local (which may already be the next day in UTC) is credited with
 * their local day, so two claims straddling midnight UTC still count as the
 * same local day for them.
 */
export function localDayKey(at: Date, tzOffsetMinutes: number): string {
  const localWallClock = new Date(at.getTime() - tzOffsetMinutes * 60_000)
  return formatUtcDate(localWallClock)
}

/** The calendar day immediately before `dayKey` (YYYY-MM-DD). Handles month and
 *  year boundaries via Date.UTC's overflow normalization. */
export function previousDayKey(dayKey: string): string {
  const parts = dayKey.split('-')
  const year = parseInt(parts[0] ?? '', 10)
  const month = parseInt(parts[1] ?? '', 10)
  const day = parseInt(parts[2] ?? '', 10)
  // Date.UTC normalizes out-of-range days (date - 1 => previous day, rolling the
  // month/year automatically), which is exactly the month/year rollover we need.
  return formatUtcDate(new Date(Date.UTC(year, month - 1, day - 1)))
}

/** The player's persisted check-in state as read from the DB, folded into the
 *  shape the claim logic needs.
 */
export interface CheckInState {
  /** YYYY-MM-DD of the most recent check-in, in the player's local day, or null. */
  latestDayKey: string | null
  /** The streak recorded on that most recent check-in. */
  latestStreak: number
  /** Whether the 10-day-streak badge is already unlocked for this user. */
  badgeEarned: boolean
}

export interface ClaimOutcome {
  /** The local calendar day being claimed (already computed, for the route to use). */
  dayKey: string
  /** True when a check-in already exists for this local day — the claim is
   *  rejected (no gems, no streak change) but is NOT an error: it's an
   *  idempotent re-submit, answered from existing state. */
  claimedToday: boolean
  /** Streak length AFTER this claim (equals the prior streak if claimedToday). */
  streak: number
  /** Gems the route should credit for this claim (0 if claimedToday). */
  gemsAwarded: number
  /** True iff THIS claim is the one that crosses the 10-day threshold. */
  badgeAwardedNow: boolean
}

/**
 * Decide, purely, what a check-in claim resolves to given the player's existing
 * state and the current time. No DB access, no clock calls beyond `now` — this
 * is the single source of truth for streak math and is exhaustively tested.
 */
export function computeClaim(prev: CheckInState, now: Date, tzOffsetMinutes: number): ClaimOutcome {
  const todayKey = localDayKey(now, tzOffsetMinutes)

  // Same local day already has a check-in: reject the claim idempotently.
  if (prev.latestDayKey === todayKey) {
    return {
      dayKey: todayKey,
      claimedToday: true,
      streak: prev.latestStreak,
      gemsAwarded: 0,
      badgeAwardedNow: false,
    }
  }

  // A check-in on the previous local day extends the streak; anything older
  // (or the first-ever check-in) starts a fresh streak at 1.
  const yesterdayKey = previousDayKey(todayKey)
  const consecutive = prev.latestDayKey === yesterdayKey && prev.latestStreak > 0
  const streak = consecutive ? prev.latestStreak + 1 : 1

  const gemsAwarded = gemsForStreak(streak)
  const badgeAwardedNow = streak >= STREAK_BADGE_THRESHOLD && !prev.badgeEarned

  return { dayKey: todayKey, claimedToday: false, streak, gemsAwarded, badgeAwardedNow }
}

/** True iff a check-in already exists for the player's current local day. */
export function isClaimedToday(latestDayKey: string | null, now: Date, tzOffsetMinutes: number): boolean {
  if (!latestDayKey) return false
  return localDayKey(now, tzOffsetMinutes) === latestDayKey
}
