'use client'

import { useEffect, useRef } from 'react'
import { clearGuestProgress, loadGuestProgress } from '@/lib/localProgress'

/**
 * Migrate leftover guest progress onto the account once the player signs up
 * (issue #75).
 *
 * Mounted on the dashboard, which is where Clerk lands a user after sign-up
 * and sign-in. If localStorage holds guest completions, they are posted to
 * /api/progress/migrate and then cleared.
 *
 * Safe to run more than once: the endpoint skips quests already COMPLETED on
 * the account, so a retry awards nothing a second time. Local storage is
 * cleared only after the server confirms, so a failed migration is retried on
 * the next visit rather than lost.
 *
 * Renders nothing — `onMigrated` lets the host refresh any progress it already
 * rendered on the server.
 */
export function GuestProgressMigrator({ onMigrated }: { onMigrated?: () => void }) {
  // Guards against React StrictMode double-invoking the effect in development
  // and posting the same migration twice.
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const progress = loadGuestProgress()
    if (progress.quests.length === 0) return

    let cancelled = false
    const migrate = async () => {
      try {
        const res = await fetch('/api/progress/migrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quests: progress.quests.map(({ questId, score }) =>
              score === undefined ? { questId } : { questId, score }
            ),
          }),
        })
        if (cancelled || !res.ok) return
        // Only drop the local copy once the server has taken ownership.
        clearGuestProgress()
        onMigrated?.()
      } catch {
        // Keep local progress and try again on the next dashboard visit.
      }
    }

    void migrate()
    return () => {
      cancelled = true
    }
  }, [onMigrated])

  return null
}
