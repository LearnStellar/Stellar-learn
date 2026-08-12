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
import type { World } from '../curriculum/types'

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
