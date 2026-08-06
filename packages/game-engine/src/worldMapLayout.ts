import { GAME_HEIGHT, GAME_WIDTH } from './config'

/** A node's resolved place and size on the map. */
export interface PlacedWorldNode {
  x: number
  y: number
  radius: number
  /** Label font size in px, scaled with the node so text never outgrows it. */
  fontSize: number
  /** Word-wrap width for the label under the node. */
  labelWidth: number
}

export interface WorldMapLayoutOptions {
  width?: number
  height?: number
  /** Left/right margin. */
  paddingX?: number
  /** Space reserved at the top for the map title. */
  paddingTop?: number
  paddingBottom?: number
  maxRadius?: number
  minRadius?: number
}

/** Gap between a node's circle and the first line of its label. */
export const NODE_LABEL_GAP = 12

/**
 * Vertical space reserved under every node for its label: the gap below the
 * circle plus two lines at the largest font size the layout will pick. Sizing
 * against the maximum keeps the reservation valid whatever font a given count
 * ends up with.
 */
const LABEL_LINES = 2
const MAX_FONT_SIZE = 10
const LINE_HEIGHT = 1.6
const LABEL_BLOCK = NODE_LABEL_GAP + LABEL_LINES * MAX_FONT_SIZE * LINE_HEIGHT
/** Minimum breathing room between neighbouring nodes. */
const GAP_X = 20
const GAP_Y = 14

const DEFAULTS = {
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  paddingX: 90,
  paddingTop: 110,
  paddingBottom: 60,
  maxRadius: 36,
  minRadius: 12,
} satisfies Required<WorldMapLayoutOptions>

/**
 * How far a node is nudged off its row's centre line. Alternating the nudge
 * between columns gives the map its constellation zigzag instead of a flat
 * grid. Rows reserve `2 * zigzag` of slack (see `radiusFor`) so two nudged
 * neighbours in adjacent rows still cannot touch.
 */
function zigzagFor(cellHeight: number): number {
  return Math.min(cellHeight * 0.12, 30)
}

/**
 * Largest radius that fits `cols x rows` cells without any node — or its label
 * — overlapping a neighbour. Negative when the grid simply cannot fit.
 */
function radiusFor(cellWidth: number, cellHeight: number): number {
  const fromWidth = (cellWidth - GAP_X) / 2
  const fromHeight = (cellHeight - GAP_Y - LABEL_BLOCK - zigzagFor(cellHeight) * 2) / 2
  return Math.min(fromWidth, fromHeight)
}

/**
 * Auto-arrange `count` world nodes across the map.
 *
 * Nodes are laid out on a serpentine grid: left-to-right on even rows,
 * right-to-left on odd ones, so the path connecting them reads as one
 * continuous trail rather than snapping back at the end of every row. The
 * column count is chosen to maximise node size for the given count, which
 * keeps three worlds looking like a wide arc and twenty like a compact
 * constellation — with no hardcoded positions at any count.
 */
export function layoutWorldNodes(
  count: number,
  options: WorldMapLayoutOptions = {}
): PlacedWorldNode[] {
  if (count <= 0) return []

  const { width, height, paddingX, paddingTop, paddingBottom, maxRadius, minRadius } = {
    ...DEFAULTS,
    ...options,
  }

  const usableWidth = Math.max(1, width - paddingX * 2)
  const usableHeight = Math.max(1, height - paddingTop - paddingBottom)

  // Pick the column count that lets the nodes be largest. On a tie prefer more
  // columns (wider, shallower rows) — that reads better than a tall stack.
  let cols = 1
  let bestRadius = -Infinity
  for (let candidate = 1; candidate <= count; candidate++) {
    const rows = Math.ceil(count / candidate)
    const radius = Math.min(radiusFor(usableWidth / candidate, usableHeight / rows), maxRadius)
    if (radius >= bestRadius) {
      bestRadius = radius
      cols = candidate
    }
  }

  const rows = Math.ceil(count / cols)
  const cellWidth = usableWidth / cols
  const cellHeight = usableHeight / rows
  const zigzag = zigzagFor(cellHeight)
  // At extreme counts the ideal radius drops below what is still readable; clamp
  // there and accept tighter spacing rather than rendering invisible dots.
  const radius = Math.max(minRadius, Math.min(bestRadius, maxRadius))
  const fontSize = Math.max(6, Math.min(MAX_FONT_SIZE, Math.round(radius / 4.5)))
  const labelWidth = Math.max(60, Math.min(cellWidth - GAP_X, 140))

  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    // Serpentine: odd rows run backwards so the trail never jumps across.
    const slot = row % 2 === 0 ? col : cols - 1 - col

    return {
      x: paddingX + cellWidth * (slot + 0.5),
      // Shift up by half the label block so the node plus its label sit
      // centred in the cell, then nudge for the zigzag.
      y:
        paddingTop +
        cellHeight * (row + 0.5) -
        LABEL_BLOCK / 2 +
        (slot % 2 === 0 ? -zigzag : zigzag),
      radius,
      fontSize,
      labelWidth,
    }
  })
}
