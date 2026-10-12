import * as Phaser from 'phaser'

/**
 * Placeholder texture generators, used whenever a real spritesheet did not
 * load (art not in the ART_MANIFEST yet, or a 404). They guarantee scenes
 * always have a usable texture instead of Phaser's missing-texture marker.
 */

/** Purple hero box with eyes and a teal chest rune. Keyed `char-<id>`. */
export function ensureCharacterTexture(scene: Phaser.Scene, characterId: string) {
  const key = `char-${characterId}`
  if (scene.textures.exists(key)) return

  const size = 48
  const g = scene.make.graphics({ x: 0, y: 0 }, false)
  g.fillStyle(0x7b5ea7, 1)
  g.fillRect(0, 0, size, size)
  g.lineStyle(3, 0x07071a, 1)
  g.strokeRect(1.5, 1.5, size - 3, size - 3)
  // teal rune on the chest + simple eyes so the box reads as a hero
  g.fillStyle(0x07071a, 1)
  g.fillRect(size * 0.3, size * 0.3, size * 0.12, size * 0.12)
  g.fillRect(size * 0.58, size * 0.3, size * 0.12, size * 0.12)
  g.fillStyle(0x00bcd4, 1)
  g.fillRect(size * 0.42, size * 0.56, size * 0.16, size * 0.16)
  g.generateTexture(key, size, size)
  g.destroy()
}

/**
 * Looming wraith silhouette with burning eyes — a menacing stand-in for a
 * missing boss spritesheet. Keyed `boss-<id>` to match the real sheets.
 */
export function ensureBossTexture(scene: Phaser.Scene, bossId: string) {
  const key = `boss-${bossId}`
  if (scene.textures.exists(key)) return

  const w = 120
  const h = 160
  const g = scene.make.graphics({ x: 0, y: 0 }, false)
  // Cloaked body: wide hood tapering into a jagged hem.
  g.fillStyle(0x1c1030, 1)
  g.fillEllipse(w / 2, h * 0.32, w * 0.8, h * 0.5)
  g.fillRect(w * 0.14, h * 0.3, w * 0.72, h * 0.5)
  for (let i = 0; i < 6; i++) {
    const x = w * 0.14 + (i * w * 0.72) / 6
    g.fillTriangle(x, h * 0.8, x + (w * 0.72) / 6, h * 0.8, x + (w * 0.72) / 12, h * 0.96)
  }
  g.lineStyle(3, 0x07071a, 1)
  g.strokeEllipse(w / 2, h * 0.32, w * 0.8, h * 0.5)
  // Burning eyes inside the hood.
  g.fillStyle(0xff3355, 1)
  g.fillRect(w * 0.32, h * 0.26, w * 0.12, h * 0.05)
  g.fillRect(w * 0.56, h * 0.26, w * 0.12, h * 0.05)
  g.generateTexture(key, w, h)
  g.destroy()
}
