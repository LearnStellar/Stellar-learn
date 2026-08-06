import type { ChallengeSpec, LessonBlock, Quest, QuizQuestion } from '@stellar-learn/content'

/** Minimum share of correct answers that counts as passing a quest. */
export const QUIZ_PASS_RATIO = 0.7

/**
 * One teaching step of a quest — a heading plus the blocks that belong to it.
 * The panel shows exactly one page at a time so a lesson reads as a guided
 * walkthrough instead of a wall of text.
 */
export interface LessonPage {
  /** Heading pulled off the leading `##` text block, when the page has one. */
  title?: string
  blocks: LessonBlock[]
}

/** Outcome of a quest, emitted back to the game when the player finishes. */
export interface QuestResult {
  questId: string
  xpEarned: number
  passed: boolean
  /** Number of questions answered correctly (0 when the quest asks none). */
  score: number
  /** Number of questions the quest asked. */
  total: number
  /**
   * Correctness as a percentage (0-100), for the per-world score record and
   * the progress API. Undefined when the quest asks nothing and so isn't
   * scored — a lesson read through is passed, not "100%".
   */
  scorePct?: number
}

const HEADING = /^##\s+(.+?)\s*$/m

/** True when a text block opens with a `## Heading`, which starts a new page. */
function headingOf(block: LessonBlock): string | undefined {
  if (block.type !== 'text') return undefined
  const firstLine = block.content.split('\n', 1)[0] ?? ''
  return HEADING.exec(firstLine)?.[1]
}

/** Drop the leading `## Heading` line — the page renders it as its own title. */
function stripHeading(content: string): string {
  const newline = content.indexOf('\n')
  return newline === -1 ? '' : content.slice(newline + 1).trimStart()
}

/**
 * Split lesson blocks into paginated teaching steps.
 *
 * A `## Heading` text block starts a new page; every block after it (callouts,
 * code, follow-up prose) belongs to that page. Content without headings stays
 * on a single page rather than being chopped into meaningless fragments.
 */
export function paginateLesson(blocks: LessonBlock[]): LessonPage[] {
  const pages: LessonPage[] = []

  for (const block of blocks) {
    const heading = headingOf(block)
    if (heading !== undefined) {
      const body = stripHeading(block.content)
      pages.push({ title: heading, blocks: body ? [{ ...block, content: body }] : [] })
      continue
    }
    const current = pages[pages.length - 1]
    if (current) current.blocks.push(block)
    else pages.push({ blocks: [block] })
  }

  return pages.filter((page) => page.title !== undefined || page.blocks.length > 0)
}

/**
 * Brief a coding challenge as teaching blocks.
 *
 * Only the conceptual part belongs here — the starter code, the hints and the
 * run/validate loop live in the challenge editor, which is the quest's *test*
 * phase. Repeating them in the brief would teach the answer before asking.
 */
export function challengeToBlocks(spec: ChallengeSpec): LessonBlock[] {
  const blocks: LessonBlock[] = [{ type: 'text', content: `## The Challenge\n${spec.description}` }]

  if (spec.testnetRequired) {
    blocks.push({
      type: 'callout',
      variant: 'warning',
      content: 'This challenge runs against the Stellar **testnet**. No real funds are ever used.',
    })
  }

  return blocks
}

/** True when the quest is tested by writing code rather than answering questions. */
export function isChallengeQuest(quest: Quest): quest is Quest & { content: ChallengeSpec } {
  return quest.type === 'challenge'
}

/** The teaching pages a quest shows before it asks anything. */
export function getTeachingPages(quest: Quest): LessonPage[] {
  if (quest.type === 'quiz') return []
  if (quest.type === 'challenge') {
    return paginateLesson(challengeToBlocks(quest.content as ChallengeSpec))
  }
  return paginateLesson(quest.content as LessonBlock[])
}

/**
 * The questions a quest asks. `quiz` quests keep them in `content`; every other
 * type may carry an optional comprehension check in `questions`.
 */
export function getQuestions(quest: Quest): QuizQuestion[] {
  if (quest.type === 'quiz') return (quest.content as QuizQuestion[]) ?? []
  return quest.questions ?? []
}

/** True when the chosen option for `question` is the correct one. */
export function isAnswerCorrect(question: QuizQuestion, optionId: string | undefined): boolean {
  if (optionId === undefined) return false
  return question.options.find((option) => option.id === optionId)?.isCorrect === true
}

/**
 * Score a quest and decide pass/fail.
 *
 * A quest that asks no questions passes by being read through. A quest that
 * does ask requires QUIZ_PASS_RATIO of its answers to be correct. A challenge
 * additionally requires its code to have validated — `challengePassed` comes
 * from the challenge runner. This is the value the boss battle uses to decide
 * the world finale, so it is never random.
 */
export function scoreQuest(
  quest: Quest,
  answers: Record<string, string>,
  challengePassed = false
): QuestResult {
  const questions = getQuestions(quest)
  const score = questions.filter((question) => isAnswerCorrect(question, answers[question.id])).length
  const total = questions.length
  const answeredWellEnough = total === 0 || score / total >= QUIZ_PASS_RATIO
  const passed = isChallengeQuest(quest) ? answeredWellEnough && challengePassed : answeredWellEnough

  return {
    questId: quest.id,
    xpEarned: quest.xpReward,
    passed,
    score,
    total,
    // Only quiz correctness is expressed as a percentage; a challenge is
    // pass/fail and a lesson read through is passed, not "100%".
    ...(total > 0 ? { scorePct: Math.round((score / total) * 100) } : {}),
  }
}
