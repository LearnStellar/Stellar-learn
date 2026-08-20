'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { GameCanvas, type GameCanvasHandle } from '@/components/game/GameCanvas'
import { QuestPanel } from '@/components/game/QuestPanel'
import { CharacterPortrait } from '@/components/game/CharacterPortrait'
import { worlds, getLevel } from '@stellar-learn/content'
import type { Quest } from '@stellar-learn/content'
import type { EquippedItemMap } from '@stellar-learn/game-engine/characterRender'

interface PageProps {
  params: { worldId: string; levelId: string }
}

export default function LevelPage({ params }: PageProps) {
  const { worldId, levelId } = params
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null)
  const [xp, setXP] = useState(0)
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set())
  const [bossResult, setBossResult] = useState<{ won: boolean } | null>(null)
  const [lastXpGained, setLastXpGained] = useState(0)
  const [xpPulse, setXpPulse] = useState(0)
  const [profile, setProfile] = useState<{ characterId: string; equippedItems: EquippedItemMap } | null>(null)
  // GameCanvas boots the Phaser game with whatever characterId it's first
  // given, and re-initializes the whole level if that prop later changes —
  // so we wait for the profile fetch to settle (success or failure) before
  // mounting it, rather than mounting eagerly with a default and reloading
  // once the real selection arrives.
  const [profileReady, setProfileReady] = useState(false)
  const canvasRef = useRef<GameCanvasHandle>(null)
  // Pass/fail per quest id, from QuestPanel. Quests restored from persisted
  // progress have no recorded result and count as passed (they were completed
  // in an earlier session). Drives the boss-battle outcome — never random.
  const questResultsRef = useRef<Record<string, boolean>>({})
  const bossStartedRef = useRef(false)

  const world = worlds.find((w) => w.slug === worldId)
  // A world can author its curriculum as `levels` (12 × 5 quests) or a flat
  // `quests` list. `getLevel` resolves either shape to the 5 quests of the
  // level the URL points at — the canonical "level → quests" unit the
  // platformer (LevelScene) renders as its 5 runes.
  const level = world ? getLevel(world, levelId) : undefined
  const quests = useMemo(() => level?.quests ?? [], [level])
  // Completed quests in THIS level only. The HUD counter must not count quests
  // finished in other levels — the global set below drives game logic.
  const completedInLevel = useMemo(
    () => quests.filter((q) => completedQuests.has(q.id)).length,
    [quests, completedQuests]
  )

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
          const completedIndices = quests
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldId, levelId])

  // Selected character + equipped cosmetics — the same profile endpoint
  // AvatarSelect uses, so the in-level sprite/HUD always match whatever was
  // last confirmed there. Settling profileReady either way (success or
  // failure) lets a guest/offline player still fall through to the default
  // 'warrior' GameCanvas already uses.
  useEffect(() => {
    let cancelled = false
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { characterId?: string; equippedItems?: EquippedItemMap } | null) => {
        if (cancelled || !data?.characterId) return
        setProfile({ characterId: data.characterId, equippedItems: data.equippedItems ?? {} })
      })
      .catch(() => {
        /* not signed in / offline — falls back to GameCanvas's default character */
      })
      .finally(() => {
        if (!cancelled) setProfileReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Mirror the quest panel's visibility straight into the game every time it
  // changes: panel open -> pause the player, panel closed -> resume. This is the
  // single source of truth for movement being frozen, so the character can never
  // get stuck after finishing a quest regardless of how the panel closed.
  useEffect(() => {
    canvasRef.current?.setPaused(activeQuest !== null)
  }, [activeQuest])

  const handleQuestTriggered = useCallback(
    (questIndex: number) => {
      const quest = quests[questIndex]
      if (quest && !completedQuests.has(quest.id)) {
        setActiveQuest(quest)
      }
    },
    [quests, completedQuests]
  )

  const handleQuestComplete = useCallback(
    async (questId: string, xpEarned: number, passed: boolean) => {
      questResultsRef.current[questId] = passed
      const nextCompleted = new Set([...completedQuests, questId])
      setCompletedQuests(nextCompleted)
      setActiveQuest(null)
      setXP((prev) => prev + xpEarned) // optimistic; reconciled with server below
      setLastXpGained(xpEarned) // toast shows the amount just earned, not the total
      setXpPulse((n) => n + 1)

      // Resume the game and retire the completed rune.
      const questIndex = quests.findIndex((q) => q.id === questId)
      if (questIndex !== -1) {
        canvasRef.current?.questClosed(questIndex, true)
      }

      // Level finale: the moment the last quest completes, launch the boss
      // battle. The player wins it only if every quest was passed (Issue #4).
      if (world && !bossStartedRef.current && quests.every((q) => nextCompleted.has(q.id))) {
        bossStartedRef.current = true
        const won = quests.every((q) => questResultsRef.current[q.id] !== false)
        canvasRef.current?.startBossBattle(won, world.bossName)
      }

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
    },
    [world, quests, completedQuests]
  )

  const handleBossResolved = useCallback((result: { won: boolean; worldId: string }) => {
    // World progression on top of this result is Issue #5; for now surface
    // the outcome and route the player back to the level map.
    setBossResult({ won: result.won })
  }, [])

  const handleQuestClose = useCallback(() => {
    // Closed without completing — resume the game, keep the rune active.
    const questIndex = activeQuest ? quests.findIndex((q) => q.id === activeQuest.id) : -1
    if (questIndex !== -1) {
      canvasRef.current?.questClosed(questIndex, false)
    }
    setActiveQuest(null)
  }, [activeQuest, quests])

  if (!world || !level) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-dark">
        <div className="font-pixel text-sm text-brand-gold/60">
          {world ? 'Level not found' : 'World not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-brand-dark">
      {/* HUD overlay */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          {profile && (
            <CharacterPortrait
              characterId={profile.characterId}
              equippedItems={profile.equippedItems}
              size={40}
            />
          )}
          <div>
            <div className="font-pixel text-[10px] text-brand-gold/50">
              {world.title} · Level {level.order}
            </div>
            <div className="font-pixel text-xs text-brand-gold">{level.title}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-pixel text-[10px] text-brand-gold/50">XP</span>
          <span className="font-pixel text-sm text-brand-gold-bright">{xp}</span>
        </div>
        <div className="font-pixel text-[10px] text-brand-gold/50">
          {completedInLevel}/{quests.length} quests
        </div>
      </div>

      {/* Game Canvas — held back until the profile fetch settles so it boots
          with the player's actual selected character on the first mount. */}
      {profileReady ? (
        <GameCanvas
          ref={canvasRef}
          worldId={worldId}
          levelId={levelId}
          characterId={profile?.characterId}
          onQuestTriggered={handleQuestTriggered}
          onXPUpdate={setXP}
          onBossResolved={handleBossResolved}
        />
      ) : (
        <div className="flex h-[100svh] min-h-[420px] w-full items-center justify-center">
          <div className="font-pixel text-xs text-brand-gold animate-pulse">Loading world...</div>
        </div>
      )}

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
              <p className="mb-6 font-sans text-sm text-brand-gold/80">
                {bossResult.won
                  ? `You defeated ${world.bossName} and cleared ${level.title}!`
                  : `${world.bossName} has bested you. Sharpen your knowledge and challenge it again.`}
              </p>
              <Link href={`/world/${worldId}`} className="btn-pixel inline-block text-[10px]">
                Return to Level Map
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* XP gain notification — only on a real completion, showing the earned amount */}
      <AnimatePresence>
        {lastXpGained > 0 && (
          <motion.div
            key={xpPulse}
            className="pointer-events-none fixed bottom-20 right-8 font-pixel text-sm text-brand-gold-bright"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -60 }}
            transition={{ duration: 1.2 }}
          >
            +{lastXpGained} XP
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
