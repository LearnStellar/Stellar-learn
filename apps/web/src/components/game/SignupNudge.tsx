'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Signup reminder shown to guests during play (issue #75).
 *
 * Timing rules, chosen so this stays a nudge rather than a nag:
 *   - never before the first quest is completed;
 *   - then after every NUDGE_INTERVAL_QUESTS completions;
 *   - never while a quest panel is open, so it cannot cover the quiz;
 *   - dismissing it stops it for the rest of the browser session.
 *
 * It is non-blocking: a corner toast, not a modal, so play continues behind it.
 */

/** Show on the 1st completed quest, then every 3rd after that. */
export const NUDGE_INTERVAL_QUESTS = 3

/** sessionStorage, not localStorage: a dismissal lasts the session, not forever. */
export const NUDGE_DISMISSED_KEY = 'stellar-learn:signup-nudge-dismissed'

/**
 * Whether a nudge is due at this completion count.
 *
 * Pure so the cadence is unit-testable. First completion always qualifies;
 * after that only every NUDGE_INTERVAL_QUESTS-th one does.
 */
export function shouldNudgeAt(completedCount: number): boolean {
  if (completedCount <= 0) return false
  if (completedCount === 1) return true
  return (completedCount - 1) % NUDGE_INTERVAL_QUESTS === 0
}

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(NUDGE_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

interface SignupNudgeProps {
  /** How many quests the guest has completed so far. */
  completedCount: number
  /** XP the guest has accumulated, quoted back as the thing at risk. */
  xp: number
  /** True while a quest panel is open; the nudge waits rather than covering it. */
  suppressed?: boolean
}

export function SignupNudge({ completedCount, xp, suppressed = false }: SignupNudgeProps) {
  const [dismissed, setDismissed] = useState(false)
  // Which completion count the visible nudge belongs to, so a single dismissal
  // does not also swallow the next one.
  const [shownFor, setShownFor] = useState<number | null>(null)

  useEffect(() => {
    if (readDismissed()) setDismissed(true)
  }, [])

  useEffect(() => {
    if (dismissed || suppressed) return
    if (!shouldNudgeAt(completedCount)) return
    setShownFor((current) => (current === completedCount ? current : completedCount))
  }, [completedCount, dismissed, suppressed])

  const visible = !dismissed && !suppressed && shownFor === completedCount && completedCount > 0

  const dismiss = () => {
    setShownFor(null)
  }

  const dismissForSession = () => {
    setDismissed(true)
    setShownFor(null)
    try {
      window.sessionStorage.setItem(NUDGE_DISMISSED_KEY, '1')
    } catch {
      // Dismissal simply does not persist past this page view.
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-40 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-brand-purple/50 bg-brand-dark-2/95 p-4 shadow-lg backdrop-blur"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
          <div className="mb-2 font-pixel text-[10px] text-brand-gold-bright">
            {xp} XP earned — save it?
          </div>
          <p className="mb-3 font-sans text-xs leading-relaxed text-brand-gold/80">
            Your progress is stored on this device only. Create a free account to keep it and
            continue on any device.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/sign-up" className="btn-pixel inline-block text-[10px]">
              Create account
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="font-pixel text-[9px] text-brand-gold/60 underline-offset-4 hover:text-brand-gold hover:underline"
            >
              Later
            </button>
            <button
              type="button"
              onClick={dismissForSession}
              className="ml-auto font-pixel text-[9px] text-brand-gold/40 underline-offset-4 hover:text-brand-gold/70 hover:underline"
            >
              Don&apos;t show again
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
