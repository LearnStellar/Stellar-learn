'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { GameCanvas, type GameCanvasHandle } from '@/components/game/GameCanvas'
import { QuestPanel } from '@/components/game/QuestPanel'
import {
  clearLocalQuests,
  readLocalProgress,
  recordLocalBossResult,
  recordLocalQuest,
} from '@/lib/localProgress'
import { worlds } from '@stellar-learn/content'
import type { Quest } from '@stellar-learn/content'

/** What the boss-outcome overlay needs to route the player onwards. */
interface BossOutcome {
  won: boolean
  /** Where victory leads: the next world, or the dashboard at the end. */
  redirectTo: string
  /** Title of the world unlocked by the win, when there is one. */
  nextTitle: string | null
  /** Quests the player failed — the material a defeat sends them back to. */
  failedQuests: Quest[]
}

interface PageProps {
  params: { worldId: string; levelId: string }
}

export default function LevelPage({ params }: PageProps) {
  const { worldId, levelId } = params
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null)
  const [xp, setXP] = useState(0)
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set())
  const [bossOutcome, setBossOutcome] = useState<BossOutcome | null>(null)
  // Bumped to remount the Phaser game when a defeat sends the player back —
  // the runes of the reopened quests have to be rebuilt from scratch.
  const [runKey, setRunKey] = useState(0)
  const canvasRef = useRef<GameCanvasHandle>(null)
  // Pass/fail per quest id, from QuestPanel. Quests restored from persisted
  // progress have no recorded result and count as passed (they were completed
  // in an earlier session). Drives the boss-battle outcome — never random.
  const questResultsRef = useRef<Record<string, boolean>>({})
  const bossStartedRef = useRef(false)

  const world = worlds.find((w) => w.slug === worldId)

  // Restore progress on entry. The browser-local mirror seeds the state so the
  // world survives a reload with no auth/DB configured; the server answer, when
  // there is one, is authoritative and replaces it.
  useEffect(() => {
    let cancelled = false

    const local = readLocalProgress()
    const localQuestIds = Object.keys(local.quests)
    if (localQuestIds.length > 0) {
      setCompletedQuests(new Set(localQuestIds))
      questResultsRef.current = { ...local.quests }
    }

    fetch('/api/progress')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { xp?: number; progress?: { questId: string; status: string }[] } | null) => {
        if (cancelled || !data) return
        if (typeof data.xp === 'number') setXP(data.xp)
        if (Array.isArray(data.progress)) {
          setCompletedQuests(
            new Set(data.progress.filter((p) => p.status === 'COMPLETED').map((p) => p.questId))
          )
        }
      })
      .catch(() => {
        /* not signed in / offline — the local mirror already seeded the state */
      })

    return () => {
      cancelled = true
    }
  }, [worldId])

  // Retire the runes of completed quests so they can't be reopened. Re-runs on
  // `runKey` because a retry remounts the game with a fresh set of runes.
  useEffect(() => {
    const completedIndices = (world?.quests ?? [])
      .map((quest, index) => (completedQuests.has(quest.id) ? index : -1))
      .filter((index) => index !== -1)
    if (completedIndices.length > 0) {
      canvasRef.current?.syncCompletedQuests(completedIndices)
    }
  }, [world, completedQuests, runKey])

  // World finale: once every quest of the world is complete, launch the boss
  // battle (Issue #4). Driven off the completed set rather than the last
  // completion event, so a player who cleared the world and then reloaded still
  // gets the finale they are owed instead of a level with no runes left.
  useEffect(() => {
    if (!world || bossStartedRef.current || bossOutcome) return
    if (world.quests.length === 0) return
    if (!world.quests.every((quest) => completedQuests.has(quest.id))) return

    bossStartedRef.current = true
    // The outcome is dictated by the recorded quest results — never random.
    const won = world.quests.every((quest) => questResultsRef.current[quest.id] !== false)
    canvasRef.current?.startBossBattle(won, world.bossName)
  }, [world, completedQuests, bossOutcome, runKey])

  const handleQuestTriggered = useCallback(
    (questIndex: number) => {
      const quest = world?.quests[questIndex]
      if (quest && !completedQuests.has(quest.id)) {
        setActiveQuest(quest)
      }
    },
    [world, completedQuests]
  )

  const handleQuestComplete = useCallback(async (questId: string, xpEarned: number, passed: boolean) => {
    questResultsRef.current[questId] = passed
    const nextCompleted = new Set([...completedQuests, questId])
    setCompletedQuests(nextCompleted)
    setActiveQuest(null)
    setXP((prev) => prev + xpEarned) // optimistic; reconciled with server below

    // Resume the game and retire the completed rune.
    const questIndex = world?.quests.findIndex((q) => q.id === questId) ?? -1
    if (questIndex !== -1) {
      canvasRef.current?.questClosed(questIndex, true)
    }

    // Mirror locally so the world survives a reload without auth/DB.
    recordLocalQuest(questId, passed)

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, xpEarned }),
      })
      if (res.ok) {
        const data = (await res.json()) as { totalXP?: number }
        if (typeof data.totalXP === 'number') setXP(data.totalXP)
      }
    } catch {
      // not signed in / offline — keep the optimistic local XP
    }
  }, [world, completedQuests])

  const handleBossResolved = useCallback(
    async (result: { won: boolean; worldId: string }) => {
      const failedQuests = (world?.quests ?? []).filter(
        (quest) => questResultsRef.current[quest.id] === false
      )

      // Record the outcome first so the unlock (or the reopened quests) is
      // durable before the overlay offers to route the player onwards.
      recordLocalBossResult(worldId, result.won)
      if (!result.won) {
        clearLocalQuests(failedQuests.map((quest) => quest.id))
      }

      // Local defaults so the loop still closes when the API is unreachable.
      let redirectTo = result.won ? '/dashboard' : `/world/${worldId}/level/1`
      let nextTitle: string | null = null

      try {
        const res = await fetch('/api/progress/world', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            worldId,
            won: result.won,
            failedQuestIds: failedQuests.map((quest) => quest.id),
          }),
        })
        if (res.ok) {
          const data = (await res.json()) as {
            redirectTo?: string
            nextWorldSlug?: string | null
            worlds?: { slug: string; title: string }[]
          }
          if (typeof data.redirectTo === 'string') redirectTo = data.redirectTo
          if (data.nextWorldSlug) {
            nextTitle = data.worlds?.find((w) => w.slug === data.nextWorldSlug)?.title ?? null
          }
        }
      } catch {
        // Offline — the local mirror already holds the outcome.
      }

      setBossOutcome({ won: result.won, redirectTo, nextTitle, failedQuests })
    },
    [world, worldId]
  )

  /**
   * Defeat path: reopen the quests the player failed and drop them back into
   * the level to retry exactly that material. The game is remounted so the
   * reopened runes are rebuilt.
   */
  const handleRetryWorld = useCallback(() => {
    const failed = bossOutcome?.failedQuests ?? []
    // With no specific failures recorded, reopen the whole world rather than
    // dropping the player straight back into the battle they just lost.
    const reopen = (failed.length > 0 ? failed : (world?.quests ?? [])).map((quest) => quest.id)

    setCompletedQuests((prev) => new Set([...prev].filter((id) => !reopen.includes(id))))
    for (const id of reopen) delete questResultsRef.current[id]
    clearLocalQuests(reopen)
    bossStartedRef.current = false
    setBossOutcome(null)
    setRunKey((key) => key + 1)
  }, [bossOutcome, world])

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
        key={runKey}
        ref={canvasRef}
        worldId={worldId}
        levelId={levelId}
        onQuestTriggered={handleQuestTriggered}
        onXPUpdate={setXP}
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

      {/* Boss battle outcome — victory advances a world, defeat sends the
          player back to the material they failed. */}
      <AnimatePresence>
        {bossOutcome && (
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
                  bossOutcome.won ? 'text-brand-gold-bright' : 'text-red-400'
                }`}
              >
                {bossOutcome.won ? 'VICTORY!' : 'DEFEATED'}
              </div>
              <p className="mb-6 font-sans text-sm text-brand-gold/80">
                {bossOutcome.won
                  ? `You defeated ${world.bossName} and conquered ${world.title}!`
                  : `${world.bossName} has bested you. Master the material below and challenge the boss again.`}
              </p>

              {!bossOutcome.won && bossOutcome.failedQuests.length > 0 && (
                <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-left">
                  <div className="mb-2 font-pixel text-[9px] uppercase text-red-400">
                    Quests to retry
                  </div>
                  <ul className="space-y-1 font-sans text-xs text-brand-gold/70">
                    {bossOutcome.failedQuests.map((quest) => (
                      <li key={quest.id}>· {quest.title}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col items-stretch gap-3">
                {bossOutcome.won ? (
                  <Link href={bossOutcome.redirectTo} className="btn-pixel text-[10px]">
                    {bossOutcome.nextTitle
                      ? `▶ Enter ${bossOutcome.nextTitle}`
                      : '▶ Continue Your Journey'}
                  </Link>
                ) : (
                  <button onClick={handleRetryWorld} className="btn-pixel text-[10px]">
                    ↺ Retry {bossOutcome.failedQuests.length > 0 ? 'Failed Quests' : 'This World'}
                  </button>
                )}
                <Link
                  href="/dashboard"
                  className="font-pixel text-[10px] text-brand-gold/50 transition hover:text-brand-gold"
                >
                  Return to Dashboard
                </Link>
              </div>
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
