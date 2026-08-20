import { describe, expect, it, vi } from 'vitest'
import {
  buildCharacterLayers,
  CATEGORY_TO_SLOT,
  characterAssetKey,
  isEquipSlot,
  type EquipSlot,
} from './characterRender'

/**
 * Fixture item catalog + resolver, standing in for issue #77's real
 * `packages/content/src/marketplace/items.ts`. characterRender.ts never
 * imports item data itself (see its module doc); this is exactly the shape a
 * real caller (AvatarSelect, HUD, LevelScene) will build once #77 lands.
 */
const FIXTURE_ITEMS: Record<string, { category: string; assetPath: string }> = {
  'sword-legendary': { category: 'sword', assetPath: '/assets/items/sword-legendary.png' },
  'spear-epic': { category: 'spear', assetPath: '/assets/items/spear-epic.png' },
  'armor-mythic': { category: 'armor', assetPath: '/assets/items/armor-mythic.png' },
  'helmet-rare': { category: 'helmet', assetPath: '/assets/items/helmet-rare.png' },
  // Shields today are opaque JPG store previews with no alpha — unresolvable
  // for on-character compositing, matching the real repo state.
  'shield-rare': { category: 'shield', assetPath: '/assets/items/Shield-rare.jpg' },
}

function fixtureResolver(itemId: string, slot: EquipSlot): string | undefined {
  const item = FIXTURE_ITEMS[itemId]
  if (!item) return undefined
  if (CATEGORY_TO_SLOT[item.category] !== slot) return undefined
  // The real integration point would additionally reject non-transparent
  // formats (e.g. .jpg); simulate that policy here too.
  if (item.assetPath.toLowerCase().endsWith('.jpg')) return undefined
  return item.assetPath
}

describe('characterAssetKey', () => {
  it('builds the char-<id> asset key', () => {
    expect(characterAssetKey('warrior')).toBe('char-warrior')
  })
})

describe('isEquipSlot', () => {
  it('accepts the four defined slots and rejects anything else', () => {
    expect(isEquipSlot('weapon')).toBe(true)
    expect(isEquipSlot('offhand')).toBe(true)
    expect(isEquipSlot('body')).toBe(true)
    expect(isEquipSlot('head')).toBe(true)
    expect(isEquipSlot('boots')).toBe(false)
  })
})

describe('CATEGORY_TO_SLOT', () => {
  it('maps sword and spear to the same weapon slot (mutually exclusive)', () => {
    expect(CATEGORY_TO_SLOT.sword).toBe('weapon')
    expect(CATEGORY_TO_SLOT.spear).toBe('weapon')
  })

  it('maps every marketplace category to a valid slot', () => {
    for (const category of ['sword', 'spear', 'shield', 'armor', 'helmet']) {
      expect(CATEGORY_TO_SLOT[category]).toBeDefined()
    }
  })
})

describe('buildCharacterLayers', () => {
  it('returns only the body layer when nothing is equipped', () => {
    const layers = buildCharacterLayers({ characterId: 'warrior' })
    expect(layers).toHaveLength(1)
    expect(layers[0]).toMatchObject({ slot: 'body', assetPath: 'char-warrior', flipX: false })
  })

  it('adds one layer per resolvable equipped item, ordered by z', () => {
    const layers = buildCharacterLayers({
      characterId: 'warrior',
      equippedItems: { weapon: 'sword-legendary', body: 'armor-mythic', head: 'helmet-rare' },
      resolveItemAsset: fixtureResolver,
    })

    expect(layers).toHaveLength(4) // body + weapon + body-slot armor + head
    expect(layers[0]?.slot).toBe('body') // base sprite always paints first
    // Every subsequent layer must be at or above the previous z (stable sort).
    for (let i = 1; i < layers.length; i++) {
      expect(layers[i]!.z).toBeGreaterThanOrEqual(layers[i - 1]!.z)
    }
    expect(layers.find((l) => l.slot === 'weapon')?.assetPath).toBe('/assets/items/sword-legendary.png')
    expect(layers.find((l) => l.slot === 'head')?.assetPath).toBe('/assets/items/helmet-rare.png')
  })

  it('is flip-aware: facing left mirrors offsetX and flips every layer', () => {
    const right = buildCharacterLayers({
      characterId: 'warrior',
      equippedItems: { weapon: 'sword-legendary' },
      resolveItemAsset: fixtureResolver,
      facing: 'right',
    })
    const left = buildCharacterLayers({
      characterId: 'warrior',
      equippedItems: { weapon: 'sword-legendary' },
      resolveItemAsset: fixtureResolver,
      facing: 'left',
    })

    const rightWeapon = right.find((l) => l.slot === 'weapon')!
    const leftWeapon = left.find((l) => l.slot === 'weapon')!
    expect(leftWeapon.offsetX).toBe(-rightWeapon.offsetX)
    expect(rightWeapon.flipX).toBe(false)
    expect(leftWeapon.flipX).toBe(true)
    // z can legitimately shift on flip (the far hand tucks behind the body).
    expect(leftWeapon.z).toBe(rightWeapon.z + -6)
  })

  it('skips an item that fails to resolve to an asset (e.g. an opaque JPG shield)', () => {
    const layers = buildCharacterLayers({
      characterId: 'warrior',
      equippedItems: { offhand: 'shield-rare' },
      resolveItemAsset: fixtureResolver,
    })
    expect(layers).toHaveLength(1) // body only — the shield layer was skipped
    expect(layers.some((l) => l.slot === 'offhand')).toBe(false)
  })

  it('skips a slot whose itemId does not resolve at all (unknown/unowned)', () => {
    const layers = buildCharacterLayers({
      characterId: 'warrior',
      equippedItems: { weapon: 'does-not-exist' },
      resolveItemAsset: fixtureResolver,
    })
    expect(layers).toHaveLength(1)
  })

  it('equipping sword then spear on the weapon slot keeps only the latest (map semantics)', () => {
    // equippedItems is a slot->itemId map, so "replace" is just overwriting
    // the key — this test documents that guarantee at the render layer.
    const equipped = { weapon: 'spear-epic' }
    const layers = buildCharacterLayers({
      characterId: 'warrior',
      equippedItems: equipped,
      resolveItemAsset: fixtureResolver,
    })
    const weaponLayers = layers.filter((l) => l.slot === 'weapon')
    expect(weaponLayers).toHaveLength(1)
    expect(weaponLayers[0]?.itemId).toBe('spear-epic')
  })

  it('a brand-new catalog item needs no change here: any resolvable id in a valid slot renders', () => {
    const resolver = vi.fn((itemId: string, slot: EquipSlot) =>
      itemId === 'sword-brand-new-999' && slot === 'weapon' ? '/assets/items/sword-brand-new.png' : undefined
    )
    const layers = buildCharacterLayers({
      characterId: 'warrior',
      equippedItems: { weapon: 'sword-brand-new-999' },
      resolveItemAsset: resolver,
    })
    expect(layers.find((l) => l.slot === 'weapon')?.assetPath).toBe('/assets/items/sword-brand-new.png')
    expect(resolver).toHaveBeenCalledWith('sword-brand-new-999', 'weapon')
  })
})
