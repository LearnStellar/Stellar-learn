import { describe, expect, it } from 'vitest'

import type { Level, Quest, World } from '../curriculum/types'
import {
  getLevel,
  world1,
  world2,
  world13,
  worldLevels,
  worldQuests,
  worlds,
  worldSlugs,
} from './index'

/**
 * These tests lock down the registry's behaviour, not the curriculum's current
 * word count: they assert invariants that must hold however many worlds are
 * registered, so adding World 14 does not break them, while a world registered
 * twice, registered out of order, or dropped from `worldSlugs` does.
 */

/** A quest fixture carrying only the fields the registry helpers read. */
function makeQuest(id: string, worldId = 'world-test'): Quest {
  return {
    id,
    worldId,
    slug: id,
    title: `Quest ${id}`,
    description: 'A test quest.',
    type: 'lesson',
    order: 1,
    xpReward: 10,
    estimatedMinutes: 5,
    content: [],
  }
}

/** A level fixture holding the given quests. */
function makeLevel(slug: string, quests: Quest[], worldId = 'world-test'): Level {
  return {
    id: `${worldId}-level-${slug}`,
    worldId,
    slug,
    title: `Level ${slug}`,
    description: 'A test level.',
    order: Number(slug),
    quests,
  }
}

/** A world fixture in whichever of the two authoring shapes is passed in. */
function makeWorld(shape: Pick<World, 'quests' | 'levels'>): World {
  return {
    id: 'world-test',
    slug: 'test-world',
    title: 'Test World',
    subtitle: 'For tests',
    description: 'A world used only by the registry tests.',
    theme: 'forest',
    order: 99,
    xpReward: 100,
    bossName: 'The Test Boss',
    bossDescription: 'Guards the fixtures.',
    ...shape,
  }
}

describe('worlds', () => {
  it('registers at least the worlds the app ships with', () => {
    expect(worlds.length).toBeGreaterThan(0)
  })

  it('registers every world exactly once, by id and by slug', () => {
    expect(new Set(worlds.map((world) => world.id)).size).toBe(worlds.length)
    expect(new Set(worlds.map((world) => world.slug)).size).toBe(worlds.length)
  })

  it('is listed in curriculum order, with order matching position', () => {
    expect(worlds.map((world) => world.order)).toEqual(
      worlds.map((_world, index) => index + 1)
    )
  })

  it('exposes the same objects through the named exports', () => {
    expect(worlds[0]).toBe(world1)
    expect(worlds[1]).toBe(world2)
    expect(worlds[worlds.length - 1]).toBe(world13)
  })

  it('gives every world the fields the map and progression read', () => {
    for (const world of worlds) {
      expect(world.id).not.toBe('')
      expect(world.slug).not.toBe('')
      expect(world.title).not.toBe('')
      expect(world.bossName).not.toBe('')
      expect(world.xpReward).toBeGreaterThan(0)
    }
  })

  it('keeps every quest pointing at the world that owns it', () => {
    for (const world of worlds) {
      for (const quest of worldQuests(world)) {
        expect(quest.worldId).toBe(world.id)
      }
    }
  })
})

describe('worldSlugs', () => {
  it('derives from worlds, in the same order', () => {
    expect(worldSlugs).toEqual(worlds.map((world) => world.slug))
  })

  it('never hardcodes a world count', () => {
    expect(worldSlugs).toHaveLength(worlds.length)
  })

  it('resolves each slug back to exactly one world', () => {
    for (const slug of worldSlugs) {
      expect(worlds.filter((world) => world.slug === slug)).toHaveLength(1)
    }
  })
})

describe('resolving a world', () => {
  it('finds a world by its slug', () => {
    expect(worlds.find((world) => world.slug === 'origin-plains')).toBe(world1)
  })

  it('finds a world by its id', () => {
    expect(worlds.find((world) => world.id === world13.id)).toBe(world13)
  })

  it('returns undefined for a slug that is not registered', () => {
    expect(worlds.find((world) => world.slug === 'no-such-world')).toBeUndefined()
  })

  it('returns undefined for an id that is not registered', () => {
    expect(worlds.find((world) => world.id === 'world-99-nowhere')).toBeUndefined()
  })

  it('returns undefined for an empty slug', () => {
    expect(worlds.find((world) => world.slug === '')).toBeUndefined()
  })

  it('matches slugs exactly, so a differently cased slug misses', () => {
    expect(worlds.find((world) => world.slug === 'Origin-Plains')).toBeUndefined()
  })
})

describe('worldQuests', () => {
  it('flattens a levelled world into one quest list, in level order', () => {
    const levels = world1.levels ?? []
    expect(levels.length).toBeGreaterThan(0)
    expect(worldQuests(world1)).toEqual(levels.flatMap((level) => level.quests))
  })

  it('returns the flat quest list for a world authored without levels', () => {
    expect(world2.levels).toBeUndefined()
    expect(worldQuests(world2)).toEqual(world2.quests)
  })

  it('prefers levels over a flat list when a world carries both', () => {
    const levelQuest = makeQuest('from-level')
    const flatQuest = makeQuest('from-flat')
    const world = makeWorld({
      levels: [makeLevel('1', [levelQuest])],
      quests: [flatQuest],
    })

    expect(worldQuests(world)).toEqual([levelQuest])
  })

  it('falls back to the flat list when levels is empty', () => {
    const flatQuest = makeQuest('from-flat')
    const world = makeWorld({ levels: [], quests: [flatQuest] })

    expect(worldQuests(world)).toEqual([flatQuest])
  })

  it('returns an empty list for a world with neither shape', () => {
    expect(worldQuests(makeWorld({}))).toEqual([])
  })

  it('returns a quest for every registered world', () => {
    for (const world of worlds) {
      expect(worldQuests(world).length).toBeGreaterThan(0)
    }
  })
})

describe('worldLevels', () => {
  it('returns the levels a levelled world authored, untouched', () => {
    expect(worldLevels(world1)).toBe(world1.levels)
  })

  it('synthesizes a single implicit level for a flat world', () => {
    const quest = makeQuest('only-quest')
    const world = makeWorld({ quests: [quest] })

    expect(worldLevels(world)).toEqual([
      {
        id: 'world-test-level-1',
        worldId: 'world-test',
        slug: '1',
        title: 'Level 1',
        description: world.description,
        order: 1,
        quests: [quest],
      },
    ])
  })

  it('returns an empty list for a world with neither shape', () => {
    expect(worldLevels(makeWorld({}))).toEqual([])
  })

  it('returns an empty list for a world whose flat quest list is empty', () => {
    expect(worldLevels(makeWorld({ quests: [] }))).toEqual([])
  })

  it('gives every registered world at least one level to render', () => {
    for (const world of worlds) {
      expect(worldLevels(world).length).toBeGreaterThan(0)
    }
  })
})

describe('getLevel', () => {
  it('finds an authored level by its slug', () => {
    const levels = world1.levels ?? []
    const target = levels[1]
    expect(target).toBeDefined()
    expect(getLevel(world1, target.slug)).toBe(target)
  })

  it('finds the implicit level of a flat world under slug "1"', () => {
    expect(getLevel(world2, '1')).toEqual(worldLevels(world2)[0])
  })

  it('returns undefined for a slug the world does not have', () => {
    expect(getLevel(world1, 'no-such-level')).toBeUndefined()
  })

  it('returns undefined for a level number past the end of the world', () => {
    expect(getLevel(world2, '2')).toBeUndefined()
  })

  it('returns undefined for a world with no levels and no quests', () => {
    expect(getLevel(makeWorld({}), '1')).toBeUndefined()
  })

  it('compares slugs as strings, so a numeric level id misses', () => {
    expect(getLevel(world2, 1 as unknown as string)).toBeUndefined()
  })

  it('resolves every level slug it reports for every world', () => {
    for (const world of worlds) {
      for (const level of worldLevels(world)) {
        expect(getLevel(world, level.slug)).toEqual(level)
      }
    }
  })
})
