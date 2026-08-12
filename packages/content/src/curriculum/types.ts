export type QuestType = 'lesson' | 'quiz' | 'challenge' | 'boss'
export type WorldTheme = 'forest' | 'castle' | 'dungeon' | 'mountain' | 'castle-dungeon' | 'citadel'

export interface QuizOption {
  id: string
  text: string
  isCorrect: boolean
}

export interface QuizQuestion {
  id: string
  question: string
  options: QuizOption[]
  explanation: string
}

/**
 * An enemy the player meets while crossing a world. Defeating it means clearing
 * its mini-quiz — a short, themed set of questions tied to that stretch of the
 * lesson. A world fields several enemies, so the player is tested repeatedly
 * (teach a little, test a little) rather than once at the end.
 */
export interface EnemyEncounter {
  id: string
  /** Display name, e.g. "The Doubter". */
  name: string
  /** Sprite key under assets/sprites/enemies (without extension). */
  sprite: string
  /** Which lesson topic this enemy guards — shown before the fight. */
  topic: string
  /** The questions that must be cleared to defeat this enemy (3–5). */
  questions: QuizQuestion[]
}

export interface LessonBlock {
  type: 'text' | 'code' | 'callout' | 'image' | 'interactive'
  content: string
  language?: string   // for code blocks
  variant?: 'info' | 'warning' | 'tip' // for callouts
}

export interface ChallengeSpec {
  description: string
  starterCode: string
  validationRules: ValidationRule[]
  hints: string[]
  testnetRequired: boolean
}

export interface ValidationRule {
  type: 'tx_success' | 'account_created' | 'asset_issued' | 'balance_check' | 'code_contains'
  params: Record<string, unknown>
  errorMessage: string
}

export interface Quest {
  id: string
  worldId: string
  slug: string
  title: string
  description: string
  type: QuestType
  order: number
  xpReward: number
  estimatedMinutes: number
  content: LessonBlock[] | QuizQuestion[] | ChallengeSpec
}

export interface World {
  id: string
  slug: string
  title: string
  subtitle: string
  description: string
  theme: WorldTheme
  order: number
  xpReward: number
  quests: Quest[]
  bossName: string
  bossDescription: string
  /**
   * Enemies encountered while platforming through the world. Optional so worlds
   * authored before the mechanic (or content-only worlds) still validate; when
   * present, each is a mini-quiz gate on the way to the boss.
   */
  enemies?: EnemyEncounter[]
}
