import { describe, expect, it } from 'vitest'
import { buildWorldMapNodes, sortWorlds } from './progression'
import {
  getNextWorld,
  getWorldById,
  getWorldBySlug,
  getWorldMapNodes,
  worlds,
  worldSlugs,
} from './index'
import type { Quest, World } from '../curriculum/types'

/**
 * The progression rules must hold for any number of registered worlds, so most
 * of these specs run against a synthesized curriculum of arbitrary length as
 * well as the real one.
 */

function makeQuest(worldId: string, n: number): Quest {
  return {
    id: `${worldId}-q${n}`,
    worldId,
    slug: `q${n}`,
    title: `Quest ${n}`,
    description: '',
    type: 'lesson',
    order: n,
    xpReward: 10,
    estimatedMinutes: 5,
    content: [],
  }
}

/** A curriculum of `count` worlds, each with `questsPer` quests. */
function makeWorlds(count: number, questsPer = 3): World[] {
  return Array.from({ length: count }, (_, i) => {
    const id = `world-${i + 1}`
    return {
      id,
      slug: `slug-${i + 1}`,
      title: `World ${i + 1}`,
      subtitle: '',
      description: '',
      theme: 'forest',
      order: i + 1,
      xpReward: 100,
      bossName: `Boss ${i + 1}`,
      bossDescription: '',
      quests: Array.from({ length: questsPer }, (_, q) => makeQuest(id, q + 1)),
    }
  })
}

describe('buildWorldMapNodes', () => {
  it('returns nothing for an empty registry', () => {
    expect(buildWorldMapNodes([])).toEqual([])
  })

  it('builds one node per world, indexed 0..N-1', () => {
    const nodes = buildWorldMapNodes(makeWorlds(25))
    expect(nodes).toHaveLength(25)
    expect(nodes.map((n) => n.index)).toEqual(Array.from({ length: 25 }, (_, i) => i))
  })

  it('opens only the first world for a player with no progress', () => {
    const nodes = buildWorldMapNodes(makeWorlds(10))
    expect(nodes[0]!.isUnlocked).toBe(true)
    expect(nodes[0]!.isCurrent).toBe(true)
    expect(nodes.slice(1).every((n) => !n.isUnlocked)).toBe(true)
    expect(nodes.every((n) => !n.isCompleted)).toBe(true)
  })

  it('unlocks exactly the world after the last completed one, at any N', () => {
    const source = makeWorlds(20)
    const nodes = buildWorldMapNodes(source, {
      completedWorldIds: source.slice(0, 12).map((w) => w.id),
    })

    expect(nodes.slice(0, 12).every((n) => n.isCompleted && n.isUnlocked)).toBe(true)
    expect(nodes[12]!.isUnlocked).toBe(true)
    expect(nodes[12]!.isCompleted).toBe(false)
    expect(nodes.slice(13).every((n) => !n.isUnlocked)).toBe(true)
  })

  it('marks exactly one world as current', () => {
    const source = makeWorlds(15)
    const nodes = buildWorldMapNodes(source, {
      completedWorldIds: source.slice(0, 4).map((w) => w.id),
    })
    expect(nodes.filter((n) => n.isCurrent)).toHaveLength(1)
    expect(nodes.find((n) => n.isCurrent)!.index).toBe(4)
  })

  it('infers completion when every quest of a world is done', () => {
    const source = makeWorlds(5)
    const nodes = buildWorldMapNodes(source, {
      completedQuestIds: source[0]!.quests.map((q) => q.id),
    })

    expect(nodes[0]!.isCompleted).toBe(true)
    expect(nodes[0]!.progressPercent).toBe(100)
    expect(nodes[1]!.isUnlocked).toBe(true)
  })

  it('keeps a partially played world open and reports its percentage', () => {
    const source = makeWorlds(5, 4)
    const nodes = buildWorldMapNodes(source, {
      completedQuestIds: source[0]!.quests.slice(0, 1).map((q) => q.id),
    })

    expect(nodes[0]!.isCompleted).toBe(false)
    expect(nodes[0]!.isUnlocked).toBe(true)
    expect(nodes[0]!.completedQuestCount).toBe(1)
    expect(nodes[0]!.progressPercent).toBe(25)
  })

  it('leaves a questless world incomplete rather than dividing by zero', () => {
    const [world] = makeWorlds(1)
    const nodes = buildWorldMapNodes([{ ...world!, quests: [] }])
    expect(nodes[0]!.progressPercent).toBe(0)
    expect(nodes[0]!.isCompleted).toBe(false)
  })

  it('reports no current world once the whole curriculum is cleared', () => {
    const source = makeWorlds(8)
    const nodes = buildWorldMapNodes(source, { completedWorldIds: source.map((w) => w.id) })

    expect(nodes.every((n) => n.isCompleted && n.isUnlocked)).toBe(true)
    expect(nodes.some((n) => n.isCurrent)).toBe(false)
  })

  it('orders by curriculum order regardless of registration order', () => {
    const source = makeWorlds(5)
    const shuffled = [source[4]!, source[0]!, source[3]!, source[1]!, source[2]!]
    expect(buildWorldMapNodes(shuffled).map((n) => n.order)).toEqual([1, 2, 3, 4, 5])
  })

  it('carries a hand-authored map position through, and omits it otherwise', () => {
    const [a, b] = makeWorlds(2)
    const nodes = buildWorldMapNodes([{ ...a!, mapPosition: { x: 120, y: 430 } }, b!])

    expect(nodes[0]!.position).toEqual({ x: 120, y: 430 })
    expect(nodes[1]!.position).toBeUndefined()
  })

  it('ignores progress referring to worlds that are not registered', () => {
    const nodes = buildWorldMapNodes(makeWorlds(3), {
      completedWorldIds: ['world-does-not-exist'],
      completedQuestIds: ['quest-does-not-exist'],
    })
    expect(nodes[0]!.isCompleted).toBe(false)
    expect(nodes[0]!.isUnlocked).toBe(true)
    expect(nodes.slice(1).every((n) => !n.isUnlocked)).toBe(true)
  })

  it('does not mutate the array it is given', () => {
    const source = makeWorlds(4)
    const order = source.map((w) => w.id)
    buildWorldMapNodes([...source].reverse())
    expect(source.map((w) => w.id)).toEqual(order)
  })
})

describe('sortWorlds', () => {
  it('sorts by order and breaks ties stably by id', () => {
    const source = makeWorlds(3).map((w) => ({ ...w, order: 1 }))
    expect(sortWorlds(source).map((w) => w.id)).toEqual(['world-1', 'world-2', 'world-3'])
  })
})

describe('the registered curriculum', () => {
  it('exposes a node for every registered world', () => {
    expect(getWorldMapNodes()).toHaveLength(worlds.length)
  })

  it('derives worldSlugs from the registry, in order', () => {
    expect(worldSlugs).toEqual(worlds.map((w) => w.slug))
  })

  it('opens world one and locks the rest for a new player', () => {
    const nodes = getWorldMapNodes()
    expect(nodes[0]!.isUnlocked).toBe(true)
    expect(nodes.slice(1).every((n) => !n.isUnlocked)).toBe(true)
  })

  it('unlocks the second world once the first is cleared', () => {
    const nodes = getWorldMapNodes({ completedWorldIds: [worlds[0]!.id] })
    expect(nodes[0]!.isCompleted).toBe(true)
    expect(nodes[1]!.isUnlocked).toBe(true)
  })

  it('keeps every world id and slug unique', () => {
    expect(new Set(worlds.map((w) => w.id)).size).toBe(worlds.length)
    expect(new Set(worlds.map((w) => w.slug)).size).toBe(worlds.length)
  })

  it('looks worlds up by slug and id', () => {
    expect(getWorldBySlug(worlds[0]!.slug)?.id).toBe(worlds[0]!.id)
    expect(getWorldById(worlds[0]!.id)?.slug).toBe(worlds[0]!.slug)
    expect(getWorldBySlug('not-a-world')).toBeUndefined()
    expect(getWorldById('not-a-world')).toBeUndefined()
  })

  it('chains through the curriculum and stops at the end', () => {
    expect(getNextWorld(worlds[0]!.id)?.id).toBe(worlds[1]!.id)
    expect(getNextWorld(worlds[worlds.length - 1]!.id)).toBeUndefined()
    expect(getNextWorld('not-a-world')).toBeUndefined()
  })
})
