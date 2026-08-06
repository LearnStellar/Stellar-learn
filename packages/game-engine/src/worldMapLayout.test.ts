import { describe, expect, it } from 'vitest'
import { GAME_HEIGHT, GAME_WIDTH } from './dimensions'
import { NODE_LABEL_GAP, layoutWorldNodes, type PlacedWorldNode } from './worldMapLayout'

/**
 * These specs lock in the guarantee the world map depends on: however many
 * worlds are registered, no two nodes collide and nothing leaves the canvas.
 * They are the reason the map can grow past six worlds without hand-placed
 * coordinates, so they should keep passing for any future layout tweak.
 */

/** Matches the label the scene draws: two lines, wrapped, under the circle. */
const LABEL_LINES = 2
const LINE_HEIGHT = 1.6

/** The full box a node occupies on screen — the circle plus its label. */
function boxOf(node: PlacedWorldNode) {
  const halfWidth = Math.max(node.radius, node.labelWidth / 2)
  return {
    left: node.x - halfWidth,
    right: node.x + halfWidth,
    top: node.y - node.radius,
    bottom: node.y + node.radius + NODE_LABEL_GAP + LABEL_LINES * node.fontSize * LINE_HEIGHT,
  }
}

type Box = ReturnType<typeof boxOf>

function intersects(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

/** Every world count the map should survive, exercised individually. */
const COUNTS = Array.from({ length: 40 }, (_, i) => i + 1)

describe('layoutWorldNodes', () => {
  it('returns nothing for a count of zero or less', () => {
    expect(layoutWorldNodes(0)).toEqual([])
    expect(layoutWorldNodes(-5)).toEqual([])
  })

  it.each(COUNTS)('places exactly %i node(s)', (count) => {
    expect(layoutWorldNodes(count)).toHaveLength(count)
  })

  it.each(COUNTS)('never overlaps any two nodes at N=%i', (count) => {
    const boxes = layoutWorldNodes(count).map(boxOf)

    const collisions: string[] = []
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        if (intersects(boxes[i]!, boxes[j]!)) collisions.push(`${i}<->${j}`)
      }
    }

    expect(collisions).toEqual([])
  })

  it.each(COUNTS)('keeps every node and its label on screen at N=%i', (count) => {
    for (const box of layoutWorldNodes(count).map(boxOf)) {
      expect(box.left).toBeGreaterThanOrEqual(0)
      expect(box.right).toBeLessThanOrEqual(GAME_WIDTH)
      expect(box.top).toBeGreaterThanOrEqual(0)
      expect(box.bottom).toBeLessThanOrEqual(GAME_HEIGHT)
    }
  })

  it.each(COUNTS)('never lets a node intrude into the title header at N=%i', (count) => {
    // The scene draws its title around y=40 and subtitle at y=72.
    for (const box of layoutWorldNodes(count).map(boxOf)) {
      expect(box.top).toBeGreaterThanOrEqual(90)
    }
  })

  it('keeps nodes at full size well past the original six worlds', () => {
    for (const count of [6, 12, 24]) {
      expect(layoutWorldNodes(count)[0]!.radius).toBe(36)
    }
  })

  it('shrinks nodes rather than overflowing once space runs out', () => {
    const roomy = layoutWorldNodes(6)[0]!.radius
    const cramped = layoutWorldNodes(200)[0]!.radius
    expect(cramped).toBeLessThan(roomy)
    // Still clamped to something visible rather than a zero-radius dot.
    expect(cramped).toBeGreaterThan(0)
  })

  it('scales the label font with the node and keeps it readable', () => {
    for (const count of COUNTS) {
      for (const node of layoutWorldNodes(count)) {
        expect(node.fontSize).toBeGreaterThanOrEqual(6)
        expect(node.fontSize).toBeLessThanOrEqual(10)
      }
    }
  })

  it('lays a single world out in the middle of the map', () => {
    const [only] = layoutWorldNodes(1)
    expect(only!.x).toBeCloseTo(GAME_WIDTH / 2)
  })

  it('runs rows serpentine so the connecting trail never snaps back', () => {
    const paddingX = 90
    const nodes = layoutWorldNodes(12, { width: GAME_WIDTH, height: GAME_HEIGHT, paddingX })
    const usableWidth = GAME_WIDTH - paddingX * 2

    // 12 worlds wrap onto more than one row (a single row could only ever
    // spread the nodes by the zigzag offset, which is far less than this).
    const ys = nodes.map((n) => n.y)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(100)

    // In a serpentine the biggest horizontal step between consecutive worlds
    // is one cell, because each row reverses and the row change happens in
    // place. A naive left-to-right grid would jump most of the map width back
    // at every row end.
    const xs = nodes.map((n) => n.x)
    const biggestStep = Math.max(...xs.slice(1).map((x, i) => Math.abs(x - xs[i]!)))
    expect(biggestStep).toBeLessThan(usableWidth / 2)
  })

  it('honours a custom canvas size', () => {
    const nodes = layoutWorldNodes(8, { width: 800, height: 600 })
    for (const box of nodes.map(boxOf)) {
      expect(box.left).toBeGreaterThanOrEqual(0)
      expect(box.right).toBeLessThanOrEqual(800)
      expect(box.bottom).toBeLessThanOrEqual(600)
    }
  })

  it('is deterministic, so the map does not reshuffle between renders', () => {
    expect(layoutWorldNodes(9)).toEqual(layoutWorldNodes(9))
  })
})
