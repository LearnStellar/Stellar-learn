/**
 * Core canvas dimensions, kept free of any Phaser import.
 *
 * `config.ts` pulls in Phaser for `DEFAULT_PHASER_CONFIG`, which cannot be
 * loaded outside a browser. Keeping these constants in their own module lets
 * pure, headless-testable code (e.g. `worldMapLayout.ts`) share them without
 * dragging the engine in. `config.ts` re-exports them, so existing imports
 * are unaffected.
 */
export const GAME_WIDTH = 1280
export const GAME_HEIGHT = 720
export const TILE_SIZE = 64
