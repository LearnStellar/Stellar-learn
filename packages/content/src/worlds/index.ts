import { world1 } from './world-1-origin-plains'
import { world2 } from './world-2-wallet-kingdom'
import { world3 } from './world-3-asset-forge'
import { world4 } from './world-4-reserve-reach'
import { world5 } from './world-5-anchor-anchorage'
import { world6 } from './world-6-trading-bazaar'
import { world7 } from './world-7-liquidity-lagoon'
import { world8 } from './world-8-payment-realm'
import { world9 } from './world-9-guardian-keep'
import { world10 } from './world-10-soroban-gateway'
import { world11 } from './world-11-contract-forge'
import { world12 } from './world-12-storage-sanctum'
import { world13 } from './world-13-deployment-depths'
import type { World, Quest, Level } from '../curriculum/types'

/**
 * The world registry — the single place a world is registered.
 *
 * To add a world: create `world-N-<slug>.ts`, import it above, and add it here
 * in curriculum order. Everything downstream (the world map, progression,
 * `worldSlugs`) reads from this array, so nothing hardcodes a world count.
 */
export const worlds: World[] = [
  world1,
  world2,
  world3,
  world4,
  world5,
  world6,
  world7,
  world8,
  world9,
  world10,
  world11,
  world12,
  world13,
]

export {
  world1,
  world2,
  world3,
  world4,
  world5,
  world6,
  world7,
  world8,
  world9,
  world10,
  world11,
  world12,
  world13,
}

/** Every registered world's slug, in curriculum order — derived from `worlds`. */
export const worldSlugs: string[] = worlds.map((world) => world.slug)
export type WorldSlug = string

/**
 * The flat list of a world's quests, regardless of whether it is authored in
 * the new `levels` shape or the legacy flat `quests` shape. This is the single
 * accessor consumers should use when they need "all quests in this world".
 */
export function worldQuests(world: World): Quest[] {
  if (world.levels && world.levels.length > 0) {
    return world.levels.flatMap((level) => level.quests)
  }
  return world.quests ?? []
}

/**
 * Minimum quests a world needs before it is shown as playable. One full level
 * is 5 quests; worlds below that are registered stubs and are surfaced in the
 * UI as "Coming soon" instead of being linked.
 */
export const MIN_PLAYABLE_QUESTS = 5

/** Whether a world has enough authored content to be offered to players. */
export function isWorldPlayable(world: World): boolean {
  return worldQuests(world).length >= MIN_PLAYABLE_QUESTS
}

/**
 * Whether a player has completed all quests in a world.
 */
export function isWorldCompleted(world: World, completedQuestIds: Set<string> | string[]): boolean {
  const completed =
    completedQuestIds instanceof Set ? completedQuestIds : new Set(completedQuestIds)
  const quests = worldQuests(world)
  if (quests.length === 0) return false
  return quests.every((quest) => completed.has(quest.id))
}

/**
 * Whether a world is unlocked for a player.
 * World 1 is always unlocked. Subsequent worlds unlock once the immediately
 * preceding playable world is completed.
 */
export function isWorldUnlocked(world: World, completedQuestIds: Set<string> | string[]): boolean {
  if (!isWorldPlayable(world)) return false
  const playableWorlds = worlds.filter(isWorldPlayable)
  const index = playableWorlds.findIndex((w) => w.id === world.id)
  if (index <= 0) return true
  const previousWorld = playableWorlds[index - 1]
  return previousWorld ? isWorldCompleted(previousWorld, completedQuestIds) : false
}

export interface WorldProgressSummary {
  worldId: string
  completedQuests: number
  totalQuests: number
  percentComplete: number
  isCompleted: boolean
  isUnlocked: boolean
}

/**
 * Derives comprehensive progress status for a given world.
 */
export function getWorldProgressSummary(
  world: World,
  completedQuestIds: Set<string> | string[]
): WorldProgressSummary {
  const completedSet =
    completedQuestIds instanceof Set ? completedQuestIds : new Set(completedQuestIds)
  const quests = worldQuests(world)
  const completedCount = quests.filter((q) => completedSet.has(q.id)).length
  const total = quests.length
  const percentComplete = total > 0 ? Math.round((completedCount / total) * 100) : 0
  const isDone = isWorldCompleted(world, completedSet)
  const isUnlocked = isWorldUnlocked(world, completedSet)

  return {
    worldId: world.id,
    completedQuests: completedCount,
    totalQuests: total,
    percentComplete,
    isCompleted: isDone,
    isUnlocked,
  }
}

/**
 * A world's levels in display order. Worlds still authored as a flat `quests`
 * list are treated as a single implicit level so the in-world map and the play
 * route behave identically for both shapes.
 */
export function worldLevels(world: World): Level[] {
  if (world.levels && world.levels.length > 0) return world.levels
  const quests = world.quests ?? []
  if (quests.length === 0) return []
  return [
    {
      id: `${world.id}-level-1`,
      worldId: world.id,
      slug: '1',
      title: 'Level 1',
      description: world.description,
      order: 1,
      quests,
    },
  ]
}

/** Find a single level by its slug (the `[levelId]` in the play route). */
export function getLevel(world: World, levelSlug: string): Level | undefined {
  return worldLevels(world).find((level) => level.slug === levelSlug)
}

/**
 * Find a quest anywhere in the curriculum by its id, across both the `levels`
 * and legacy flat `quests` shapes.
 *
 * This is how the server resolves a quest's authoritative `xpReward`: the
 * content package is the source of truth for curriculum, so an XP amount must
 * never be taken from a client request body.
 */
export function getQuestById(questId: string): Quest | undefined {
  for (const world of worlds) {
    const quest = worldQuests(world).find((candidate) => candidate.id === questId)
    if (quest) return quest
  }
  return undefined
}
