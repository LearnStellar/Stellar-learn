'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  dismissSignupNudgeOnce,
  dismissSignupNudgePermanently,
  trackNudgeShown,
} from '@/lib/localProgress'

interface SignupNudgeProps {
  /** Whether the player is in a signed-out (guest) state. */
  guest: boolean
  /** Number of quests completed in this session — the nudge appears after the first. */
  questsCompletedInSession: number
  /** The quest id that most recently completed (for tracking). */
  lastCompletedQuestId?: string | null
  /** XP the guest has accumulated. */
  xpEarned?: number
}

/**
 * SignupNudge — a small, non-blocking reminder shown to guest players after
 * they complete their first quest (and occasionally afterwards). It explains
 * that signing up saves progress across devices, is dismissible, and never
 * spams: it appears at most 3 times and stops entirely once dismissed.
 */
export function SignupNudge({
  guest,
  questsCompletedInSession,
  lastCompletedQuestId,
  xpEarned = 0,
}: SignupNudgeProps) {
  const [visible, setVisible] = useState(false)
  const [skip, setSkip] = useState(false)
  // Track whether we've already shown the nudge for the current "quest burst".
  // Without this, several quest completions in a row would re-open the panel.
  const shownForQuestRef = useRef<string | null>(null)

  // Show the nudge after the first (and occasionally later) quest completion.
  useEffect(() => {
    if (!guest || skip) return
    if (questsCompletedInSession < 1) return

    const questId = lastCompletedQuestId ?? ''
    if (shownForQuestRef.current === questId) return

    // Only show if the nudge has spare budget (and isn't permanently dismissed).
    const count = trackNudgeShown(questId)
    // trackNudgeShown returns the incremented count; permanently-dismissed
    // users have shownCount >= 3, so the panel stays off.
    if (count > 3) return

    shownForQuestRef.current = questId
    setVisible(true)
  }, [guest, questsCompletedInSession, lastCompletedQuestId, skip])

  if (!visible || !guest) return null

  const handleClose = () => {
    dismissSignupNudgeOnce()
    setVisible(false)
  }

  const handleNever = () => {
    dismissSignupNudgePermanently()
    setSkip(true)
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed bottom-24 right-4 z-30 w-[300px] max-w-[calc(100vw-2rem)] sm:right-6"
          role="dialog"
          aria-label="Save your progress — create an account"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
          <div className="quest-panel pointer-events-auto w-full">
            <div className="quest-panel-inner !p-5">
              {/* Header */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="mb-1 font-pixel text-[9px] text-brand-purple-light uppercase">
                    🗝️ Save your progress
                  </div>
                  <h3 className="font-pixel text-[11px] leading-relaxed text-brand-gold">
                    You earned {xpEarned > 0 ? `${xpEarned} XP` : 'progress'} as a guest!
                  </h3>
                </div>
                <button
                  onClick={handleClose}
                  aria-label="Dismiss"
                  className="font-pixel text-xs text-brand-gold/50 transition hover:text-brand-gold"
                >
                  ✕
                </button>
              </div>

              <p className="mb-4 font-sans text-xs leading-relaxed text-brand-gold/70">
                Create a free account to save your progress across devices and
                keep your quests and XP — even continue where you left off.
              </p>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Link
                  href="/sign-up"
                  className="btn-pixel w-full text-center text-[10px] no-underline"
                >
                  ▶ Sign Up Free
                </Link>
                <button
                  onClick={handleNever}
                  className="w-full text-center font-pixel text-[8px] text-brand-gold/40 transition hover:text-brand-gold/70"
                >
                  Don&apos;t show again
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}