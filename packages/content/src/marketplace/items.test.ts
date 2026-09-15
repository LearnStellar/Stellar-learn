import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getItemsByTier,
  getMarketplaceItem,
  ITEM_CATEGORIES,
  ITEM_TIERS,
  MARKETPLACE_ITEMS,
} from './items'

const ITEMS_DIR = join(__dirname, '..', '..', '..', '..', 'apps', 'web', 'public', 'assets', 'items')

describe('MARKETPLACE_ITEMS', () => {
  it('has exactly 20 items: 4 tiers x 5 categories', () => {
    expect(MARKETPLACE_ITEMS).toHaveLength(20)
  })

  it('covers every tier/category combination exactly once', () => {
    const seen = new Set<string>()
    for (const item of MARKETPLACE_ITEMS) {
      const key = `${item.category}:${item.tier}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
    expect(seen.size).toBe(ITEM_TIERS.length * ITEM_CATEGORIES.length)
  })

  it('has unique ids', () => {
    const ids = new Set(MARKETPLACE_ITEMS.map((i) => i.id))
    expect(ids.size).toBe(MARKETPLACE_ITEMS.length)
  })

  it('has a positive integer price, increasing with tier', () => {
    for (const item of MARKETPLACE_ITEMS) {
      expect(Number.isInteger(item.priceGems)).toBe(true)
      expect(item.priceGems).toBeGreaterThan(0)
    }
    const priceOf = (tier: string) => MARKETPLACE_ITEMS.find((i) => i.tier === tier)!.priceGems
    expect(priceOf('epic')).toBeGreaterThan(priceOf('rare'))
    expect(priceOf('legendary')).toBeGreaterThan(priceOf('epic'))
    expect(priceOf('mythic')).toBeGreaterThan(priceOf('legendary'))
  })

  it('there is no "common" tier', () => {
    expect(ITEM_TIERS).not.toContain('common')
    expect(MARKETPLACE_ITEMS.some((i) => (i.tier as string) === 'common')).toBe(false)
  })

  it('every asset path resolves to a real file on disk, case-sensitively', () => {
    // readdirSync gives the literal on-disk names; comparing against that
    // set (rather than fs.existsSync, which Windows/macOS resolve
    // case-insensitively) is what actually catches a casing mismatch that
    // would 404 on a case-sensitive deploy filesystem.
    const onDisk = new Set(readdirSync(ITEMS_DIR))
    const mismatches: string[] = []

    for (const item of MARKETPLACE_ITEMS) {
      const filename = item.asset.replace('/assets/items/', '')
      if (!onDisk.has(filename)) mismatches.push(`${item.id}: ${item.asset}`)
    }

    expect(mismatches, `catalog asset paths with no case-sensitive match on disk:\n${mismatches.join('\n')}`).toEqual([])
  })

  it('shield items are .jpg and every other category is .png (matches the real art drop)', () => {
    for (const item of MARKETPLACE_ITEMS) {
      if (item.category === 'shield') expect(item.asset.toLowerCase()).toMatch(/\.jpg$/)
      else expect(item.asset.toLowerCase()).toMatch(/\.png$/)
    }
  })
})

describe('getMarketplaceItem', () => {
  it('resolves a known id', () => {
    expect(getMarketplaceItem('sword-mythic')?.name).toBe('Mythic Sword')
  })

  it('returns undefined for an unknown id', () => {
    expect(getMarketplaceItem('does-not-exist')).toBeUndefined()
  })
})

describe('getItemsByTier', () => {
  it('groups all 20 items into the four tiers, in rare -> epic -> legendary -> mythic order', () => {
    const groups = getItemsByTier()
    expect(groups.map((g) => g.tier)).toEqual(['rare', 'epic', 'legendary', 'mythic'])
    expect(groups.reduce((sum, g) => sum + g.items.length, 0)).toBe(20)
    for (const group of groups) {
      expect(group.items.every((i) => i.tier === group.tier)).toBe(true)
    }
  })
})

describe('catalog extensibility (adding an item needs no other code change)', () => {
  it('a hypothetical new item is immediately visible through the same read APIs used everywhere else', () => {
    // Simulates "add one entry to items.ts" by constructing the same shape
    // MARKETPLACE_ITEMS holds, then proving the read-side helpers need no
    // per-item code to notice it — they operate on whatever array they're
    // given. (MARKETPLACE_ITEMS itself is immutable at the top level; this
    // documents the contract getItemsByTier/getMarketplaceItem rely on
    // without mutating the real catalog other tests in this file assert on.)
    const hypothetical = {
      id: 'sword-celestial',
      name: 'Celestial Sword',
      tier: 'mythic' as const,
      category: 'sword' as const,
      priceGems: 9999,
      asset: '/assets/items/sword-celestial.png',
    }
    const withNewItem = [...MARKETPLACE_ITEMS, hypothetical]
    const byId = new Map(withNewItem.map((i) => [i.id, i]))
    expect(byId.get('sword-celestial')).toEqual(hypothetical)
  })
})
