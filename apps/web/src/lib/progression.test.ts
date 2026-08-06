import { describe, expect, it } from 'vitest'
import { worlds } from '@stellar-learn/content'
import { computeWorldStates, isKnownWorld, nextWorldSlug, routeAfterBoss } from './progression'

const statuses = (completed: string[]) =>
  computeWorldStates(completed).map((world) => `${world.slug}:${world.status}`)

const lastSlug = worlds[worlds.length - 1]?.slug as string

describe('nextWorldSlug', () => {
  it('walks the curriculum order', () => {
    expect(nextWorldSlug('origin-plains')).toBe('wallet-kingdom')
    expect(nextWorldSlug('wallet-kingdom')).toBe('asset-forge')
  })

  it('returns null past the last registered world and for unknown worlds', () => {
    expect(nextWorldSlug(lastSlug)).toBeNull()
    expect(nextWorldSlug('nowhere-land')).toBeNull()
  })
})

describe('isKnownWorld', () => {
  it('accepts registered curriculum slugs only', () => {
    expect(isKnownWorld('origin-plains')).toBe(true)
    expect(isKnownWorld('nowhere-land')).toBe(false)
  })
})

describe('computeWorldStates', () => {
  it('covers every registered world, in curriculum order', () => {
    expect(computeWorldStates([]).map((world) => world.slug)).toEqual(worlds.map((w) => w.slug))
  })

  it('opens the first world and locks the rest for a new player', () => {
    expect(statuses([]).slice(0, 3)).toEqual([
      'origin-plains:unlocked',
      'wallet-kingdom:locked',
      'asset-forge:locked',
    ])
  })

  it('unlocks the next world once the previous one is cleared', () => {
    expect(statuses(['origin-plains']).slice(0, 3)).toEqual([
      'origin-plains:completed',
      'wallet-kingdom:unlocked',
      'asset-forge:locked',
    ])
  })

  it('ignores slugs that are not registered worlds', () => {
    expect(statuses(['nowhere-land'])).toEqual(statuses([]))
  })

  it('exposes the next world alongside each state', () => {
    const [first] = computeWorldStates([])
    expect(first?.nextSlug).toBe('wallet-kingdom')
    expect(computeWorldStates([]).at(-1)?.nextSlug).toBeNull()
  })
})

describe('routeAfterBoss', () => {
  it('advances to the next world on a win', () => {
    expect(routeAfterBoss('origin-plains', true)).toBe('/world/wallet-kingdom/level/1')
  })

  it('sends the player home after the last registered world', () => {
    expect(routeAfterBoss(lastSlug, true)).toBe('/dashboard')
  })

  it('keeps the player in the same world on a loss', () => {
    expect(routeAfterBoss('wallet-kingdom', false)).toBe('/world/wallet-kingdom/level/1')
  })
})
