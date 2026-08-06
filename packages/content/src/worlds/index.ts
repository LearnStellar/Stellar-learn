import { world1 } from './world-1-origin-plains'
import { world2 } from './world-2-wallet-kingdom'
import { world3 } from './world-3-asset-forge'
import {
  buildWorldMapNodes,
  sortWorlds,
  type WorldMapNode,
  type WorldProgress,
} from './progression'
import type { World } from '../curriculum/types'

/**
 * The world registry — the one place a world is registered.
 *
 * To add a world: create `world-N-<slug>.ts`, import it above, and add it to
 * this array. It then appears on the world map, in progression, in the
 * database seed and in `worldSlugs` automatically — nothing downstream
 * hardcodes a world count or a per-world position.
 */
export const worlds: World[] = sortWorlds([world1, world2, world3])

export { world1, world2, world3 }

/** Every registered world's slug, in curriculum order. */
export const worldSlugs: string[] = worlds.map((world) => world.slug)
export type WorldSlug = string

export function getWorldBySlug(slug: string): World | undefined {
  return worlds.find((world) => world.slug === slug)
}

export function getWorldById(id: string): World | undefined {
  return worlds.find((world) => world.id === id)
}

/** The next world in curriculum order, or `undefined` past the last one. */
export function getNextWorld(id: string): World | undefined {
  const index = worlds.findIndex((world) => world.id === id)
  return index === -1 ? undefined : worlds[index + 1]
}

/**
 * The registered worlds with lock/complete state resolved against `progress`.
 * This is what the world map renders — see `buildWorldMapNodes` for the rules.
 */
export function getWorldMapNodes(progress: WorldProgress = {}): WorldMapNode[] {
  return buildWorldMapNodes(worlds, progress)
}

export { buildWorldMapNodes, sortWorlds }
export type { WorldMapNode, WorldProgress }
