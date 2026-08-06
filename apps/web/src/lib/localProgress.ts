'use client'

/**
 * Browser-local progress mirror.
 *
 * Clerk and the database are both optional in this project (see `lib/auth.ts`);
 * with neither configured `/api/progress` answers 401 and nothing would survive
 * a reload. This keeps a small mirror in `localStorage` so the progression loop
 * — clear quests, beat the boss, unlock the next world — persists for everyone,
 * and so a signed-in player's optimistic state survives a refresh mid-world.
 *
 * The server stays authoritative whenever it answers: callers merge the server
 * response over this mirror, never the other way around.
 */
const STORAGE_KEY = 'stellar-learn:progress:v1'

export interface LocalProgress {
  /** Quest id → whether the player passed it. */
  quests: Record<string, boolean>
  /** Slugs of worlds whose boss has been defeated. */
  completedWorlds: string[]
}

const EMPTY: LocalProgress = { quests: {}, completedWorlds: [] }

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readLocalProgress(): LocalProgress {
  if (!isBrowser()) return EMPTY
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<LocalProgress>
    return {
      quests: typeof parsed.quests === 'object' && parsed.quests !== null ? parsed.quests : {},
      completedWorlds: Array.isArray(parsed.completedWorlds) ? parsed.completedWorlds : [],
    }
  } catch {
    // Corrupt or unavailable storage (private mode, quota) — start fresh
    // rather than breaking the level page.
    return EMPTY
  }
}

function write(progress: LocalProgress): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Storage full or blocked — progression still works for this session.
  }
}

/** Record the outcome of a completed quest. */
export function recordLocalQuest(questId: string, passed: boolean): void {
  const progress = readLocalProgress()
  progress.quests[questId] = passed
  write(progress)
}

/** Forget quests so their runes reopen — used when a boss loss sends the player back. */
export function clearLocalQuests(questIds: string[]): void {
  if (questIds.length === 0) return
  const progress = readLocalProgress()
  for (const questId of questIds) delete progress.quests[questId]
  write(progress)
}

/**
 * Record a boss outcome. A win marks the world cleared (which is what unlocks
 * the next one); a loss leaves it uncleared so the player stays put.
 */
export function recordLocalBossResult(worldSlug: string, won: boolean): void {
  const progress = readLocalProgress()
  const cleared = new Set(progress.completedWorlds)
  if (won) cleared.add(worldSlug)
  else cleared.delete(worldSlug)
  progress.completedWorlds = [...cleared]
  write(progress)
}
