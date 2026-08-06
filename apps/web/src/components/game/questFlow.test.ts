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

const challengeQuest = (overrides: Partial<Quest> = {}): Quest =>
  quest({
    type: 'challenge',
    content: {
      description: 'Fund a testnet account.',
      starterCode: 'const kp = stellar.generateKeypair()',
      validationRules: [],
      hints: ['Friendbot funds testnet accounts.'],
      testnetRequired: true,
    },
    ...overrides,
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

  it('briefs a challenge without giving away the starter code or the hints', () => {
    // Those belong to the challenge editor — the quest's test phase. Repeating
    // them in the brief would teach the answer before asking the question.
    const pages = getTeachingPages(challengeQuest())
    expect(pages).toHaveLength(1)
    expect(pages[0]?.title).toBe('The Challenge')
    expect(pages[0]?.blocks.map((b) => b.type)).toEqual(['text', 'callout'])
  })
})

describe('scoreQuest', () => {
  const quizQuest = quest({
    type: 'quiz',
    content: [question('q1', 'a'), question('q2', 'b'), question('q3', 'a'), question('q4', 'b')],
  })

  it('passes at or above the pass ratio, and reports the percentage', () => {
    expect(scoreQuest(quizQuest, { q1: 'a', q2: 'b', q3: 'a', q4: 'b' })).toMatchObject({
      score: 4,
      total: 4,
      passed: true,
      scorePct: 100,
    })
  })

  it('fails below the pass ratio', () => {
    expect(scoreQuest(quizQuest, { q1: 'a', q2: 'b', q3: 'b', q4: 'a' })).toMatchObject({
      score: 2,
      total: 4,
      passed: false,
      scorePct: 50,
    })
  })

  it('treats unanswered questions as wrong', () => {
    expect(scoreQuest(quizQuest, {})).toMatchObject({ score: 0, total: 4, passed: false, scorePct: 0 })
  })

  it('carries the quest id and its XP so the caller needs nothing else', () => {
    expect(scoreQuest(quizQuest, {})).toMatchObject({ questId: 'q-test', xpEarned: 50 })
  })

  it('passes a quest that asks nothing — reading it through is enough', () => {
    const lessonQuest = quest({ content: [{ type: 'text', content: 'Prose.' }] })
    const result = scoreQuest(lessonQuest, {})
    expect(result).toMatchObject({ score: 0, total: 0, passed: true })
    // A lesson read through is passed, not "100%" — it was never scored.
    expect(result.scorePct).toBeUndefined()
  })

  it('fails a challenge until its code validates, however the questions went', () => {
    const spec = challengeQuest({ questions: [question('q1', 'a')] })
    expect(scoreQuest(spec, { q1: 'a' }, false).passed).toBe(false)
    expect(scoreQuest(spec, { q1: 'a' }, true).passed).toBe(true)
  })

  it('still fails a validated challenge whose follow-up questions were wrong', () => {
    const spec = challengeQuest({ questions: [question('q1', 'a'), question('q2', 'b')] })
    expect(scoreQuest(spec, { q1: 'b', q2: 'a' }, true).passed).toBe(false)
  })

  it('passes a validated challenge that asks no questions', () => {
    expect(scoreQuest(challengeQuest(), {}, true).passed).toBe(true)
  })
})
