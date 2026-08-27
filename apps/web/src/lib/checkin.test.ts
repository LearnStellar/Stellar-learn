import { describe, expect, it } from 'vitest'
import {
  CHECKIN_BASE_GEMS,
  CHECKIN_MAX_STREAK_BONUS,
  CHECKIN_STREAK_BADGE,
  computeClaim,
  gemsForStreak,
  isClaimedToday,
  localDayKey,
  previousDayKey,
} from './checkin'
import type { CheckInState, ClaimOutcome } from './checkin'

// Fixed "now" (UTC noon) so local-day math is deterministic; tzOffset is varied
// per test to prove timezone-awareness without depending on the runner's clock.
const NOW = new Date('2026-08-20T12:00:00Z')
const UTC = 0

function state(dayKey: string | null, streak = 0, badgeEarned = false): CheckInState {
  return { latestDayKey: dayKey, latestStreak: streak, badgeEarned }
}

describe('localDayKey (timezone-aware calendar day)', () => {
  it('returns the UTC day when the offset is 0', () => {
    expect(localDayKey(new Date('2026-08-20T23:59:00Z'), 0)).toBe('2026-08-20')
    expect(localDayKey(new Date('2026-08-21T00:01:00Z'), 0)).toBe('2026-08-21')
  })

  it('credits the LOCAL day, not UTC, for a zone behind UTC (Europe/London winter = UTC+0 is edge; use UTC-5)', () => {
    // UTC-5 (getTimezoneOffset returns +300): 2026-08-17 23:30 local == 2026-08-18 04:30 UTC.
    // The player's day is still Aug 17 even though UTC has rolled to Aug 18.
    expect(localDayKey(new Date('2026-08-18T04:30:00Z'), 300)).toBe('2026-08-17')
    // And once past local midnight (05:00 UTC == 00:00 local Aug 18) it flips.
    expect(localDayKey(new Date('2026-08-18T05:00:00Z'), 300)).toBe('2026-08-18')
  })

  it('handles a zone ahead of UTC (Asia/Kolkata = UTC+5:30, getTimezoneOffset = -330)', () => {
    // 2026-08-17 19:00 UTC == 2026-08-18 00:30 India local — India has already turned the page.
    expect(localDayKey(new Date('2026-08-17T19:00:00Z'), -330)).toBe('2026-08-18')
    // Earlier the same UTC day, India is still on the 17th.
    expect(localDayKey(new Date('2026-08-17T18:00:00Z'), -330)).toBe('2026-08-17')
  })
})

describe('previousDayKey (month/year rollover)', () => {
  it('decrements a normal day', () => {
    expect(previousDayKey('2026-08-20')).toBe('2026-08-19')
  })
  it('rolls back across a month boundary', () => {
    expect(previousDayKey('2026-03-01')).toBe('2026-02-28')
    expect(previousDayKey('2026-03-01')).not.toBe('2026-02-29') // 2026 is not a leap year
  })
  it('rolls back across a year boundary', () => {
    expect(previousDayKey('2026-01-01')).toBe('2025-12-31')
  })
})

describe('gemsForStreak (scales with streak, capped)', () => {
  it('day 1 = base gems', () => {
    expect(gemsForStreak(1)).toBe(CHECKIN_BASE_GEMS)
  })
  it('+1 per consecutive day up to the cap', () => {
    expect(gemsForStreak(2)).toBe(CHECKIN_BASE_GEMS + 1)
    expect(gemsForStreak(11)).toBe(CHECKIN_BASE_GEMS + CHECKIN_MAX_STREAK_BONUS)
  })
  it('caps at base + cap beyond the cap', () => {
    expect(gemsForStreak(12)).toBe(CHECKIN_BASE_GEMS + CHECKIN_MAX_STREAK_BONUS)
    expect(gemsForStreak(999)).toBe(CHECKIN_BASE_GEMS + CHECKIN_MAX_STREAK_BONUS)
  })
  it('clamps nonsensical (non-positive) input to day 1', () => {
    expect(gemsForStreak(0)).toBe(CHECKIN_BASE_GEMS)
    expect(gemsForStreak(-3)).toBe(CHECKIN_BASE_GEMS)
  })
})

describe('computeClaim (streak logic — the core acceptance criteria)', () => {
  it('first-ever check-in starts a streak of 1 and awards base gems', () => {
    const out = computeClaim(state(null), NOW, UTC)
    expect(out).toEqual<ClaimOutcome>({
      dayKey: '2026-08-20',
      claimedToday: false,
      streak: 1,
      gemsAwarded: CHECKIN_BASE_GEMS,
      badgeAwardedNow: false,
    })
  })

  it('a check-in on the previous local day extends the streak by one', () => {
    const out = computeClaim(state('2026-08-19', 1), NOW, UTC)
    expect(out.streak).toBe(2)
    expect(out.gemsAwarded).toBe(CHECKIN_BASE_GEMS + 1)
    expect(out.badgeAwardedNow).toBe(false)
  })

  it('the streak increments across consecutive days and resets to 1 after a gap', () => {
    // Day 2 -> 3 -> 4 consecutively, each day anchored to its predecessor.
    let prev = state(null)
    let out = computeClaim(prev, NOW, UTC) // Aug 20, streak 1

    prev = state('2026-08-20', out.streak)
    out = computeClaim(prev, new Date('2026-08-21T12:00:00Z'), UTC) // Aug 21, streak 2
    expect(out.streak).toBe(2)

    prev = state('2026-08-21', out.streak)
    out = computeClaim(prev, new Date('2026-08-22T12:00:00Z'), UTC) // Aug 22, streak 3
    expect(out.streak).toBe(3)

    // Gap: jump two local days (Aug 22 -> Aug 25) — streak must reset to 1.
    prev = state('2026-08-22', out.streak)
    out = computeClaim(prev, new Date('2026-08-25T12:00:00Z'), UTC)
    expect(out.streak).toBe(1)
    expect(out.gemsAwarded).toBe(CHECKIN_BASE_GEMS)
    expect(out.badgeAwardedNow).toBe(false)
  })

  it('the 10th consecutive day grants the badge and the streak-scaled gems', () => {
    // Streak 9 on Aug 19 -> claim Aug 20 -> streak 10 -> badge unlocked.
    const out = computeClaim(state('2026-08-19', 9), NOW, UTC)
    expect(out.streak).toBe(10)
    expect(out.gemsAwarded).toBe(CHECKIN_BASE_GEMS + CHECKIN_MAX_STREAK_BONUS - 1) // 10 + 9
    expect(out.badgeAwardedNow).toBe(true)
  })

  it('the badge is only granted ONCE: a re-reach after a reset does not re-grant it', () => {
    // Player previously earned the badge (badgeEarned true), missed a day, rebuilt
    // to 10 again — streak climbs but badgeAwardedNow stays false.
    const out = computeClaim(state('2026-08-19', 9, true), NOW, UTC)
    expect(out.streak).toBe(10)
    expect(out.badgeAwardedNow).toBe(false)
  })

  it('an 11th consecutive day keeps climbing without re-granting the badge', () => {
    const out = computeClaim(state('2026-08-19', 10, true), NOW, UTC)
    expect(out.streak).toBe(11)
    expect(out.gemsAwarded).toBe(CHECKIN_BASE_GEMS + CHECKIN_MAX_STREAK_BONUS) // 10 + 10, capped
    expect(out.badgeAwardedNow).toBe(false)
  })

  it('claiming twice in one day is rejected idempotently (no gems, no streak change)', () => {
    const prev = state('2026-08-20', 5, false)
    const out = computeClaim(prev, NOW, UTC)
    expect(out.claimedToday).toBe(true)
    expect(out.streak).toBe(5) // unchanged
    expect(out.gemsAwarded).toBe(0)
    expect(out.badgeAwardedNow).toBe(false)
  })

  it('the streak boundary is the player's LOCAL day, so a 23:30 local claim counts as today', () => {
    // 2026-08-20 23:30 local in UTC-5 (offset +300) == 2026-08-21 04:30 UTC.
    const utcInstant = new Date('2026-08-21T04:30:00Z')
    const offset5 = 300
    const todayLocal = localDayKey(utcInstant, offset5) // '2026-08-20'
    // Claim once to set the player's latest day to their local Aug 20.
    const first = computeClaim(state(null), utcInstant, offset5)
    expect(first.dayKey).toBe(todayLocal)
    expect(first.claimedToday).toBe(false)
    // A second claim a few wall-clock minutes later is the SAME local day -> rejected.
    const second = computeClaim(state(todayLocal, first.streak), new Date('2026-08-21T04:35:00Z'), offset5)
    expect(second.claimedToday).toBe(true)
  })
})

describe('isClaimedToday', () => {
  it('false when there is no prior check-in', () => {
    expect(isClaimedToday(null, NOW, UTC)).toBe(false)
  })
  it('true when the latest day equals the player current local day', () => {
    expect(isClaimedToday('2026-08-20', NOW, UTC)).toBe(true)
  })
  it('false when the latest day is not today', () => {
    expect(isClaimedToday('2026-08-19', NOW, UTC)).toBe(false)
  })
})

describe('CHECKIN_STREAK_BADGE contract', () => {
  it('points at the on-disk 64x64 badge asset and the 10-day threshold', () => {
    expect(CHECKIN_STREAK_BADGE.iconUrl).toBe('/assets/badges/badge-daily-streak-10.png')
    expect(CHECKIN_STREAK_BADGE.slug).toBe('daily-streak-10')
  })
})
