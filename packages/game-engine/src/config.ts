// Value import (not `import type`): DEFAULT_PHASER_CONFIG below uses Phaser enum
// values (Phaser.AUTO, Phaser.Scale.*) at runtime. This file is only ever pulled
// in through GameCanvas's dynamic client-side import, so it never runs on the server.
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from './dimensions'

// Re-exported so `config` stays the one place scenes import engine constants
// from, while headless code can take them from `./dimensions` without Phaser.
export { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE }

/**
 * Manifest of the real pixel-art assets that exist under
 * `apps/web/public/assets`. Scenes only request files listed here; anything
 * not listed keeps its generated placeholder, so a missing asset can never
 * 404 or crash Phaser with an empty animation.
 *
 * When new art lands (see `apps/web/public/assets/sprites/README.md` and
 * `ASSETS.md` for the required frame layouts), add its id to the matching
 * list and the scenes pick it up — no other code changes needed.
 */
export const ART_MANIFEST = {
  characters: ['archer', 'mage', 'necromancer', 'paladin', 'rogue', 'warrior'],
  enemies: ['doubter'],
  bosses: ['doubt-wraith'],
  tilesets: [] as string[],
  ui: false,
  effects: false,
}

/** One animation strip inside a fixed-grid spritesheet. */
export interface SheetAnim {
  start: number
  end: number
  frameRate: number
  repeat: number
}

/**
 * Frame layouts the spritesheets are authored against. These indices are the
 * contract between the art (scripts/generate-sprites.mjs, external drops) and
 * the animations the scenes create — keep all three in sync.
 */
export const CHARACTER_FRAME_SIZE = 128
export const CHARACTER_ANIMS: Record<string, SheetAnim> = {
  idle: { start: 0, end: 3, frameRate: 6, repeat: -1 },
  run: { start: 8, end: 13, frameRate: 10, repeat: -1 },
  jump: { start: 16, end: 19, frameRate: 10, repeat: 0 },
  attack: { start: 24, end: 29, frameRate: 12, repeat: 0 },
  death: { start: 32, end: 37, frameRate: 10, repeat: 0 },
}

export const ENEMY_FRAME_SIZE = 128
export const ENEMY_ANIMS: Record<string, SheetAnim> = {
  walk: { start: 0, end: 5, frameRate: 8, repeat: -1 },
  death: { start: 8, end: 13, frameRate: 10, repeat: 0 },
}

export const BOSS_FRAME_SIZE = 256
export const BOSS_ANIMS: Record<string, SheetAnim> = {
  idle: { start: 0, end: 5, frameRate: 6, repeat: -1 },
  attack: { start: 6, end: 11, frameRate: 10, repeat: 0 },
  hurt: { start: 12, end: 17, frameRate: 12, repeat: 0 },
  defeat: { start: 18, end: 23, frameRate: 8, repeat: 0 },
}

/** Boss spritesheet id per world (see ASSETS.md; consumed by Issue #4). */
export const WORLD_BOSSES: Record<string, string> = {
  'world-1-origin-plains': 'doubt-wraith',
  'world-2-wallet-kingdom': 'key-crusher',
  'world-3-asset-forge': 'trust-breaker',
}

/** Roaming enemy spritesheet ids per world. */
export const WORLD_ENEMIES: Record<string, string[]> = {
  'world-1-origin-plains': ['doubter'],
}

export const DEFAULT_PHASER_CONFIG: Omit<Phaser.Types.Core.GameConfig, 'scene' | 'parent'> = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1a2e',
  pixelArt: true,               // critical for crisp pixel art rendering
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 600 },
      // Debug draws magenta body/velocity overlays — keep off so the level
      // reads as a game, not a wireframe. Flip on locally when debugging physics.
      debug: false,
    },
  },
  scale: {
    // ENVELOP fills the whole container on any aspect ratio (no letterbox
    // bands on portrait phones), cropping the overflow instead of shrinking
    // the game to a strip. FIT would leave large empty margins on mobile.
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  audio: {
    disableWebAudio: false,
  },
}

// Asset keys — consistent naming used across all scenes
export const ASSET_KEYS = {
  // Tilesets
  TILESET_FOREST: 'tileset-forest',
  TILESET_CASTLE: 'tileset-castle',
  TILESET_DUNGEON: 'tileset-dungeon',
  TILESET_MOUNTAIN: 'tileset-mountain',

  // Characters
  CHAR_WARRIOR: 'char-warrior',
  CHAR_MAGE: 'char-mage',
  CHAR_ARCHER: 'char-archer',
  CHAR_ROGUE: 'char-rogue',
  CHAR_PALADIN: 'char-paladin',
  CHAR_NECROMANCER: 'char-necromancer',

  // UI
  UI_XP_BAR: 'ui-xp-bar',
  UI_HEALTH_BAR: 'ui-health-bar',
  UI_QUEST_PANEL: 'ui-quest-panel',

  // Effects
  FX_COIN: 'fx-coin',
  FX_LEVELUP: 'fx-levelup',
  FX_CORRECT: 'fx-correct',
  FX_WRONG: 'fx-wrong',
} as const
