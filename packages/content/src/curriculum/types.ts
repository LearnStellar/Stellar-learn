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
   * Optional hand-authored position on the world map, in the 1280x720 design
   * space. Omit it (the normal case) and the map auto-arranges the world along
   * with every other node — only set it to pin a world somewhere specific.
   */
  mapPosition?: { x: number; y: number }
}
