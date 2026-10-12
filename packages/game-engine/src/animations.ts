import * as Phaser from 'phaser'
import type { SheetAnim } from './config'

/**
 * Register `<prefix>-<anim>` animations for a loaded spritesheet.
 * A multi-frame spritesheet is required. With only a single-frame
 * placeholder (no art yet) we skip animations and show the static sprite —
 * creating zero-frame animations would crash Phaser when played.
 *
 * Shared by LevelScene and BossScene; the animation manager is global, so
 * whichever scene runs first registers the keys and the guard makes the
 * second call a no-op.
 */
export function createSheetAnimations(
  scene: Phaser.Scene,
  textureKey: string,
  prefix: string,
  anims: Record<string, SheetAnim>
) {
  if (!scene.textures.exists(textureKey) || scene.textures.get(textureKey).frameTotal <= 1) return

  Object.entries(anims).forEach(([name, { start, end, frameRate, repeat }]) => {
    if (!scene.anims.exists(`${prefix}-${name}`)) {
      scene.anims.create({
        key: `${prefix}-${name}`,
        frames: scene.anims.generateFrameNumbers(textureKey, { start, end }),
        frameRate,
        repeat,
      })
    }
  })
}
