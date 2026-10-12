import * as Phaser from 'phaser'
import { ART_MANIFEST, ASSET_KEYS } from '../config'

/**
 * BootScene — first scene loaded.
 * Loads all global assets (UI, shared sprites) then transitions to PreloadScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    // Progress bar while assets load
    this.createLoadingBar()

    // Only request asset groups the ART_MANIFEST says exist — otherwise 404.
    if (ART_MANIFEST.ui) {
      this.load.image(ASSET_KEYS.UI_XP_BAR, '/assets/ui/xp-bar.png')
      this.load.image(ASSET_KEYS.UI_HEALTH_BAR, '/assets/ui/health-bar.png')
    }

    if (ART_MANIFEST.effects) {
      this.load.spritesheet(ASSET_KEYS.FX_COIN, '/assets/effects/coin.png', {
        frameWidth: 32,
        frameHeight: 32,
      })
      this.load.spritesheet(ASSET_KEYS.FX_LEVELUP, '/assets/effects/levelup.png', {
        frameWidth: 64,
        frameHeight: 64,
      })
    }
  }

  create() {
    // Boot into whichever scene the host requested (set on the game registry
    // before boot). The world map is React UI (components/ui/WorldMap.tsx),
    // so Phaser only ever runs the level and boss scenes.
    const next = (this.registry.get('bootScene') as string | undefined) ?? 'LevelScene'
    const data = (this.registry.get('bootData') as object | undefined) ?? {}
    this.scene.start(next, data)
  }

  private createLoadingBar() {
    const { width, height } = this.cameras.main
    const barWidth = width * 0.6
    const barHeight = 20
    const x = (width - barWidth) / 2
    const y = height / 2

    const bg = this.add.rectangle(x, y, barWidth, barHeight, 0x222244)
    bg.setOrigin(0, 0.5)

    const bar = this.add.rectangle(x, y, 0, barHeight - 4, 0x7b5ea7)
    bar.setOrigin(0, 0.5)

    const logo = this.add.text(width / 2, y - 60, 'STELLAR LEARN', {
      fontFamily: '"Press Start 2P"',
      fontSize: '24px',
      color: '#e8d5b7',
    })
    logo.setOrigin(0.5)

    this.load.on('progress', (value: number) => {
      bar.width = (barWidth - 4) * value
    })
  }
}
