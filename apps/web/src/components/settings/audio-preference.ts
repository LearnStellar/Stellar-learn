/**
 * Audio/mute preference persistence (localStorage).
 * Kept tiny and dependency-free; no audio playback is wired here.
 */

const STORAGE_KEY = 'stellar-learn:audio-muted'

/** Read the persisted mute preference (false when unset/unavailable). */
export function readMuted(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Persist the mute preference (removes the key when unmuted). */
export function writeMuted(muted: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (muted) localStorage.setItem(STORAGE_KEY, '1')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore quota/private-mode errors */
  }
}