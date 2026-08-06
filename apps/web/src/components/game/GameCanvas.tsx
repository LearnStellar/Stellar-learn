'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type Phaser from 'phaser'

interface GameCanvasProps {
  worldId: string
  levelId: string
  characterId?: string
  onQuestTriggered: (questIndex: number) => void
  /** Fired when the boss-battle cinematic finishes (Issue #4 → #5). */
  onBossResolved?: (result: { won: boolean; worldId: string }) => void
}

export interface GameCanvasHandle {
  /**
   * Notify the game a quest panel closed; `completed` retires its rune and
   * `passed` tells the scene whether the player answered well enough, so a
   * retired rune reads as cleared or as unfinished business.
   */
  questClosed: (questIndex: number, completed: boolean, passed?: boolean) => void
  /** Push already-completed quest indices (persisted progress) into the game. */
  syncCompletedQuests: (indices: number[]) => void
  /**
   * Start the world-finale boss battle. `won` is the outcome the quest
   * pass/fail results dictate; the level scene only honors this after every
   * rune of the world is completed.
   */
  startBossBattle: (won: boolean, bossName?: string) => void
  /**
   * Push the authoritative XP total (owned by React — it's reconciled with
   * the progress API) into the in-game HUD. React never reads XP back out of
   * Phaser; this is a one-way sync.
   */
  updateXP: (xp: number) => void
}

/**
 * GameCanvas — mounts the Phaser game inside a Next.js client component.
 * Phaser is dynamically imported to avoid SSR issues (no window on server).
 */
export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(function GameCanvas(
  { worldId, levelId, characterId = 'warrior', onQuestTriggered, onBossResolved },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // The level scene registers its event listeners during create(); anything
  // emitted before 'level-ready' would be lost, so buffer the progress sync
  // and any XP push that arrives before the scene is listening.
  const levelReadyRef = useRef(false)
  const pendingSyncRef = useRef<number[] | null>(null)
  const pendingXPRef = useRef<number | null>(null)
  // Callbacks live in refs so a re-render that recreates them (e.g. the page
  // tracking completed quests) never tears down and reboots the Phaser game —
  // that would wipe rune state and abort a boss transition mid-flight.
  const onQuestTriggeredRef = useRef(onQuestTriggered)
  const onBossResolvedRef = useRef(onBossResolved)
  useEffect(() => {
    onQuestTriggeredRef.current = onQuestTriggered
    onBossResolvedRef.current = onBossResolved
  })

  useImperativeHandle(ref, () => ({
    questClosed(questIndex: number, completed: boolean, passed = true) {
      gameRef.current?.events.emit('quest-closed', { questIndex, completed, passed })
    },
    syncCompletedQuests(indices: number[]) {
      if (levelReadyRef.current && gameRef.current) {
        gameRef.current.events.emit('quests-synced', indices)
      } else {
        pendingSyncRef.current = indices
      }
    },
    startBossBattle(won: boolean, bossName?: string) {
      gameRef.current?.events.emit('boss-start', { won, bossName })
    },
    updateXP(xp: number) {
      if (levelReadyRef.current && gameRef.current) {
        gameRef.current.events.emit('xp-updated', xp)
      } else {
        pendingXPRef.current = xp
      }
    },
  }))

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    let game: Phaser.Game | null = null

    const initGame = async () => {
      const Phaser = (await import('phaser')).default
      const { BootScene, WorldMapScene, LevelScene, BossScene, DEFAULT_PHASER_CONFIG } = await import(
        '@stellar-learn/game-engine'
      )

      game = new Phaser.Game({
        ...DEFAULT_PHASER_CONFIG,
        parent: containerRef.current!,
        scene: [BootScene, WorldMapScene, LevelScene, BossScene],
      })

      // Tell BootScene to boot straight into the level (set before boot runs)
      // so only LevelScene is active — WorldMapScene never starts here.
      game.registry.set('bootScene', 'LevelScene')
      game.registry.set('bootData', { worldId, levelId, characterId })

      game.events.on('quest-triggered', ({ questIndex }: { questIndex: number }) => {
        onQuestTriggeredRef.current(questIndex)
      })

      game.events.on('boss-resolved', (result: { won: boolean; worldId: string }) => {
        onBossResolvedRef.current?.(result)
      })

      game.events.on('level-ready', () => {
        levelReadyRef.current = true
        if (pendingSyncRef.current) {
          game?.events.emit('quests-synced', pendingSyncRef.current)
          pendingSyncRef.current = null
        }
        if (pendingXPRef.current !== null) {
          game?.events.emit('xp-updated', pendingXPRef.current)
          pendingXPRef.current = null
        }
      })

      game.events.once('ready', () => {
        setIsLoading(false)
      })

      gameRef.current = game
    }

    void initGame()

    return () => {
      game?.destroy(true)
      gameRef.current = null
      levelReadyRef.current = false
      pendingSyncRef.current = null
      pendingXPRef.current = null
    }
  }, [worldId, levelId, characterId])

  return (
    <div className="game-canvas-container h-[100svh] min-h-[420px] w-full">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-brand-dark">
          <div className="font-pixel text-xs text-brand-gold animate-pulse">Loading world...</div>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
})
