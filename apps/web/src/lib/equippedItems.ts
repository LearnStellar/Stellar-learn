import { isEquipSlot, type EquippedItemMap } from '@stellar-learn/game-engine/characterRender'

/**
 * Narrow a Prisma `Json` column value to the slot->itemId shape stored in
 * `User.equippedItems`. Unknown slot keys and non-string item ids are
 * dropped rather than trusted, since the column can in principle hold
 * whatever a direct DB write put there.
 */
export function toEquippedItemMap(value: unknown): EquippedItemMap {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const map: EquippedItemMap = {}
  for (const [slot, itemId] of Object.entries(value as Record<string, unknown>)) {
    if (isEquipSlot(slot) && typeof itemId === 'string') map[slot] = itemId
  }
  return map
}
