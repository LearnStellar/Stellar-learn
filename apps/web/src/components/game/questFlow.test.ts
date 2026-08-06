import { describe, expect, it } from 'vitest'
import type { Quest, QuizQuestion } from '@stellar-learn/content'
import { getQuestions, getTeachingPages, paginateLesson, scoreQuest } from './questFlow'

const question = (id: string, correctId: string): QuizQuestion => ({
  id,
  question: `Question ${id}?`,
  options: [
    { id: 'a', text: 'Option A', isCorrect: correctId === 'a' },
    { id: 'b', text: 'Option B', isCorrect: correctId === 'b' },
  ],
  explanation: 'Because that is how Stellar works.',
})

const quest = (overrides: Partial<Quest>): Quest => ({
  id: 'q-test',
  worldId: 'world-1-origin-plains',
  slug: 'test',
  title: 'Test Quest',
  description: 'A quest used in tests.',
  type: 'lesson',
  order: 1,
  xpReward: 50,
  estimatedMinutes: 5,
  content: [],
  ...overrides,
})

describe('paginateLesson', () => {
  it('starts a new page at every heading and attaches the blocks that follow', () => {
    const pages = paginateLesson([
      { type: 'text', content: '## The Magic Ledger\n\nImagine a shared book.' },
      { type: 'callout', variant: 'info', content: 'A blockchain is a shared chain of records.' },
      { type: 'text', content: '## Why It Matters\n\nNo bank needed.' },
      { type: 'code', content: 'const ledger = []', language: 'javascript' },
    ])

    expect(pages).toHaveLength(2)
    expect(pages[0]?.title).toBe('The Magic Ledger')
    expect(pages[0]?.blocks).toHaveLength(2)
    expect(pages[0]?.blocks[0]?.content).toBe('Imagine a shared book.')
    expect(pages[1]?.title).toBe('Why It Matters')
    expect(pages[1]?.blocks.map((b) => b.type)).toEqual(['text', 'code'])
  })

  it('keeps heading-less content on a single page rather than fragmenting it', () => {
    const pages = paginateLesson([
      { type: 'text', content: 'Just some prose.' },
      { type: 'callout', variant: 'tip', content: 'And a tip.' },
    ])

    expect(pages).toHaveLength(1)
    expect(pages[0]?.title).toBeUndefined()
    expect(pages[0]?.blocks).toHaveLength(2)
  })
})

describe('getTeachingPages / getQuestions', () => {
  it('reads quiz questions off content and teaches nothing beforehand', () => {
    const quizQuest = quest({ type: 'quiz', content: [question('q1', 'a')] })

    expect(getTeachingPages(quizQuest)).toHaveLength(0)
    expect(getQuestions(quizQuest)).toHaveLength(1)
  })

  it('gates a lesson quest behind its optional comprehension questions', () => {
    const lessonQuest = quest({
      content: [{ type: 'text', content: '## Keys\n\nTwo of them.' }],
      questions: [question('q1', 'b')],
    })

    expect(getTeachingPages(lessonQuest)).toHaveLength(1)
    expect(getQuestions(lessonQuest)).toHaveLength(1)
  })

  it('turns a challenge spec into a readable brief', () => {
    const challengeQuest = quest({
      type: 'challenge',
      content: {
        description: 'Fund a testnet account.',
        starterCode: 'const kp = Keypair.random()',
        validationRules: [],
        hints: ['Friendbot funds testnet accounts.'],
        testnetRequired: true,
      },
    })

    const pages = getTeachingPages(challengeQuest)
    expect(pages).toHaveLength(1)
    expect(pages[0]?.title).toBe('The Challenge')
    expect(pages[0]?.blocks.map((b) => b.type)).toEqual(['text', 'callout', 'code', 'callout'])
  })
})

describe('scoreQuest', () => {
  const quizQuest = quest({
    type: 'quiz',
    content: [question('q1', 'a'), question('q2', 'b'), question('q3', 'a'), question('q4', 'b')],
  })

  it('passes at or above the pass ratio', () => {
    expect(scoreQuest(quizQuest, { q1: 'a', q2: 'b', q3: 'a', q4: 'b' })).toEqual({
      score: 4,
      total: 4,
      passed: true,
    })
  })

  it('fails below the pass ratio', () => {
    expect(scoreQuest(quizQuest, { q1: 'a', q2: 'b', q3: 'b', q4: 'a' })).toEqual({
      score: 2,
      total: 4,
      passed: false,
    })
  })

  it('treats unanswered questions as wrong', () => {
    expect(scoreQuest(quizQuest, {})).toEqual({ score: 0, total: 4, passed: false })
  })

  it('passes a quest that asks nothing — reading it through is enough', () => {
    const lessonQuest = quest({ content: [{ type: 'text', content: 'Prose.' }] })
    expect(scoreQuest(lessonQuest, {})).toEqual({ score: 0, total: 0, passed: true })
  })
})
