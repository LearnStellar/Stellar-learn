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
  /**
   * Optional comprehension check asked *after* the quest's teaching content.
   *
   * A quest teaches first and tests second: a `lesson` or `challenge` quest
   * that carries `questions` gates completion behind them, so the player
   * proves understanding before the quest counts as passed. `quiz` quests put
   * their questions in `content` and do not need this field.
   */
  questions?: QuizQuestion[]
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
}
