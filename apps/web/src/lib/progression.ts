import { getNextWorld, getWorldBySlug, getWorldMapNodes, type WorldMapNode } from '@stellar-learn/content'

/**
 * Web-side adapter over the curriculum's progression module.
 *
 * The lock/unlock rules are **not** implemented here. They live in
 * `@stellar-learn/content` (`buildWorldMapNodes`), which the Phaser world map
 * and this app both consume, so there is exactly one answer to "which world is
 * locked". This module only does the two things that are genuinely web-side:
 *
 *  1. translate between the *slugs* the routes and the progress table use and
 *     the *ids* the curriculum nodes are keyed by, and
 *  2. answer "where does the player go after a boss battle".
 */
export type WorldStatus = 'locked' | 'unlocked' | 'completed'

export interface WorldState extends WorldMapNode {
  /** The node's `isUnlocked`/`isCompleted` pair flattened for rendering. */
  status: WorldStatus
  /** Slug of the world this one leads to, or null at the end of the journey. */
  nextSlug: string | null
}

/** True when `slug` names a registered curriculum world. */
export function isKnownWorld(slug: string): boolean {
  return getWorldBySlug(slug) !== undefined
}

/** The world that follows `slug`, or null if it is the last one. */
export function nextWorldSlug(slug: string): string | null {
  const world = getWorldBySlug(slug)
  if (!world) return null
  return getNextWorld(world.id)?.slug ?? null
}

/**
 * Resolve every world's state from the set of worlds the player has *cleared*.
 *
 * Only cleared worlds are passed down, deliberately: `buildWorldMapNodes` also
 * treats "every quest done" as a completed world, but under the progression
 * loop (Issue #5) a world is cleared by defeating its boss, not by finishing
 * its quests — a player who answered everything and still lost the boss has
 * not earned the next world. Feeding quest ids in here would unlock it anyway.
 */
export function computeWorldStates(completedSlugs: Iterable<string>): WorldState[] {
  const completedWorldIds = [...completedSlugs]
    .map((slug) => getWorldBySlug(slug)?.id)
    .filter((id): id is string => id !== undefined)

  return getWorldMapNodes({ completedWorldIds }).map((node) => ({
    ...node,
    status: node.isCompleted ? 'completed' : node.isUnlocked ? 'unlocked' : 'locked',
    nextSlug: getNextWorld(node.id)?.slug ?? null,
  }))
}

/**
 * Where the player goes after a boss battle: a win advances to the next world,
 * a loss keeps them in the one they just lost so they can retry the material.
 * Past the last registered world there is nowhere to advance to.
 */
export function routeAfterBoss(slug: string, won: boolean): string {
  if (!won) return `/world/${slug}/level/1`
  const next = nextWorldSlug(slug)
  return next ? `/world/${next}/level/1` : '/dashboard'
}
