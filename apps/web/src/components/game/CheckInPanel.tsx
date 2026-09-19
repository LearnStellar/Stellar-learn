'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CHECKIN_STREAK_BADGE,
  STREAK_BADGE_THRESHOLD,
  gemsForStreak,
} from '@/lib/checkin'

interface CheckInRow {
  dayKey: string
  streak: number
  gemsAwarded: number
  badgeAwarded: boolean
}

interface CheckInState {
  streak: number
  claimedToday: boolean
  badgeEarned: boolean
  balance: number
  badge: { slug: string; title: string; description: string; iconUrl: string } | null
  checkIns: CheckInRow[]
}

// Shape of a successful POST /api/checkin response (the reward payload).
interface ClaimResult {
  claimedToday: boolean
  streak: number
  gemsAwarded: number
  badgeAwarded: boolean
  badge: { slug: string; title: string; description: string; iconUrl: string } | null
  balance: number
  dayKey: string
}

type LoadStatus = 'loading' | 'ready' | 'unauthenticated' | 'error'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function localDayKey(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** The seven local days ending today (oldest first), for the calendar strip. */
function lastSevenDays(): { key: string; weekday: string; day: number }[] {
  const out: { key: string; weekday: string; day: number }[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    out.push({ key: localDayKey(d), weekday: WEEKDAYS[d.getDay()], day: d.getDate() })
  }
  return out
}

export function CheckInPanel() {
  const [state, setState] = useState<CheckInState | null>(null)
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [claiming, setClaiming] = useState(false)
  const [reward, setReward] = useState<{ gems: number; badge: boolean } | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/checkin', { headers: { 'Content-Type': 'application/json' } })
      if (res.status === 401) {
        setStatus('unauthenticated')
        return
      }
      if (!res.ok) {
        setStatus('error')
        return
      }
      const data = (await res.json()) as CheckInState
      setState(data)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const claim = useCallback(async () => {
    setClaiming(true)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tzOffsetMinutes: new Date().getTimezoneOffset() }),
      })
      const data = (await res.json()) as ClaimResult
      if (!res.ok) {
        setStatus('error')
        return
      }
      setState({
        streak: data.streak,
        claimedToday: data.claimedToday,
        badgeEarned: state?.badgeEarned || data.badgeAwarded || Boolean(data.badge),
        balance: data.balance,
        badge: data.badge ?? (state?.badgeEarned ? CHECKIN_STREAK_BADGE : null),
        checkIns: data.checkIns ?? state?.checkIns ?? [],
      })
      // Surface the reward modal when a real claim happened (gems awarded,
      // or a 10-day badge crossed). An idempotent same-day re-submit is silent.
      if (data.gemsAwarded > 0 || data.badgeAwarded) {
        setReward({ gems: data.gemsAwarded, badge: Boolean(data.badgeAwarded) })
      }
    } catch {
      setStatus('error')
    } finally {
      setClaiming(false)
    }
  }, [state])

  const calendar = useMemo(() => {
    const claimed = new Set(state?.checkIns.map((c) => c.dayKey) ?? [])
    return lastSevenDays().map((d) => ({ ...d, claimed: claimed.has(d.key) }))
  }, [state])

  const nextGems = state ? gemsForStreak(state.claimedToday ? state.streak : state.streak + 1) : 0
  const progressPct = state ? Math.min(100, Math.round((state.streak / STREAK_BADGE_THRESHOLD) * 100)) : 0

  if (status === 'loading') {
    return (
      <section className="rounded-xl border border-brand-dark-4 bg-brand-dark-2/50 p-6">
        <div className="font-pixel text-[10px] text-brand-gold/40">Loading check-in…</div>
      </section>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <section className="rounded-xl border border-brand-dark-4 bg-brand-dark-2/50 p-6">
        <h2 className="font-pixel text-sm text-brand-gold">Daily Check-In</h2>
        <p className="mt-3 font-sans text-xs text-brand-gold/60">
          Sign in to start your streak and earn gems every day.
        </p>
      </section>
    )
  }

  if (status === 'error' || !state) {
    return (
      <section className="rounded-xl border border-brand-dark-4 bg-brand-dark-2/50 p-6">
        <h2 className="font-pixel text-sm text-brand-gold">Daily Check-In</h2>
        <p className="mt-3 font-sans text-xs text-brand-gold/60">Couldn’t load your streak.</p>
        <button onClick={() => void load()} className="btn-pixel mt-4 text-[10px]">
          Retry
        </button>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-brand-purple bg-brand-dark-2 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-pixel text-sm text-brand-gold">Daily Check-In</h2>
          <p className="mt-2 font-sans text-xs text-brand-gold/60">
            Claim once a day. {STREAK_BADGE_THRESHOLD} days in a row unlocks a badge.
          </p>
        </div>
        <div className="text-right">
          <div className="font-pixel text-2xl text-brand-gold-bright">🔥 {state.streak}</div>
          <div className="font-pixel text-[9px] text-brand-gold/50">DAY STREAK</div>
        </div>
      </div>

      {/* Calendar strip */}
      <div className="mt-6 grid grid-cols-7 gap-2">
        {calendar.map((cell) => (
          <div key={cell.key} className="flex flex-col items-center gap-1">
            <span className="font-pixel text-[8px] text-brand-gold/40">{cell.weekday}</span>
            <div
              className={`flex h-10 w-full items-center justify-center rounded-md border text-sm ${
                cell.claimed
                  ? 'border-brand-gold bg-brand-gold/20 text-brand-gold-bright'
                  : 'border-brand-dark-4 bg-brand-dark text-brand-gold/30'
              }`}
            >
              {cell.claimed ? '✓' : cell.day}
            </div>
          </div>
        ))}
      </div>

      {/* Progress to badge */}
      <div className="mt-5">
        <div className="mb-1 flex justify-between font-pixel text-[8px] text-brand-gold/50">
          <span>STREAK BADGE</span>
          <span>
            {Math.min(state.streak, STREAK_BADGE_THRESHOLD)} / {STREAK_BADGE_THRESHOLD}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-brand-dark">
          <div
            className="h-full rounded-full bg-brand-gold transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Balance + action */}
      <div className="mt-5 flex items-center justify-between">
        <div className="font-pixel text-[11px] text-stellar-teal">💎 {state.balance} GEMS</div>
        <button
          onClick={() => void claim()}
          disabled={claiming || state.claimedToday}
          className={`btn-pixel text-[10px] ${state.claimedToday ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          {state.claimedToday ? 'CLAIMED ✓' : claiming ? 'CLAIMING…' : `CLAIM +${nextGems} 💎`}
        </button>
      </div>

      <AnimatePresence>
        {reward && (
          <RewardModal
            gems={reward.gems}
            badge={reward.badge}
            onClose={() => setReward(null)}
          />
        )}
      </AnimatePresence>
    </section>
  )
}

function RewardModal({ gems, badge, onClose }: { gems: number; badge: boolean; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-sm rounded-xl border-2 border-brand-gold bg-brand-dark-2 p-8 text-center"
        style={{ boxShadow: '0 0 0 4px #07071a, 0 0 40px rgba(255,215,0,.35)' }}
        initial={{ scale: 0.8, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 font-pixel text-[10px] text-brand-gold/50 hover:text-brand-gold"
          aria-label="Close"
        >
          ✕
        </button>

        {badge ? (
          <>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
              <motion.img
                src={CHECKIN_STREAK_BADGE.iconUrl}
                alt={CHECKIN_STREAK_BADGE.title}
                width={64}
                height={64}
                className="h-16 w-16"
                initial={{ rotate: -12, scale: 0.6 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              />
            </div>
            <h3 className="font-pixel text-sm text-brand-gold-bright">10-DAY STREAK!</h3>
            <p className="mt-3 font-sans text-xs text-brand-gold/70">{CHECKIN_STREAK_BADGE.description}</p>
          </>
        ) : (
          <>
            <div className="font-pixel text-3xl text-stellar-teal">+{gems}</div>
            <h3 className="mt-2 font-pixel text-sm text-brand-gold-bright">GEMS EARNED</h3>
            <p className="mt-3 font-sans text-xs text-brand-gold/70">Come back tomorrow to grow your streak.</p>
          </>
        )}

        <button onClick={onClose} className="btn-pixel mt-6 w-full text-[10px]">
          AWESOME!
        </button>
      </motion.div>
    </motion.div>
  )
}
