/**
 * characterRender — the single, shared description of how a character's
 * portrait/sprite is assembled from a base body plus equipped cosmetics.
 *
 * This module returns DATA ONLY (plain objects, no DOM nodes, no Phaser
 * GameObjects) so both React (HUD, dashboard, AvatarSelect — stacking
 * positioned <img>/canvas layers) and the Phaser game engine (LevelScene —
 * placing sprites) can consume the exact same descriptor. There must never be
 * a second implementation of "how a character is assembled" anywhere else.
 *
 * Layer config below is keyed BY SLOT, never by item id. A new catalog item
 * (issue #77) automatically inherits its slot's z-order/anchor/offsets the
 * moment it is equipped — adding an item requires zero changes here.
 *
 * Deliberately dependency-free: this file imports nothing from `../config`
 * (which pulls in Phaser at module load for its `DEFAULT_PHASER_CONFIG`
 * enum values, and crashes outside a browser/DOM environment) and nothing
 * from `@stellar-learn/content`. That keeps it trivially unit-testable and
 * usable from both React and Phaser call sites without either dragging the
 * other in. Character-id validity is the caller's job — see
 * `isCharacterId`/`CHARACTER_IDS` in `apps/web/src/lib/characters.ts`, the
 * existing single source of truth for the roster.
 *
 * Import this module via the `@stellar-learn/game-engine/characterRender`
 * subpath, not the package root (`@stellar-learn/game-engine`) — the root
 * barrel re-exports the Phaser scenes and `config.ts`'s Phaser-importing
 * `DEFAULT_PHASER_CONFIG`, which crashes in Node (SSR, tests) since Phaser
 * touches `window` at module load. Any file that renders on the server
 * (e.g. a dashboard page) must use the subpath to stay SSR-safe.
 */

/** The four equip slots. `weapon` is shared by swords and spears — mutually exclusive. */
export type EquipSlot = 'weapon' | 'offhand' | 'body' | 'head'

export const EQUIP_SLOTS: readonly EquipSlot[] = ['weapon', 'offhand', 'body', 'head']

export function isEquipSlot(value: string): value is EquipSlot {
  return (EQUIP_SLOTS as readonly string[]).includes(value)
}

/**
 * Marketplace item categories (issue #77's catalog: sword, spear, shield,
 * armor, helmet) mapped to the equip slot they occupy. `sword` and `spear`
 * share the `weapon` slot — equipping one naturally replaces the other since
 * both write the same map key.
 */
export const CATEGORY_TO_SLOT: Record<string, EquipSlot> = {
  sword: 'weapon',
  spear: 'weapon',
  shield: 'offhand',
  armor: 'body',
  helmet: 'head',
}

/** Persisted shape of `User.equippedItems`: slot -> owned item id. */
export type EquippedItemMap = Partial<Record<EquipSlot, string>>

/** One resolved, positioned layer of the assembled character. */
export interface CharacterLayer {
  /** `'body'` for the base character sprite, otherwise the equip slot it fills. */
  slot: 'body' | EquipSlot
  /** The equipped item's id, when this layer came from an equip slot. */
  itemId?: string
  assetPath: string
  /** Stacking order — higher paints on top. */
  z: number
  anchor: 'bottom-center' | 'center'
  offsetX: number
  offsetY: number
  flipX: boolean
}

interface SlotConfig {
  z: number
  anchor: CharacterLayer['anchor']
  offsetX: number
  offsetY: number
  /**
   * When facing left, a slot mirrors its horizontal offset. Weapon/offhand
   * additionally swap stacking order relative to the body (the far hand
   * renders behind the body once the character turns around).
   */
  flipZDelta: number
}

const BODY_Z = 0

/**
 * Per-slot placement, tuned for the 128x128 character portrait/frame. These
 * numbers are intentionally coarse (cosmetic assets today are store-preview
 * icons, not rigged equip sprites — see the module doc in
 * apps/web/src/components/game/AvatarSelect.tsx) but the slot is the unit of
 * configuration, never the item.
 */
const SLOT_CONFIG: Record<EquipSlot, SlotConfig> = {
  body: { z: BODY_Z + 1, anchor: 'center', offsetX: 0, offsetY: 0, flipZDelta: 0 },
  head: { z: BODY_Z + 4, anchor: 'center', offsetX: 0, offsetY: -44, flipZDelta: 0 },
  weapon: { z: BODY_Z + 3, anchor: 'center', offsetX: 34, offsetY: 4, flipZDelta: -6 },
  offhand: { z: BODY_Z + 2, anchor: 'center', offsetX: -34, offsetY: 4, flipZDelta: 6 },
}

export type Facing = 'left' | 'right'

export interface BuildCharacterLayersParams {
  characterId: string
  /** Slot -> owned item id, exactly the shape persisted on the user profile. */
  equippedItems?: EquippedItemMap
  facing?: Facing
  /**
   * Resolves an equipped item id to its on-character asset path. Deliberately
   * injected rather than imported: characterRender.ts must not depend on the
   * marketplace catalog package, so it stays usable (and testable) before
   * issue #77 exists and never needs to change once it does. Returning
   * `undefined` (unresolvable id, or a category with no usable transparent
   * on-character sprite — e.g. today's shield previews are opaque JPGs) skips
   * the layer instead of rendering a broken composite.
   */
  resolveItemAsset?: (itemId: string, slot: EquipSlot) => string | undefined
}

/** Texture/asset key for a character's base body sprite. */
export function characterAssetKey(characterId: string): string {
  return `char-${characterId}`
}

/**
 * Assemble the ordered, flip-aware layer stack for a character. The body
 * layer is always present; equip layers are added only when the slot has an
 * item AND that item resolves to a real asset path.
 */
export function buildCharacterLayers({
  characterId,
  equippedItems = {},
  facing = 'right',
  resolveItemAsset,
}: BuildCharacterLayersParams): CharacterLayer[] {
  const flip = facing === 'left'
  const mirror = flip ? -1 : 1

  const layers: CharacterLayer[] = [
    {
      slot: 'body',
      assetPath: characterAssetKey(characterId),
      z: SLOT_CONFIG.body.z,
      anchor: SLOT_CONFIG.body.anchor,
      offsetX: SLOT_CONFIG.body.offsetX * mirror,
      offsetY: SLOT_CONFIG.body.offsetY,
      flipX: flip,
    },
  ]

  for (const slot of EQUIP_SLOTS) {
    const itemId = equippedItems[slot]
    if (!itemId) continue

    const assetPath = resolveItemAsset?.(itemId, slot)
    if (!assetPath) continue

    const config = SLOT_CONFIG[slot]
    layers.push({
      slot,
      itemId,
      assetPath,
      z: config.z + (flip ? config.flipZDelta : 0),
      anchor: config.anchor,
      offsetX: config.offsetX * mirror,
      offsetY: config.offsetY,
      flipX: flip,
    })
  }

  return layers.sort((a, b) => a.z - b.z)
}
