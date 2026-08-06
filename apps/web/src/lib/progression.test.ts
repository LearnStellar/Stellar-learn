import { describe, expect, it } from 'vitest'
import {
  WORLD_ORDER,
  computeWorldStates,
  isKnownWorld,
  nextWorldSlug,
  routeAfterBoss,
} from './progression'

const statuses = (completed: string[]) =>
  computeWorldStates(completed).map((world) => `${world.slug}:${world.status}`)

describe('nextWorldSlug', () => {
  it('walks the curriculum order', () => {
    expect(nextWorldSlug('origin-plains')).toBe('wallet-kingdom')
    expect(nextWorldSlug('wallet-kingdom')).toBe('asset-forge')
  })

  it('returns null at the end of the journey and for unknown worlds', () => {
    expect(nextWorldSlug(WORLD_ORDER[WORLD_ORDER.length - 1] as string)).toBeNull()
    expect(nextWorldSlug('nowhere-land')).toBeNull()
  })
})

describe('isKnownWorld', () => {
  it('accepts curriculum slugs only', () => {
    expect(isKnownWorld('origin-plains')).toBe(true)
    expect(isKnownWorld('nowhere-land')).toBe(false)
  })
})

describe('computeWorldStates', () => {
  it('opens the first world and locks the rest for a new player', () => {
    expect(statuses([])).toEqual([
      'origin-plains:unlocked',
      'wallet-kingdom:locked',
      'asset-forge:locked',
      'trading-bazaar:locked',
      'payment-realm:locked',
      'soroban-citadel:locked',
    ])
  })

  it('unlocks the next world once the previous one is cleared', () => {
    expect(statuses(['origin-plains']).slice(0, 3)).toEqual([
      'origin-plains:completed',
      'wallet-kingdom:unlocked',
      'asset-forge:locked',
    ])
  })

  it('never unlocks a world whose predecessor is still uncleared', () => {
    // Clearing world 2 out of order must not leak an unlock past world 3.
    expect(statuses(['wallet-kingdom'])).toEqual([
      'origin-plains:unlocked',
      'wallet-kingdom:completed',
      'asset-forge:unlocked',
      'trading-bazaar:locked',
      'payment-realm:locked',
      'soroban-citadel:locked',
    ])
  })

  it('flags which worlds actually have authored quests', () => {
    const states = computeWorldStates([])
    expect(states.find((w) => w.slug === 'origin-plains')?.hasContent).toBe(true)
    expect(states.find((w) => w.slug === 'trading-bazaar')?.hasContent).toBe(false)
  })
})

describe('routeAfterBoss', () => {
  it('advances to the next world on a win', () => {
    expect(routeAfterBoss('origin-plains', true)).toBe('/world/wallet-kingdom/level/1')
  })

  it('skips worlds that have no curriculum yet', () => {
    // World 3 is the last authored world, so a win there has nowhere to go.
    expect(routeAfterBoss('asset-forge', true)).toBe('/dashboard')
  })

  it('keeps the player in the same world on a loss', () => {
    expect(routeAfterBoss('wallet-kingdom', false)).toBe('/world/wallet-kingdom/level/1')
  })
})
