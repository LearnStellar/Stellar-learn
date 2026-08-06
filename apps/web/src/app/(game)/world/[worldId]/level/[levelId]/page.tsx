'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { GameCanvas, type GameCanvasHandle } from '@/components/game/GameCanvas'
import { QuestPanel } from '@/components/game/QuestPanel'
import type { QuestResult } from '@/components/game/questFlow'
import { worlds } from '@stellar-learn/content'
import type { Quest } from '@stellar-learn/content'

interface PageProps {
  params: { worldId: string; levelId: string }
}

export default function LevelPage({ params }: PageProps) {
  const { worldId, levelId } = params
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null)
  const [xp, setXP] = useState(0)
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set())
  const [bossResult, setBossResult] = useState<{ won: boolean; scorePct?: number } | null>(null)
  const canvasRef = useRef<GameCanvasHandle>(null)
  // Pass/fail per quest id, from QuestPanel. Quests restored from persisted
  // progress have no recorded result and count as passed (they were completed
  // in an earlier session). Drives the boss-battle outcome — never random.
  const questResultsRef = useRef<Record<string, boolean>>({})
  // Quiz correctness (0-100) per quest id, scored quests only. This is the
  // world's per-quest score record; the boss overlay shows its average.
  const questScoresRef = useRef<Record<string, number>>({})
  const bossStartedRef = useRef(false)

  const world = worlds.find((w) => w.slug === worldId)

  // Load any saved XP / completed quests for the signed-in player on entry.
  useEffect(() => {
    let cancelled = false
    fetch('/api/progress')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { xp?: number; progress?: { questId: string; status: string }[] } | null) => {
        if (cancelled || !data) return
        if (typeof data.xp === 'number') setXP(data.xp)
        if (Array.isArray(data.progress)) {
          const completed = new Set(
            data.progress.filter((p) => p.status === 'COMPLETED').map((p) => p.questId)
          )
          setCompletedQuests(completed)

          // Retire already-completed runes in the game so they can't reopen.
          const currentWorld = worlds.find((w) => w.slug === worldId)
          const completedIndices = (currentWorld?.quests ?? [])
            .map((quest, index) => (completed.has(quest.id) ? index : -1))
            .filter((index) => index !== -1)
          if (completedIndices.length > 0) {
            canvasRef.current?.syncCompletedQuests(completedIndices)
          }
        }
      })
      .catch(() => {
        /* not signed in / offline — start fresh */
      })
    return () => {
      cancelled = true
    }
  }, [worldId])

  // Keep the in-game HUD's XP readout in sync with the React-owned total —
  // covers the initial load above, the optimistic bump on quest completion,
  // and the server-reconciled value that follows it.
  useEffect(() => {
    canvasRef.current?.updateXP(xp)
  }, [xp])

  const handleQuestTriggered = useCallback(
    (questIndex: number) => {
      const quest = world?.quests[questIndex]
      if (quest && !completedQuests.has(quest.id)) {
        setActiveQuest(quest)
      }
    },
    [world, completedQuests]
  )

  const handleQuestComplete = useCallback(async ({
    questId,
    xpEarned,
    passed,
    scorePct,
  }: QuestResult) => {
    questResultsRef.current[questId] = passed
    if (typeof scorePct === 'number') questScoresRef.current[questId] = scorePct
    const nextCompleted = new Set([...completedQuests, questId])
    setCompletedQuests(nextCompleted)
    setActiveQuest(null)
    setXP((prev) => prev + xpEarned) // optimistic; reconciled with server below

    // Resume the game and retire the completed rune, carrying the pass/fail so
    // the rune shows whether the player actually mastered the material.
    const questIndex = world?.quests.findIndex((q) => q.id === questId) ?? -1
    if (questIndex !== -1) {
      canvasRef.current?.questClosed(questIndex, true, passed)
    }

    // World finale: the moment the last quest completes, launch the boss
    // battle. The player wins it only if every quest was passed (Issue #4).
    if (
      world &&
      !bossStartedRef.current &&
      world.quests.every((q) => nextCompleted.has(q.id))
    ) {
      bossStartedRef.current = true
      const won = world.quests.every((q) => questResultsRef.current[q.id] !== false)
      canvasRef.current?.startBossBattle(won, world.bossName)
    }

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, xpEarned, score: scorePct }),
      })
      if (res.ok) {
        const data = (await res.json()) as { totalXP?: number }
        if (typeof data.totalXP === 'number') setXP(data.totalXP)
      }
    } catch {
      // not signed in / offline — keep the optimistic local XP
    }
  }, [world, completedQuests])

  const handleBossResolved = useCallback((result: { won: boolean; worldId: string }) => {
    // World progression on top of this result is Issue #5; for now surface
    // the outcome and route the player back to the dashboard.
    const scores = Object.values(questScoresRef.current)
    const scorePct =
      scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : undefined
    setBossResult({ won: result.won, scorePct })
  }, [])

  const handleQuestClose = useCallback(() => {
    // Closed without completing — resume the game, keep the rune active.
    const questIndex = activeQuest
      ? (world?.quests.findIndex((q) => q.id === activeQuest.id) ?? -1)
      : -1
    if (questIndex !== -1) {
      canvasRef.current?.questClosed(questIndex, false)
    }
    setActiveQuest(null)
  }, [activeQuest, world])

  if (!world) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-dark">
        <div className="font-pixel text-sm text-brand-gold/60">World not found</div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-brand-dark">
      {/* HUD overlay */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <div>
          <div className="font-pixel text-[10px] text-brand-gold/50">World {world.order}</div>
          <div className="font-pixel text-xs text-brand-gold">{world.title}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-pixel text-[10px] text-brand-gold/50">XP</span>
          <span className="font-pixel text-sm text-brand-gold-bright">{xp}</span>
        </div>
        <div className="font-pixel text-[10px] text-brand-gold/50">
          {completedQuests.size}/{world.quests.length} quests
        </div>
      </div>

      {/* Game Canvas */}
      <GameCanvas
        ref={canvasRef}
        worldId={worldId}
        levelId={levelId}
        onQuestTriggered={handleQuestTriggered}
        onBossResolved={handleBossResolved}
      />

      {/* Quest Panel Overlay */}
      <AnimatePresence>
        {activeQuest && (
          <QuestPanel
            quest={activeQuest}
            onComplete={handleQuestComplete}
            onClose={handleQuestClose}
          />
        )}
      </AnimatePresence>

      {/* Boss battle outcome */}
      <AnimatePresence>
        {bossResult && (
          <motion.div
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="mx-4 max-w-md rounded-xl border border-brand-purple/40 bg-brand-dark-2 p-8 text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div
                className={`mb-3 font-pixel text-xl ${
                  bossResult.won ? 'text-brand-gold-bright' : 'text-red-400'
                }`}
              >
                {bossResult.won ? 'VICTORY!' : 'DEFEATED'}
              </div>
              <p className="mb-2 font-sans text-sm text-brand-gold/80">
                {bossResult.won
                  ? `You defeated ${world.bossName} and conquered ${world.title}!`
                  : `${world.bossName} has bested you. Sharpen your knowledge and challenge the boss again.`}
              </p>
              <p className="mb-6 font-pixel text-[10px] text-brand-gold/50">
                {typeof bossResult.scorePct === 'number'
                  ? `Quiz score: ${bossResult.scorePct}% correct`
                  : ' '}
              </p>
              <Link href="/dashboard" className="btn-pixel inline-block text-[10px]">
                Return to Dashboard
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* XP gain notification */}
      <AnimatePresence>
        {xp > 0 && (
          <motion.div
            key={xp}
            className="pointer-events-none fixed bottom-20 right-8 font-pixel text-sm text-brand-gold-bright"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -60 }}
            transition={{ duration: 1.2 }}
          >
            +{xp} XP
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
