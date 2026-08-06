import Phaser from 'phaser'

export interface WorldNode {
  id: string
  title: string
  x: number
  y: number
  isUnlocked: boolean
  isCompleted: boolean
  theme: string
}

/**
 * WorldMapScene — the overworld map.
 * Displays all 6 worlds as nodes. Player clicks a node to enter that world.
 * Emits 'world-selected' event to the React layer via the game's EventEmitter.
 */
export class WorldMapScene extends Phaser.Scene {
  private worldNodes: WorldNode[] = []

  constructor() {
    super({ key: 'WorldMapScene' })
  }

  init(data: { worlds: WorldNode[] }) {
    this.worldNodes = data.worlds ?? []
  }

  create() {
    this.createBackground()
    this.createWorldNodes()
    this.createPathConnectors()
    this.createUI()
  }

  private createBackground() {
    // Parallax sky gradient
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0d0d2b).setOrigin(0)

    // Stars
    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, this.scale.width)
      const y = Phaser.Math.Between(0, this.scale.height * 0.7)
      const size = Phaser.Math.FloatBetween(0.5, 2)
      this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.3, 1))
    }
  }

  /** Node fill / stroke per progression state (Issue #5). */
  private static readonly NODE_COLORS = {
    locked: { fill: 0x2a2a3e, hover: 0x2a2a3e, stroke: 0x666688, label: '#666688' },
    unlocked: { fill: 0x7b5ea7, hover: 0x9b7ec7, stroke: 0xe8d5b7, label: '#e8d5b7' },
    completed: { fill: 0xffd700, hover: 0xfff3b0, stroke: 0xfff3b0, label: '#ffd700' },
  } as const

  private createWorldNodes() {
    const positions = [
      { x: 200, y: 500 },   // World 1: Origin Plains
      { x: 450, y: 350 },   // World 2: Wallet Kingdom
      { x: 650, y: 480 },   // World 3: Asset Forge
      { x: 850, y: 300 },   // World 4: Trading Bazaar
      { x: 1000, y: 450 },  // World 5: Payment Realm
      { x: 1150, y: 250 },  // World 6: Soroban Citadel
    ]

    const worldLabels = [
      'Origin Plains',
      'Wallet Kingdom',
      'Asset Forge',
      'Trading Bazaar',
      'Payment Realm',
      'Soroban Citadel',
    ]

    positions.forEach((pos, i) => {
      const world = this.worldNodes[i]
      // World 1 is always open; anything else follows the persisted progress
      // the React layer handed in.
      const isCompleted = world?.isCompleted ?? false
      const isUnlocked = isCompleted || (world?.isUnlocked ?? i === 0)
      const colors =
        WorldMapScene.NODE_COLORS[isCompleted ? 'completed' : isUnlocked ? 'unlocked' : 'locked']

      const node = this.add.circle(pos.x, pos.y, 36, colors.fill)
      node.setStrokeStyle(3, colors.stroke)

      // A cleared world is ticked, a locked one padlocked — the state reads at
      // a glance without hovering.
      const badge = isCompleted ? '✓' : isUnlocked ? '' : '🔒'
      if (badge) {
        this.add
          .text(pos.x, pos.y, badge, {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: isCompleted ? '#07071a' : '#8a8aa6',
          })
          .setOrigin(0.5)
      }

      const label = this.add.text(pos.x, pos.y + 52, world?.title ?? worldLabels[i] ?? '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: colors.label,
        align: 'center',
        wordWrap: { width: 100 },
      })
      label.setOrigin(0.5, 0)

      if (isUnlocked) {
        node.setInteractive({ cursor: 'pointer' })
        node.on('pointerover', () => node.setFillStyle(colors.hover))
        node.on('pointerout', () => node.setFillStyle(colors.fill))
        node.on('pointerdown', () => {
          // Emit to React layer
          this.game.events.emit('world-selected', { worldIndex: i, worldId: world?.id })
          this.cameras.main.flash(200, 123, 94, 167)
        })
      }
    })
  }

  private createPathConnectors() {
    const graphics = this.add.graphics()

    const positions = [
      { x: 200, y: 500 }, { x: 450, y: 350 }, { x: 650, y: 480 },
      { x: 850, y: 300 }, { x: 1000, y: 450 }, { x: 1150, y: 250 },
    ]

    for (let i = 0; i < positions.length - 1; i++) {
      const from = positions[i]!
      const to = positions[i + 1]!
      // A path lights up gold once the world it leads out of has been cleared.
      const cleared = this.worldNodes[i]?.isCompleted === true
      graphics.lineStyle(3, cleared ? 0xffd700 : 0x444466, cleared ? 0.9 : 0.8)
      graphics.lineBetween(from.x, from.y, to.x, to.y)
    }
  }

  private createUI() {
    this.add.text(this.scale.width / 2, 40, 'STELLAR LEARN', {
      fontFamily: '"Press Start 2P"',
      fontSize: '20px',
      color: '#e8d5b7',
    }).setOrigin(0.5)

    this.add.text(this.scale.width / 2, 72, 'Choose Your Destiny', {
      fontFamily: '"Press Start 2P"',
      fontSize: '9px',
      color: '#9b7ec7',
    }).setOrigin(0.5)
  }
}
