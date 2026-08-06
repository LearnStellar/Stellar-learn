/* =====================================================================
   STELLAR LEARN — pixel UI content data
   Mirrors the Claude Design handoff prototype (data.js). Source of truth
   for curriculum still lives in @stellar-learn/content; this drives the
   game-UI shell screens.
   ===================================================================== */

export interface PixelCharacter {
  id: string
  name: string
  arch: string
  col: string
  locked: boolean
  represents: string
  blurb: string
}

export const CHARACTERS: PixelCharacter[] = [
  {
    id: 'validator',
    name: 'THE VALIDATOR',
    arch: 'Warrior',
    col: '#7b5ea7',
    locked: false,
    represents: 'Network validators / node operators',
    blurb:
      'Armored knight in deep purple plate, a glowing teal rune on the chest and a sword shaped like the Stellar star. Keeps the network honest.',
  },
  {
    id: 'archivist',
    name: 'THE ARCHIVIST',
    arch: 'Mage',
    col: '#3d5afe',
    locked: false,
    represents: 'Data & account managers',
    blurb:
      'Robed scholar in midnight blue with golden star patterns, carrying a glowing ledger — the blockchain itself. Reads every transaction.',
  },
  {
    id: 'anchor',
    name: 'THE ANCHOR',
    arch: 'Ranger',
    col: '#2d5a1b',
    locked: false,
    represents: 'Stellar Anchors (on / off ramps)',
    blurb:
      'Green-cloaked adventurer with a compass rose and XLM-tipped arrows. One boot in sand, one on the dock — a bridge between worlds.',
  },
  {
    id: 'issuer',
    name: 'THE ISSUER',
    arch: 'Rogue',
    col: '#9b7ec7',
    locked: false,
    represents: 'Asset issuers',
    blurb:
      'Agile figure in dark leather, glowing purple asset tokens orbiting them and dual daggers that leave coin trails. Mints new value.',
  },
  {
    id: 'trader',
    name: 'THE TRADER',
    arch: 'Paladin',
    col: '#e8d5b7',
    locked: true,
    represents: 'DEX traders',
    blurb:
      'Stocky merchant-warrior in bronze-gold armor, shield stamped with a swap icon, belt heavy with pouches of colored asset tokens.',
  },
  {
    id: 'soroban',
    name: 'SOROBAN MAGE',
    arch: 'Necromancer',
    col: '#00bcd4',
    locked: true,
    represents: 'Soroban smart-contract developers',
    blurb:
      'Tall figure in black-and-purple robes covered in glowing code runes, floating off the ground, summoning tiny smart-contract familiars.',
  },
]

export const ANIMS = ['idle 4f', 'run 6f', 'jump 4f', 'attack 6f', 'hurt 2f', 'death 6f', 'climb 4f']

export type WorldState = 'done' | 'unlocked' | 'locked'

export interface PixelWorld {
  n: number
  /** Curriculum slug, so real progression state can be matched to this row. */
  slug: string
  name: string
  emoji: string
  state: WorldState
  x: number
  y: number
  col: string
  theme: string
  topic: string
  boss: string
  quests: string
  prog: number
}

export const WORLDS: PixelWorld[] = [
  { n: 1, slug: 'origin-plains', name: 'ORIGIN PLAINS',   emoji: '🌲', state: 'done',     x: 120,  y: 430, col: '#2d5a1b', theme: 'Forest',        topic: 'What is a blockchain?',  boss: 'The Doubt Wraith',    quests: '5/5', prog: 100 },
  { n: 2, slug: 'wallet-kingdom', name: 'WALLET KINGDOM',  emoji: '🏰', state: 'unlocked', x: 360,  y: 300, col: '#e8d5b7', theme: 'Castle',        topic: 'Keypairs & accounts',    boss: 'The Key Crusher',     quests: '3/5', prog: 60 },
  { n: 3, slug: 'asset-forge', name: 'ASSET FORGE',     emoji: '🔥', state: 'locked',   x: 600,  y: 410, col: '#8b4513', theme: 'Dungeon',       topic: 'Issuing custom assets',  boss: 'The Trust Breaker',   quests: '0/6', prog: 0 },
  { n: 4, slug: 'trading-bazaar', name: 'TRADING BAZAAR',  emoji: '⛰️', state: 'locked',   x: 830,  y: 280, col: '#00bcd4', theme: 'Sky market',    topic: 'The Stellar DEX',        boss: 'The Liquidity Drain', quests: '0/6', prog: 0 },
  { n: 5, slug: 'payment-realm', name: 'PAYMENT REALM',   emoji: '🌉', state: 'locked',   x: 1010, y: 420, col: '#3d5afe', theme: 'Cross-border',  topic: 'Payments & anchors',     boss: 'The Border Wall',     quests: '0/5', prog: 0 },
  { n: 6, slug: 'soroban-citadel', name: 'SOROBAN CITADEL', emoji: '✦',  state: 'locked',   x: 1170, y: 250, col: '#7b5ea7', theme: 'Code fortress', topic: 'Smart contracts',        boss: 'The Infinite Loop',   quests: '0/7', prog: 0 },
]

export interface PixelBadge {
  name: string
  desc: string
  icon: string
  earned: boolean
  date: string
  gold?: boolean
}

export const BADGES: PixelBadge[] = [
  { name: 'FIRST STEPS',       desc: 'Take your first steps on-chain', icon: '👣', earned: true,  date: 'EARNED · MAY 3' },
  { name: 'ACCOUNT CREATED',   desc: 'Generate your first keypair',    icon: '🔑', earned: true,  date: 'EARNED · MAY 3', gold: true },
  { name: 'FIRST TRANSACTION', desc: 'Send your first payment',        icon: '💸', earned: true,  date: 'EARNED · MAY 4' },
  { name: 'ASSET ISSUER',      desc: 'Mint a custom asset',            icon: '👑', earned: true,  date: 'EARNED · MAY 6', gold: true },
  { name: 'WORLD 1 COMPLETE',  desc: 'Clear the Origin Plains',        icon: '🌲', earned: true,  date: 'EARNED · MAY 6' },
  { name: 'PERFECT QUIZ',      desc: 'Ace a lesson with 5 stars',      icon: '⭐', earned: false, date: 'LOCKED' },
  { name: 'BOSS SLAYER',       desc: 'Defeat your first world boss',   icon: '⛓️', earned: false, date: 'LOCKED' },
  { name: 'SOROBAN GRADUATE',  desc: 'Deploy a smart contract',        icon: '🎓', earned: false, date: 'LOCKED', gold: true },
]
