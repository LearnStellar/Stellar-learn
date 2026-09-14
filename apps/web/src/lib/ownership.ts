import { prisma } from '@stellar-learn/database'
import { getMarketplaceItem } from '@stellar-learn/content'

/**
 * Owned-item lookup — the integration seam between the avatar/equip system
 * (issue #82) and the marketplace's ownership records (issue #77).
 *
 * Only `complete` ownerships count. A `pending` row is a purchase that
 * reserved the item but whose mint has not settled, so equipping it would let
 * a player wear an item they have not finished paying for.
 */
export async function getOwnedItemIds(userId: string): Promise<string[]> {
  const rows = await prisma.itemOwnership.findMany({
    where: { userId, status: 'complete' },
    select: { itemId: true },
  })
  return rows.map((row) => row.itemId)
}

/**
 * Resolve an item id to its marketplace category (sword, spear, shield,
 * armor, helmet). Returns `undefined` for an id absent from the catalog, and
 * `categoryMatchesSlot` treats an unknown category as a mismatch (fail
 * closed) — so an owned head item can never be written into the weapon slot
 * just because the client said so.
 */
export function getItemCategory(itemId: string): string | undefined {
  return getMarketplaceItem(itemId)?.category
}
