/**
 * Owned-item lookup — the integration seam between the avatar/equip system
 * (issue #82, this file) and the marketplace's ownership/inventory records
 * (issue #77, not yet built: `packages/database/prisma/schema.prisma` has no
 * ownership table on `develop`, and no gem-economy backend has merged for it
 * to depend on — see the recon note in this PR's description).
 *
 * Until #77 lands there is nothing anyone can own, so this legitimately
 * always returns an empty set — the equip API (api/profile/route.ts) then
 * correctly rejects every equip attempt as "not owned" rather than trusting
 * the client or inventing fake ownership. Once #77 adds its ownership model,
 * replace the body of this function with a real query (e.g.
 * `prisma.itemOwnership.findMany({ where: { userId }, select: { itemId: true } })`)
 * — no other file needs to change.
 */
export async function getOwnedItemIds(_userId: string): Promise<string[]> {
  return []
}
