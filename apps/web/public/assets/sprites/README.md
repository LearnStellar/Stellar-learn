# Spritesheet layouts

How the engine reads every sheet in this folder. The frame indices below are
a hard contract with `CHARACTER_ANIMS` / `ENEMY_ANIMS` / `BOSS_ANIMS` in
[`packages/game-engine/src/config.ts`](../../../../../packages/game-engine/src/config.ts) —
if you change a layout, change both.

All sheets are fixed-size grids read left to right, top to bottom
(`this.load.spritesheet()` + `generateFrameNumbers`). The renderer runs with
`pixelArt: true`: export crisp pixels, no anti-aliasing. Characters face
**right**; the engine flips the sprite for leftward movement. Unused cells in
a row must be fully transparent.

## Current art

The committed sheets are procedurally generated — regenerate them any time
with:

```bash
npm run sprites:generate
```

The generator (`scripts/generate-sprites.mjs`, stdlib only) is deterministic,
so its output diffs cleanly. Hand-drawn art is very welcome as a replacement:
drop a PNG matching the layouts below over the generated file, and if you add
a brand-new character/enemy/boss, list its id in `ART_MANIFEST`
(`packages/game-engine/src/config.ts`) so the engine loads it.

## `characters/<id>.png` — 1024x640, 8 cols x 5 rows of 128x128

Ids: `warrior`, `mage`, `archer`, `rogue`, `paladin`, `necromancer`.

| Row | Animation | Frames | Cols used | Plays                         |
| --- | --------- | ------ | --------- | ----------------------------- |
| 0   | `idle`    | 0-3    | 0-3       | loop                          |
| 1   | `run`     | 8-13   | 0-5       | loop                          |
| 2   | `jump`    | 16-19  | 0-3       | once                          |
| 3   | `attack`  | 24-29  | 0-5       | once                          |
| 4   | `death`   | 32-37  | 0-5       | once (boss battles, Issue #4) |

Every animation starts at the left edge of its own row, which is why the
indices jump in multiples of 8.

Keep the hero's feet on the bottom edge of the frame and the body roughly
centered: the physics body is `48x114` at offset `(40, 10)` within the frame
(see `LevelScene.createPlayer()`).

## `enemies/enemy-<id>.png` — 1024x256, 8 cols x 2 rows of 128x128

| Row | Animation | Frames | Cols used | Plays |
| --- | --------- | ------ | --------- | ----- |
| 0   | `walk`    | 0-5    | 0-5       | loop  |
| 1   | `death`   | 8-13   | 0-5       | once  |

## `bosses/boss-<id>.png` — 1536x1024, 6 cols x 4 rows of 256x256

| Row | Animation | Frames | Cols used | Plays |
| --- | --------- | ------ | --------- | ----- |
| 0   | `idle`    | 0-5    | 0-5       | loop  |
| 1   | `attack`  | 6-11   | 0-5       | once  |
| 2   | `hurt`    | 12-17  | 0-5       | once  |
| 3   | `defeat`  | 18-23  | 0-5       | once  |

Boss ids per world live in `WORLD_BOSSES` (`config.ts`); world 1's boss is
`doubt-wraith`.

## Palette

Match the brand palette (see `ASSETS.md` and `apps/web/tailwind.config.ts`):
purple `#7b5ea7`, gold `#ffd700`, parchment `#e8d5b7`, teal `#00bcd4`,
dark `#1a1a2e`, outline `#07071a`.

## Licensing

Only commit art we can redistribute under the repo's MIT license (your own
work or CC0). See the "Where to get / make assets" section of `ASSETS.md`.
