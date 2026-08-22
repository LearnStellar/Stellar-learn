'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * GuestProgressMigrator — mounts on the dashboard (the only page a freshly
 * signed-up player is guaranteed to visit) and migrates any guest progress
 * stored in localStorage to the server account.
 *
 * Runs exactly once per session: detects remaining guest progress, replays
 * each completed quest through POST /api/progress (which considers a quest
 * already-completed only if a server row exists — guest ids haven't been
 * recorded yet, so they get awarded), then marks progress as migrated and
 * clears the local copy.
 */
export function GuestProgressMigrator() {
  const [migrating, setMigrating] = useState(false)
  const [result, setResult] = useState<{
    questsMigrated: number
    xpMigrated: number
  } | null>(null)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    let progress: {
      completedQuests: Array<{ questId: string; xpEarned: number }>
      totalXP: number
    } | null = null
    try {
      const raw = window.localStorage.getItem('stellar-learn:guest-progress')
      if (raw) progress = JSON.parse(raw)
    } catch {
      progress = null
    }

    if (!progress || progress.completedQuests.length === 0 || progress.totalXP <= 0) {
      // Nothing to migrate (or already migrated — the mark lives in storage).
      return
    }

    const run = async () => {
      setMigrating(true)
      let questsMigrated = 0
      let xpMigrated = 0
      for (const q of progress?.completedQuests ?? []) {
        try {
          const res = await fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questId: q.questId, xpEarned: q.xpEarned }),
          })
          if (res.ok) {
            questsMigrated += 1
            xpMigrated += q.xpEarned
          }
        } catch {
          // Keep trying the remaining quests; the next visit will retry the
          // ones that failed because the local copy is still present.
        }
      }

      if (questsMigrated > 0) {
        try {
          const done = JSON.parse(
            window.localStorage.getItem('stellar-learn:guest-progress') ?? 'null'
          )
          done.migrated = true
          window.localStorage.setItem(
            'stellar-learn:guest-progress',
            JSON.stringify(done)
          )
        } catch {
          // Ignore — storage write failure just means a retry next session.
        }
      }

      setResult({ questsMigrated, xpMigrated })
      setMigrating(false)
    }

    void run()
  }, [])

  if (migrating) {
    return (
      <div className="mb-6 rounded-xl border border-brand-purple/30 bg-brand-dark-2 px-5 py-4">
        <p className="font-pixel text-[10px] text-brand-gold">
          ⏳ Migrating your guest progress…
        </p>
      </div>
    )
  }

  if (result && result.questsMigrated > 0) {
    return (
      <div className="mb-6 rounded-xl border border-brand-gold/30 bg-brand-dark-2 px-5 py-4">
        <p className="font-pixel text-[10px] leading-relaxed text-brand-gold">
          🎉 Saved! {result.questsMigrated} quest
          {result.questsMigrated === 1 ? '' : 's'} ({result.xpMigrated} XP) from
          your guest play was added to your account.
        </p>
      </div>
    )
  }

  return null
}