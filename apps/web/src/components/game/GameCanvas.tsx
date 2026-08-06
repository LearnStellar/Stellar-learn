'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type Phaser from 'phaser'

interface GameCanvasProps {
  worldId: string
  levelId: string
  characterId?: string
  onQuestTriggered: (questIndex: number) => void
  onXPUpdate: (xp: number) => void
  /** Fired when the boss-battle cinematic finishes (Issue #4 → #5). */
  onBossResolved?: (result: { won: boolean; worldId: string }) => void
}

export interface GameCanvasHandle {
  /** Notify the game a quest panel closed; `completed` retires its rune. */
  questClosed: (questIndex: number, completed: boolean) => void
  /** Push already-completed quest indices (persisted progress) into the game. */
  syncCompletedQuests: (indices: number[]) => void
  /**
   * Start the world-finale boss battle. `won` is the outcome the quest
   * pass/fail results dictate; the level scene only honors this after every
   * rune of the world is completed.
   */
  startBossBattle: (won: boolean, bossName?: string) => void
}

/**
 * GameCanvas — mounts the Phaser game inside a Next.js client component.
 * Phaser is dynamically imported to avoid SSR issues (no window on server).
 */
export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(function GameCanvas(
  { worldId, levelId, characterId = 'warrior', onQuestTriggered, onXPUpdate, onBossResolved },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // The level scene registers its event listeners during create(); anything
  // emitted before 'level-ready' would be lost, so buffer the progress sync.
  const levelReadyRef = useRef(false)
  const pendingSyncRef = useRef<number[] | null>(null)
  const pendingBossRef = useRef<{ won: boolean; bossName?: string } | null>(null)
  // Callbacks live in refs so a re-render that recreates them (e.g. the page
  // tracking completed quests) never tears down and reboots the Phaser game —
  // that would wipe rune state and abort a boss transition mid-flight.
  const onQuestTriggeredRef = useRef(onQuestTriggered)
  const onXPUpdateRef = useRef(onXPUpdate)
  const onBossResolvedRef = useRef(onBossResolved)
  useEffect(() => {
    onQuestTriggeredRef.current = onQuestTriggered
    onXPUpdateRef.current = onXPUpdate
    onBossResolvedRef.current = onBossResolved
  })

  useImperativeHandle(ref, () => ({
    questClosed(questIndex: number, completed: boolean) {
      gameRef.current?.events.emit('quest-closed', { questIndex, completed })
    },
    syncCompletedQuests(indices: number[]) {
      if (levelReadyRef.current && gameRef.current) {
        gameRef.current.events.emit('quests-synced', indices)
      } else {
        pendingSyncRef.current = indices
      }
    },
    startBossBattle(won: boolean, bossName?: string) {
      // Buffered like the progress sync: a player who cleared the world in an
      // earlier session triggers the finale before the scene exists, and the
      // scene only honours it once its runes are all retired.
      if (levelReadyRef.current && gameRef.current) {
        gameRef.current.events.emit('boss-start', { won, bossName })
      } else {
        pendingBossRef.current = { won, bossName }
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

      game.events.on('xp-updated', (xp: number) => {
        onXPUpdateRef.current(xp)
      })

      game.events.on('boss-resolved', (result: { won: boolean; worldId: string }) => {
        onBossResolvedRef.current?.(result)
      })

      game.events.on('level-ready', () => {
        levelReadyRef.current = true
        // Runes first, then the finale — the scene refuses a boss start until
        // every rune of the world is retired.
        if (pendingSyncRef.current) {
          game?.events.emit('quests-synced', pendingSyncRef.current)
          pendingSyncRef.current = null
        }
        if (pendingBossRef.current) {
          game?.events.emit('boss-start', pendingBossRef.current)
          pendingBossRef.current = null
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
      pendingBossRef.current = null
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
