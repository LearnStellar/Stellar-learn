import { describe, expect, it } from 'vitest'
import {
  worlds,
  worldSlugs,
  worldQuests,
  worldLevels,
  getLevel,
  world1,
  world13,
} from './index'
import type { World } from '../curriculum/types'

/**
 * Unit tests for the world/content registry helpers (issue #100).
 *
 * The registry (`packages/content/src/worlds/index.ts`) is the single place a
 * world is registered. Everything downstream — the world map, progression, and
 * `worldSlugs` — reads from the `worlds` array, so locking down its shape and
 * ordering catches regressions before they ripple through the app.
 */

describe('worlds registry', () => {
  it('registers 13 worlds in curriculum order', () => {
    expect(worlds).toHaveLength(13)
    expect(worlds.map((w) => w.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
  })

  it('starts with the Origin Plains tutorial world and ends with the final world', () => {
    expect(worlds[0].slug).toBe('origin-plains')
    expect(worlds[0].title).toBe('The Origin Plains')
    expect(worlds[12].slug).toBe('deployment-depths')
    // Every world carries the fields the app renders
    for (const world of worlds) {
      expect(world.id).toMatch(/^world-\d+-/)
      expect(world.slug).toBeTruthy()
      expect(world.title).toBeTruthy()
      expect(world.theme).toBeTruthy()
      expect(world.bossName).toBeTruthy()
      expect(world.xpReward).toBeGreaterThan(0)
    }
  })

  it('resolves a world by slug', () => {
    const originPlains = worlds.find((w) => w.slug === 'origin-plains')
    expect(originPlains).toBeDefined()
    expect(originPlains?.id).toBe('world-1-origin-plains')
  })

  it('resolves a world by id', () => {
    const gateway = worlds.find((w) => w.id === 'world-10-soroban-gateway')
    expect(gateway).toBeDefined()
    expect(gateway?.slug).toBe('soroban-gateway')
  })

  it('returns undefined (not-found) for unknown slugs and ids', () => {
    expect(worlds.find((w) => w.slug === 'unknown-world')).toBeUndefined()
    expect(worlds.find((w) => w.id === 'world-99-nonexistent')).toBeUndefined()
  })

  it('worldSlugs derives from worlds in the same order', () => {
    expect(worldSlugs).toHaveLength(worlds.length)
    expect(worldSlugs).toEqual(worlds.map((w) => w.slug))
    // spot-check first/last ordering
    expect(worldSlugs[0]).toBe('origin-plains')
    expect(worldSlugs[worldSlugs.length - 1]).toBe('deployment-depths')
  })
})

describe('worldQuests', () => {
  it('flattens quests from a levels-shaped world (world1)', () => {
    const quests = worldQuests(world1)
    // world1 is authored as 12 levels × 5 quests
    expect(world1.levels).toHaveLength(12)
    expect(quests.length).toBeGreaterThan(0)
    expect(quests.length).toBe(world1.levels!.reduce((acc, l) => acc + l.quests.length, 0))
    for (const quest of quests) {
      expect(quest.worldId).toBe(world1.id)
      expect(quest.type).toBeTruthy()
      expect(quest.order).toBeGreaterThan(0)
    }
  })

  it('returns the flat quests for a legacy flat-shaped world', () => {
    // world13 is authored in the legacy flat `quests` shape
    const quests = worldQuests(world13)
    expect(quests.length).toBeGreaterThan(0)
    expect(quests.length).toBe(world13.quests!.length)
    // No implicit levels shape is introduced by the accessor
    expect(world13.levels).toBeUndefined()
  })

  it('returns an empty array when a world has neither shape', () => {
    const emptyWorld: World = {
      id: 'world-empty',
      slug: 'empty',
      title: 'Empty',
      subtitle: '',
      description: '',
      theme: 'forest',
      order: 99,
      xpReward: 0,
      bossName: '',
      bossDescription: '',
    }
    expect(worldQuests(emptyWorld)).toEqual([])
  })
})

describe('worldLevels', () => {
  it('returns authored levels for a levels-shaped world', () => {
    const levels = worldLevels(world1)
    expect(levels).toBe(world1.levels)
    expect(levels).toHaveLength(12)
    expect(levels[0].slug).toBeTruthy()
  })

  it('synthesizes a single implicit level for a flat quests world', () => {
    const levels = worldLevels(world13)
    expect(levels).toHaveLength(1)
    expect(levels[0].id).toBe(`${world13.id}-level-1`)
    expect(levels[0].worldId).toBe(world13.id)
    expect(levels[0].quests).toEqual(world13.quests)
    expect(levels[0].order).toBe(1)
  })

  it('returns an empty array when a world has no quests at all', () => {
    const emptyWorld: World = {
      id: 'world-empty',
      slug: 'empty',
      title: 'Empty',
      subtitle: '',
      description: '',
      theme: 'forest',
      order: 99,
      xpReward: 0,
      bossName: '',
      bossDescription: '',
    }
    expect(worldLevels(emptyWorld)).toEqual([])
  })
})

describe('getLevel', () => {
  it('finds a level by slug in a levels-shaped world', () => {
    const first = getLevel(world1, world1.levels![0].slug)
    expect(first).toBeDefined()
    expect(first?.id).toBe(world1.levels![0].id)
  })

  it('finds the synthesized level by slug in a flat world', () => {
    const level = getLevel(world13, '1')
    expect(level).toBeDefined()
    expect(level?.id).toBe(`${world13.id}-level-1`)
  })

  it('returns undefined for an unknown level slug', () => {
    expect(getLevel(world1, 'no-such-level')).toBeUndefined()
    expect(getLevel(world13, 'no-such-level')).toBeUndefined()
  })
})