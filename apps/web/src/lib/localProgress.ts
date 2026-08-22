/**
 * Guest (unauthenticated) progress persistence — localStorage.
 *
 * When a player hasn't signed up yet, completed quests and XP are stored in
 * the browser so progress survives a refresh. On signup, the dashboard page
 * detects any remaining guest progress and migrates it to the server.
 *
 * Two localStorage keys are used:
 *   - `stellar-learn:guest-progress` — quest completions + XP
 *   - `stellar-learn:signup-nudge`   — nudge-dismiss / show-count state
 */

const PROGRESS_KEY = 'stellar-learn:guest-progress'
const NUDGE_KEY = 'stellar-learn:signup-nudge'

export interface GuestProgress {
  /** Completed quests, in completion order. */
  completedQuests: Array<{ questId: string; xpEarned: number }>
  /** Total XP accumulated as a guest. */
  totalXP: number
  /** True once progress has been migrated to the server after signup. */
  migrated: boolean
  /** ISO-8601 timestamp of the last write. */
  updatedAt: string
}

interface NudgeState {
  /** Number of times the nudge has been shown this session. */
  shownCount: number
  /** True if the user dismissed the nudge permanently. */
  permanentlyDismissed: boolean
  /** The quest id that triggered the first nudge */
  triggeredByQuestId: string | null
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function readProgress(): GuestProgress | null {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GuestProgress
  } catch {
    return null
  }
}

function writeProgress(p: GuestProgress): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function readNudge(): NudgeState | null {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(NUDGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as NudgeState
  } catch {
    return null
  }
}

function writeNudge(n: NudgeState): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(NUDGE_KEY, JSON.stringify(n))
  } catch {
    // silently ignore
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Load full guest progress object (null if none). */
export function loadGuestProgress(): GuestProgress | null {
  return readProgress()
}

/** Get the set of quest ids completed as a guest. */
export function getCompletedQuestIds(): string[] {
  const p = readProgress()
  return p ? p.completedQuests.map((q) => q.questId) : []
}

/** Get total XP earned as a guest. */
export function getGuestXP(): number {
  const p = readProgress()
  return p?.totalXP ?? 0
}

/** Whether any guest progress exists. */
export function hasGuestProgress(): boolean {
  const p = readProgress()
  return p !== null && p.completedQuests.length > 0 && !p.migrated
}

/**
 * Record a completed quest in local storage.
 * Returns the updated progress object.
 */
export function recordQuestComplete(questId: string, xpEarned: number): GuestProgress {
  const p = readProgress() ?? {
    completedQuests: [],
    totalXP: 0,
    migrated: false,
    updatedAt: new Date().toISOString(),
  }

  // Avoid double-counting the same quest
  if (!p.completedQuests.some((q) => q.questId === questId)) {
    p.completedQuests.push({ questId, xpEarned })
    p.totalXP += xpEarned
  }
  p.updatedAt = new Date().toISOString()
  writeProgress(p)
  return p
}

/** Mark guest progress as migrated (after signup — won't be shown again). */
export function markMigrated(): void {
  const p = readProgress()
  if (p) {
    p.migrated = true
    p.updatedAt = new Date().toISOString()
    writeProgress(p)
  }
}

/** Clear all guest progress (after successful migration, or user choice). */
export function clearGuestProgress(): void {
  if (!isBrowser()) return
  try {
    localStorage.removeItem(PROGRESS_KEY)
  } catch {
    // silently ignore
  }
}

// ── Signup Nudge state ──────────────────────────────────────────────────────

/**
 * Decide whether to show the signup nudge.
 *
 * Rules:
 *   - Never shown if the player has already dismissed it permanently.
 *   - Shown at most 3 times per localStorage lifetime.
 *   - Only shown when the player has completed at least one quest in the
 *     current session (not on page load).
 *
 * @param questsCompletedInSession — how many quests the player completed this
 *        session (used to trigger the nudge after the first completion).
 */
export function shouldShowSignupNudge(
  questsCompletedInSession: number,
): boolean {
  if (questsCompletedInSession < 1) return false

  const n = readNudge()
  if (n?.permanentlyDismissed) return false
  if ((n?.shownCount ?? 0) >= 3) return false

  return true
}

/**
 * Track that the nudge was shown. Call this after the nudge component mounts.
 * Returns the updated show-count.
 */
export function trackNudgeShown(questId: string): number {
  const n = readNudge() ?? {
    shownCount: 0,
    permanentlyDismissed: false,
    triggeredByQuestId: null,
  }
  n.shownCount += 1
  if (!n.triggeredByQuestId) n.triggeredByQuestId = questId
  writeNudge(n)
  return n.shownCount
}

/** Dismiss the signup nudge permanently (user clicked "Don't show again"). */
export function dismissSignupNudgePermanently(): void {
  writeNudge({
    shownCount: 3, // maxed out — won't show again
    permanentlyDismissed: true,
    triggeredByQuestId: null,
  })
}

/** Dismiss the signup nudge for this time (user clicked close). */
export function dismissSignupNudgeOnce(): void {
  const n = readNudge() ?? {
    shownCount: 0,
    permanentlyDismissed: false,
    triggeredByQuestId: null,
  }
  n.shownCount += 1 // bump so it doesn't reappear immediately
  writeNudge(n)
}

/** Reset nudge state (for testing / debugging). */
export function resetNudgeState(): void {
  if (!isBrowser()) return
  try {
    localStorage.removeItem(NUDGE_KEY)
  } catch {
    // silently ignore
  }
}