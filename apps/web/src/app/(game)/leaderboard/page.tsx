'use client'

import { useEffect, useState } from 'react'
import { Leaderboard, type LeaderboardEntry } from '@/components/ui/Leaderboard'
import { Skeleton } from '@/components/ui/Skeleton'

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; entries: LeaderboardEntry[] }

/**
 * Parse the flat array returned by GET /api/leaderboard.
 * Upstash `zrange` with `withScores` yields [member, score, member, score, ...],
 * where each member is `${userId}:${username}`.
 */
function parseLeaderboard(raw: unknown): LeaderboardEntry[] {
  if (!Array.isArray(raw)) return []
  const entries: LeaderboardEntry[] = []
  for (let i = 0; i < raw.length; i += 2) {
    const member = raw[i]
    const score = Number(raw[i + 1])
    if (typeof member !== 'string' || Number.isNaN(score)) continue
    const name = member.includes(':') ? member.split(':').slice(1).join(':') : member
    entries.push({ rank: entries.length + 1, name: name || member, score })
  }
  return entries
}

export default function LeaderboardPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function load() {
      try {
        const res = await fetch('/api/leaderboard', { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { leaderboard?: unknown }
        if (!cancelled) {
          setState({ status: 'ready', entries: parseLeaderboard(data.leaderboard) })
        }
      } catch (err) {
        if (!cancelled && !(err instanceof DOMException && err.name === 'AbortError')) {
          setState({ status: 'error' })
        }
      }
    }

    load()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  return (
    <div className="min-h-screen bg-brand-dark px-8 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-pixel text-xl text-brand-gold">LEADERBOARD</h1>
        <p className="mt-2 font-sans text-sm text-brand-gold/60">
          Top Stellar adventurers by XP
        </p>

        <div className="mt-8">
          {state.status === 'loading' && (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          )}
          {state.status === 'error' && (
            <div className="pixel-panel w-full p-6 text-center">
              <p className="font-pixel text-xs text-brand-gold/70">SIGNAL LOST</p>
              <p className="mt-3 font-sans text-sm text-brand-gold/60">
                We could not load the rankings. Check your connection and retry.
              </p>
            </div>
          )}
          {state.status === 'ready' && <Leaderboard entries={state.entries} />}
        </div>
      </div>
    </div>
  )
}