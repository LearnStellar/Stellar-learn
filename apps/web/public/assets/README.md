# Pixel-art assets

> In-game spritesheets (characters, enemies, bosses) live under
> [`sprites/`](sprites/) — see [`sprites/README.md`](sprites/README.md) for
> their exact grid layouts. The table below covers the static UI mockup slots.

Drop real PNG sprites here to replace the labelled placeholder slots used by
the game UI (`<SpriteSlot>`). The UI is laid out at native 1x and rendered at
2x via `image-rendering: pixelated`, so export art at the native sizes below.

| Asset                | Native size | Slot label example              |
| -------------------- | ----------- | ------------------------------- |
| Player characters    | 128×128px   | `char-validator_idle · 128²`    |
| Enemies              | 128×128px   | `doubter_walk · 128²`           |
| Bosses               | 256×256px   | `boss-doubt-wraith_idle · 256²` |
| Tiles                | 64×64px     | `world-1_tileset_ground`        |
| Collectibles / icons | 32×32px     | `xlm-coin`                      |
| UI badges            | 64×64px     | `badge-account-created`         |
| Lesson illustration  | 480×110px   | `quest_keypair_art · 480×110`   |

Spritesheets use a horizontal-strip layout (consistent frame size per
animation) compatible with Phaser's `this.load.spritesheet()`. Naming follows
`char-validator_idle.png`, `world-1_tileset_ground.png`, `ui_xp-bar.png`.

Colours must match the brand palette exactly (see `tailwind.config.ts`).

## Manifests

Some folders carry a JSON manifest alongside the art — add an entry there
whenever you drop in a new file, or the game won't know it exists:

| Folder                    | Manifest           | Purpose                                                                                                         |
| ------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `sprites/characters/`     | `characters.json`  | Playable roster. New signups are randomly assigned one entry from this list (`apps/web/src/lib/characters.ts`). |
| `sprites/bosses/`         | `bosses.json`      | One boss per world, all 6 worlds.                                                                               |
| `animations/world-clear/` | `world-clear.json` | Plays once a world's boss is defeated.                                                                          |
