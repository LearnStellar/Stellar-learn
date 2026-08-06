import type { World, WorldTheme } from '../curriculum/types'

/**
 * What the app knows about a player's progress. Both fields are optional so
 * callers can pass whatever they have — an anonymous player with no record at
 * all still gets a sensible map (world one open, the rest locked).
 */
export interface WorldProgress {
  /** Ids of worlds the player has cleared (boss defeated). */
  completedWorldIds?: readonly string[]
  /** Ids of individual quests the player has finished. */
  completedQuestIds?: readonly string[]
}

/**
 * One world as the map and progression UI need it: the curriculum fields worth
 * rendering, plus the lock/complete state derived from progress. This is the
 * shape both `WorldMapScene` and the React `WorldMap` consume, so neither has
 * to re-implement the progression rules.
 */
export interface WorldMapNode {
  id: string
  slug: string
  title: string
  subtitle: string
  theme: WorldTheme
  bossName: string
  /** The world's `order` field from the curriculum. */
  order: number
  /** Zero-based position in the ordered list — what the map draws against. */
  index: number
  questCount: number
  completedQuestCount: number
  /** 0-100, for progress bars. */
  progressPercent: number
  isUnlocked: boolean
  isCompleted: boolean
  /** The first unlocked world the player has not finished — where they are now. */
  isCurrent: boolean
  /** Set only when the world pins itself via `World.mapPosition`. */
  position?: { x: number; y: number }
}

/** Curriculum order, with a stable tiebreak so equal `order` values never shuffle. */
export function sortWorlds(source: readonly World[]): World[] {
  return [...source].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

/**
 * Derive the map nodes for an arbitrary number of worlds.
 *
 * The rules are positional rather than hardcoded per world, so they hold for
 * three worlds or thirty:
 *
 * - A world is **completed** when progress records it as cleared, or when every
 *   one of its quests is done.
 * - A world is **unlocked** when the world before it is completed. The first
 *   world is always unlocked, and any world with partial quest progress stays
 *   unlocked so a player can always resume where they left off.
 * - The **current** world is the first unlocked world that is not yet complete.
 *
 * Registering a new world in `worlds` is enough for it to appear here — and
 * therefore on the map — with no other changes.
 */
export function buildWorldMapNodes(
  source: readonly World[],
  progress: WorldProgress = {}
): WorldMapNode[] {
  const clearedWorlds = new Set(progress.completedWorldIds ?? [])
  const clearedQuests = new Set(progress.completedQuestIds ?? [])

  // The first world has no predecessor to gate it, so it starts open.
  let previousCompleted = true
  let foundCurrent = false

  return sortWorlds(source).map((world, index) => {
    const questCount = world.quests.length
    const completedQuestCount = world.quests.filter((quest) => clearedQuests.has(quest.id)).length

    const isCompleted =
      clearedWorlds.has(world.id) || (questCount > 0 && completedQuestCount === questCount)
    const isUnlocked = previousCompleted || isCompleted || completedQuestCount > 0
    const isCurrent = isUnlocked && !isCompleted && !foundCurrent

    if (isCurrent) foundCurrent = true
    previousCompleted = isCompleted

    return {
      id: world.id,
      slug: world.slug,
      title: world.title,
      subtitle: world.subtitle,
      theme: world.theme,
      bossName: world.bossName,
      order: world.order,
      index,
      questCount,
      completedQuestCount,
      progressPercent: questCount === 0 ? 0 : Math.round((completedQuestCount / questCount) * 100),
      isUnlocked,
      isCompleted,
      isCurrent,
      ...(world.mapPosition ? { position: world.mapPosition } : {}),
    }
  })
}
