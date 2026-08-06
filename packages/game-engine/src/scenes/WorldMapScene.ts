import Phaser from 'phaser'
import { NODE_LABEL_GAP, layoutWorldNodes, type PlacedWorldNode } from '../worldMapLayout'

/**
 * One world as the map draws it. Structurally the same shape the content
 * package's `getWorldMapNodes()` produces — curriculum lives in
 * `@stellar-learn/content`, which the engine deliberately does not import, so
 * the host passes the resolved nodes in.
 */
export interface WorldNode {
  id: string
  title: string
  isUnlocked: boolean
  isCompleted: boolean
  theme: string
  slug?: string
  order?: number
  /** The first unlocked, unfinished world — drawn with a pulse. */
  isCurrent?: boolean
  /** Pin the node here instead of letting the map auto-arrange it. */
  position?: { x: number; y: number }
}

interface NodePalette {
  fill: number
  hover: number
  stroke: number
  label: string
}

const PALETTE: Record<'completed' | 'unlocked' | 'locked', NodePalette> = {
  completed: { fill: 0xffd700, hover: 0xfff3b0, stroke: 0xfff3b0, label: '#ffd700' },
  unlocked: { fill: 0x7b5ea7, hover: 0x9b7ec7, stroke: 0x9b7ec7, label: '#e8d5b7' },
  locked: { fill: 0x2a2a3e, hover: 0x2a2a3e, stroke: 0x6b7280, label: '#7a7a96' },
}

const PATH_DONE = 0xffd700
const PATH_PENDING = 0x3a3a5e

function paletteFor(world: WorldNode): NodePalette {
  if (world.isCompleted) return PALETTE.completed
  return world.isUnlocked ? PALETTE.unlocked : PALETTE.locked
}

/**
 * WorldMapScene — the overworld map.
 *
 * Renders one node per world in whatever list the host supplies, at any
 * length: positions come from `layoutWorldNodes` (or from a world that pins
 * itself), and locked / unlocked / completed styling comes from the progress
 * already resolved into each node. Registering a new world in the content
 * package is therefore enough for it to show up here — this scene never needs
 * editing to grow the curriculum.
 *
 * Clicking an unlocked node emits `world-selected` to the React layer via the
 * game's EventEmitter.
 */
export class WorldMapScene extends Phaser.Scene {
  private worldNodes: WorldNode[] = []
  private placements: PlacedWorldNode[] = []

  constructor() {
    super({ key: 'WorldMapScene' })
  }

  init(data: { worlds?: WorldNode[] }) {
    this.worldNodes = data?.worlds ?? []
  }

  create() {
    this.createBackground()
    this.createUI()

    if (this.worldNodes.length === 0) {
      this.createEmptyState()
      return
    }

    this.placements = this.resolvePlacements()
    // Connectors first so the trail passes under the nodes, not over them.
    this.createPathConnectors()
    this.createWorldNodes()
  }

  /**
   * Auto-arrange every node, then let any world that pinned itself via
   * `mapPosition` override its coordinates while keeping the shared sizing.
   */
  private resolvePlacements(): PlacedWorldNode[] {
    const auto = layoutWorldNodes(this.worldNodes.length, {
      width: this.scale.width,
      height: this.scale.height,
    })

    return auto.map((placed, i) => {
      const pinned = this.worldNodes[i]?.position
      return pinned ? { ...placed, x: pinned.x, y: pinned.y } : placed
    })
  }

  private createBackground() {
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0d0d2b).setOrigin(0)

    // Stars
    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, this.scale.width)
      const y = Phaser.Math.Between(0, this.scale.height * 0.7)
      const size = Phaser.Math.FloatBetween(0.5, 2)
      this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.3, 1))
    }
  }

  private createWorldNodes() {
    this.worldNodes.forEach((world, i) => {
      const placed = this.placements[i]
      if (!placed) return

      const palette = paletteFor(world)
      const node = this.add.circle(placed.x, placed.y, placed.radius, palette.fill)
      node.setStrokeStyle(Math.max(2, Math.round(placed.radius / 12)), palette.stroke)

      // Worlds are numbered by curriculum order, falling back to map position
      // so an unordered list still reads 1..N.
      const number = world.order ?? i + 1
      const label = this.add.text(
        placed.x,
        placed.y + placed.radius + NODE_LABEL_GAP,
        `${number}. ${world.title}`,
        {
          fontFamily: '"Press Start 2P"',
          fontSize: `${placed.fontSize}px`,
          color: palette.label,
          align: 'center',
          wordWrap: { width: placed.labelWidth },
        }
      )
      label.setOrigin(0.5, 0)

      this.createNodeBadge(world, placed)

      if (!world.isUnlocked) return

      node.setInteractive({ cursor: 'pointer' })
      node.on('pointerover', () => node.setFillStyle(palette.hover))
      node.on('pointerout', () => node.setFillStyle(palette.fill))
      node.on('pointerdown', () => {
        this.game.events.emit('world-selected', {
          worldIndex: i,
          worldId: world.id,
          worldSlug: world.slug,
        })
        this.cameras.main.flash(200, 123, 94, 167)
      })

      if (world.isCurrent) {
        this.tweens.add({
          targets: node,
          scale: 1.12,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
      }
    })
  }

  /** The small corner marker: a tick on cleared worlds, a lock on closed ones. */
  private createNodeBadge(world: WorldNode, placed: PlacedWorldNode) {
    const badge = world.isCompleted ? '✓' : world.isUnlocked ? '' : '✕'
    if (!badge) return

    const offset = placed.radius * 0.72
    this.add
      .text(placed.x + offset, placed.y - offset, badge, {
        fontFamily: '"Press Start 2P"',
        fontSize: `${Math.max(7, Math.round(placed.radius / 3))}px`,
        color: world.isCompleted ? '#ffd700' : '#7a7a96',
      })
      .setOrigin(0.5)
  }

  private createPathConnectors() {
    const graphics = this.add.graphics()

    // One segment per consecutive pair, so the trail spans however many worlds
    // there are. A segment lights up once the world it leaves is cleared.
    for (let i = 0; i < this.placements.length - 1; i++) {
      const from = this.placements[i]
      const to = this.placements[i + 1]
      if (!from || !to) continue

      const cleared = this.worldNodes[i]?.isCompleted ?? false
      graphics.lineStyle(
        Math.max(2, Math.round(from.radius / 12)),
        cleared ? PATH_DONE : PATH_PENDING,
        cleared ? 0.9 : 0.6
      )
      graphics.lineBetween(from.x, from.y, to.x, to.y)
    }
  }

  private createEmptyState() {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'No worlds available yet', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#7a7a96',
        align: 'center',
      })
      .setOrigin(0.5)
  }

  private createUI() {
    this.add
      .text(this.scale.width / 2, 40, 'STELLAR LEARN', {
        fontFamily: '"Press Start 2P"',
        fontSize: '20px',
        color: '#e8d5b7',
      })
      .setOrigin(0.5)

    this.add
      .text(this.scale.width / 2, 72, 'Choose Your Destiny', {
        fontFamily: '"Press Start 2P"',
        fontSize: '9px',
        color: '#9b7ec7',
      })
      .setOrigin(0.5)
  }
}
