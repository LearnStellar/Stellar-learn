/**
 * Marketplace catalog — the single source of truth for every purchasable
 * cosmetic item. Both the marketplace UI (apps/web/src/components/marketplace)
 * and the purchase API (apps/web/src/app/api/marketplace/route.ts) resolve
 * items from here; neither hardcodes an item id, price, or asset path.
 *
 * Adding a new item is exactly one catalog entry plus its asset file — no
 * other code should ever need to change (no `if (id === ...)`, no per-item
 * switch, no per-category array anywhere else in the codebase).
 */

/** Rarity tiers, ordered low to high. There is deliberately no "common" tier. */
export const ITEM_TIERS = ['rare', 'epic', 'legendary', 'mythic'] as const
export type ItemTier = (typeof ITEM_TIERS)[number]

export const ITEM_CATEGORIES = ['sword', 'spear', 'shield', 'armor', 'helmet'] as const
export type ItemCategory = (typeof ITEM_CATEGORIES)[number]

export interface MarketplaceItem {
  id: string
  name: string
  tier: ItemTier
  category: ItemCategory
  priceGems: number
  /** Exact on-disk path under apps/web/public — case-sensitive, byte-for-byte. */
  asset: string
  description?: string
}

/**
 * Gem price by tier, applied uniformly across categories. Increasing scale
 * rewards chasing rarer tiers without categories needing individual pricing.
 */
const PRICE_BY_TIER: Record<ItemTier, number> = {
  rare: 100,
  epic: 250,
  legendary: 600,
  mythic: 1500,
}

const TIER_LABEL: Record<ItemTier, string> = {
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
}

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  sword: 'Sword',
  spear: 'Spear',
  shield: 'Shield',
  armor: 'Armor',
  helmet: 'Helmet',
}

/**
 * Exact on-disk filenames under apps/web/public/assets/items/ (flat
 * directory). Two categories keep inconsistent capitalization/extension
 * from their source art drop — captured here verbatim rather than
 * normalized, since the deploy filesystem is case-sensitive and renaming
 * the files is a separate, coordinated change (see the PR description).
 */
const ASSET_FILE: Record<ItemCategory, Record<ItemTier, string>> = {
  sword: {
    rare: 'Sword-rare.png',
    epic: 'sword-epic.png',
    legendary: 'sword-legendary.png',
    mythic: 'sword-mythic.png',
  },
  spear: {
    rare: 'spear-rare.png',
    epic: 'spear-epic.png',
    legendary: 'spear-legendary.png',
    mythic: 'spear-mythic.png',
  },
  shield: {
    rare: 'Shield-rare.jpg',
    epic: 'Shield-epic.jpg',
    legendary: 'Shield-legendary.jpg',
    mythic: 'Shield-mythic.jpg',
  },
  armor: {
    rare: 'armor-rare.png',
    epic: 'armor-epic.png',
    legendary: 'armor-legendary.png',
    mythic: 'armor-mythic.png',
  },
  helmet: {
    rare: 'helmet-rare.png',
    epic: 'helmet-epic.png',
    legendary: 'helmet-legendary.png',
    mythic: 'helmet-mythic.png',
  },
}

function buildItem(category: ItemCategory, tier: ItemTier): MarketplaceItem {
  return {
    id: `${category}-${tier}`,
    name: `${TIER_LABEL[tier]} ${CATEGORY_LABEL[category]}`,
    tier,
    category,
    priceGems: PRICE_BY_TIER[tier],
    asset: `/assets/items/${ASSET_FILE[category][tier]}`,
    description: `A ${TIER_LABEL[tier].toLowerCase()} ${CATEGORY_LABEL[category].toLowerCase()}, minted as an on-chain testnet NFT the moment you buy it.`,
  }
}

/** Every purchasable item — 4 tiers x 5 categories. */
export const MARKETPLACE_ITEMS: MarketplaceItem[] = ITEM_CATEGORIES.flatMap((category) =>
  ITEM_TIERS.map((tier) => buildItem(category, tier))
)

const ITEMS_BY_ID = new Map(MARKETPLACE_ITEMS.map((item) => [item.id, item]))

/** Look up a catalog item by id, or undefined if it doesn't exist. */
export function getMarketplaceItem(itemId: string): MarketplaceItem | undefined {
  return ITEMS_BY_ID.get(itemId)
}

/** Items grouped by tier, in ITEM_TIERS order (rare -> epic -> legendary -> mythic). */
export function getItemsByTier(): { tier: ItemTier; items: MarketplaceItem[] }[] {
  return ITEM_TIERS.map((tier) => ({
    tier,
    items: MARKETPLACE_ITEMS.filter((item) => item.tier === tier),
  }))
}
