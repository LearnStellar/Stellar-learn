/**
 * Character roster — must stay in sync with the manifest at
 * apps/web/public/assets/sprites/characters/characters.json and the
 * ASSET_KEYS.CHAR_* entries in packages/game-engine/src/config.ts.
 */
export const CHARACTER_IDS = [
  'warrior',
  'mage',
  'archer',
  'rogue',
  'paladin',
  'necromancer',
] as const

export type CharacterId = (typeof CHARACTER_IDS)[number]

const CHARACTER_NAMES: Record<CharacterId, string> = {
  warrior: 'Warrior',
  mage: 'Mage',
  archer: 'Archer',
  rogue: 'Rogue',
  paladin: 'Paladin',
  necromancer: 'Necromancer',
}

export function isCharacterId(value: string): value is CharacterId {
  return (CHARACTER_IDS as readonly string[]).includes(value)
}

/** Randomly assign a starting character — called once, at signup. */
export function pickRandomCharacter(): CharacterId {
  const index = Math.floor(Math.random() * CHARACTER_IDS.length)
  return CHARACTER_IDS[index] ?? CHARACTER_IDS[0]
}

/** Display name for a character id, falling back to the raw id for unknown values. */
export function characterDisplayName(id: string): string {
  return isCharacterId(id) ? CHARACTER_NAMES[id] : id
}

/** Path (under /public) to the character's portrait icon, matching characters.json. */
export function characterPortraitPath(id: string): string {
  const resolved = isCharacterId(id) ? id : 'warrior'
  return `/assets/sprites/characters/portrait-${resolved}.png`
}
