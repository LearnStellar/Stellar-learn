import { describe, expect, it } from 'vitest'
import { scoreQuiz } from './QuestPanel'
import type { QuizQuestion } from '@stellar-learn/content'

function question(id: string, correctOptionId = 'correct'): QuizQuestion {
  return {
    id,
    question: `Question ${id}`,
    options: [
      { id: 'wrong', text: 'Wrong', isCorrect: false },
      { id: correctOptionId, text: 'Correct', isCorrect: correctOptionId === 'correct' },
    ],
    explanation: 'because',
  }
}

describe('scoreQuiz', () => {
  it('passes vacuously and reports a full score for a quiz with no questions', () => {
    expect(scoreQuiz([], {})).toEqual({ passed: true, scorePct: 100 })
  })

  it('reports 100% and passes when every question is answered correctly', () => {
    const questions = [question('q1'), question('q2')]
    const answers = { q1: 'correct', q2: 'correct' }
    expect(scoreQuiz(questions, answers)).toEqual({ passed: true, scorePct: 100 })
  })

  it('reports 0% and fails when nothing is answered', () => {
    const questions = [question('q1'), question('q2')]
    expect(scoreQuiz(questions, {})).toEqual({ passed: false, scorePct: 0 })
  })

  it('rounds a fractional score and passes right at the 70% threshold', () => {
    const questions = [question('q1'), question('q2'), question('q3'), question('q4'), question('q5')]
    // 4/5 = 80% — comfortably over QUIZ_PASS_RATIO (0.7)
    const answers = { q1: 'correct', q2: 'correct', q3: 'correct', q4: 'correct', q5: 'wrong' }
    expect(scoreQuiz(questions, answers)).toEqual({ passed: true, scorePct: 80 })
  })

  it('fails just under the 70% threshold', () => {
    const questions = [question('q1'), question('q2'), question('q3')]
    // 2/3 = 66.7%, rounds to 67% but is still below 0.7
    const answers = { q1: 'correct', q2: 'correct', q3: 'wrong' }
    const result = scoreQuiz(questions, answers)
    expect(result.passed).toBe(false)
    expect(result.scorePct).toBe(67)
  })

  it('treats an unanswered question the same as a wrong answer', () => {
    const questions = [question('q1'), question('q2')]
    const answers = { q1: 'correct' }
    expect(scoreQuiz(questions, answers)).toEqual({ passed: false, scorePct: 50 })
  })
})
