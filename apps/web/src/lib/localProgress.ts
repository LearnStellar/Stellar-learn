/**
 * Guest progress (issue #75).
 *
 * A visitor with no account still earns XP and completes quests. That progress
 * lives in this module, backed by localStorage, until they sign up — at which
 * point `/api/progress/migrate` replays it onto their server account and the
 * local copy is cleared.
 *
 * Everything here is pure except the two storage accessors, so the merge and
 * validation logic is unit-testable without a browser.
 *
 * XP is never stored. It is derived from the completed quest ids against the
 * curriculum, exactly as the server derives it, so a tampered localStorage can
 * only claim quests that exist — never an arbitrary XP total.
 */

import { getQuestById } from '@stellar-learn/content'

/** Bumped only if the stored shape changes incompatibly; a mismatch is discarded. */
export const GUEST_PROGRESS_VERSION = 1

export const GUEST_PROGRESS_KEY = 'stellar-learn:guest-progress'

export interface GuestQuestRecord {
  questId: string
  /** Quiz correctness 0-100, absent for quest types that are not scored. */
  score?: number
  /** Epoch ms, used to replay completions in the order they happened. */
  completedAt: number
}

export interface GuestProgress {
  version: number
  quests: GuestQuestRecord[]
}

export function emptyGuestProgress(): GuestProgress {
  return { version: GUEST_PROGRESS_VERSION, quests: [] }
}

/** True for a score the progress API would accept (absent, or 0-100). */
function isValidScore(score: unknown): score is number | undefined {
  if (score === undefined) return true
  return typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100
}

/**
 * Coerce untrusted storage content into a GuestProgress.
 *
 * localStorage is user-writable, so every field is checked: a wrong version,
 * a malformed record, or a questId absent from the curriculum is dropped
 * rather than trusted. Returns empty progress instead of throwing, so a
 * corrupt entry can never break the page.
 */
export function parseGuestProgress(raw: string | null): GuestProgress {
  if (!raw) return emptyGuestProgress()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return emptyGuestProgress()
  }

  const candidate = parsed as Partial<GuestProgress> | null
  if (!candidate || candidate.version !== GUEST_PROGRESS_VERSION) return emptyGuestProgress()
  if (!Array.isArray(candidate.quests)) return emptyGuestProgress()

  const seen = new Set<string>()
  const quests: GuestQuestRecord[] = []
  for (const entry of candidate.quests) {
    const record = entry as Partial<GuestQuestRecord> | null
    if (!record || typeof record.questId !== 'string' || record.questId.length === 0) continue
    if (seen.has(record.questId)) continue
    // An id with no quest behind it is either stale content or tampering.
    if (!getQuestById(record.questId)) continue
    if (!isValidScore(record.score)) continue

    const completedAt =
      typeof record.completedAt === 'number' && Number.isFinite(record.completedAt)
        ? record.completedAt
        : 0

    seen.add(record.questId)
    quests.push(
      record.score === undefined
        ? { questId: record.questId, completedAt }
        : { questId: record.questId, score: record.score, completedAt }
    )
  }

  return { version: GUEST_PROGRESS_VERSION, quests }
}

/**
 * Add a completion, or update the score of one already recorded.
 *
 * Pure: returns a new object. A replayed quest keeps its original
 * `completedAt` so the migration order stays stable, but takes the newer
 * score, matching how the server treats a retake.
 */
export function withQuestCompleted(
  progress: GuestProgress,
  questId: string,
  score: number | undefined,
  completedAt: number
): GuestProgress {
  const existing = progress.quests.find((q) => q.questId === questId)
  if (existing) {
    const merged: GuestQuestRecord =
      score === undefined
        ? { questId, completedAt: existing.completedAt }
        : { questId, score, completedAt: existing.completedAt }
    return {
      version: GUEST_PROGRESS_VERSION,
      quests: progress.quests.map((q) => (q.questId === questId ? merged : q)),
    }
  }

  const added: GuestQuestRecord =
    score === undefined ? { questId, completedAt } : { questId, score, completedAt }
  return { version: GUEST_PROGRESS_VERSION, quests: [...progress.quests, added] }
}

/** Total XP for the recorded quests, read from the curriculum. */
export function guestXP(progress: GuestProgress): number {
  return progress.quests.reduce((sum, q) => sum + (getQuestById(q.questId)?.xpReward ?? 0), 0)
}

/** Completed quest ids, in completion order. */
export function guestCompletedQuestIds(progress: GuestProgress): string[] {
  return [...progress.quests]
    .sort((a, b) => a.completedAt - b.completedAt)
    .map((q) => q.questId)
}

/**
 * Read stored guest progress.
 *
 * Returns empty progress when storage is unavailable — Safari private mode and
 * blocked site data both make localStorage throw rather than return null.
 */
export function loadGuestProgress(): GuestProgress {
  if (typeof window === 'undefined') return emptyGuestProgress()
  try {
    return parseGuestProgress(window.localStorage.getItem(GUEST_PROGRESS_KEY))
  } catch {
    return emptyGuestProgress()
  }
}

/** Persist guest progress, ignoring quota or availability failures. */
export function saveGuestProgress(progress: GuestProgress): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    // Storage full or blocked — progress stays in memory for this session.
  }
}

/** Drop stored guest progress, called once it has been migrated to an account. */
export function clearGuestProgress(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(GUEST_PROGRESS_KEY)
  } catch {
    // Nothing to do — a failed clear only risks a redundant migration, which
    // the server handles idempotently.
  }
}
