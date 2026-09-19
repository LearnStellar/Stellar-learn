'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { GuestProgressMigrator } from './GuestProgressMigrator'

/**
 * Client boundary for the guest-progress migration on the dashboard
 * (issue #75).
 *
 * The dashboard is a server component that reads XP and progress during
 * render, so a migration that lands afterwards would not be reflected until
 * the next navigation. Refreshing the route re-runs that server render with
 * the migrated totals.
 */
export function GuestProgressSync() {
  const router = useRouter()
  const handleMigrated = useCallback(() => {
    router.refresh()
  }, [router])

  return <GuestProgressMigrator onMigrated={handleMigrated} />
}
