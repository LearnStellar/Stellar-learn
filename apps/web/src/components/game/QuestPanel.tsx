'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Quest, LessonBlock, QuizQuestion, ChallengeSpec } from '@stellar-learn/content'
import { ChallengeContent } from './ChallengeContent'

/** Minimum share of correct quiz answers that counts as passing the quest. */
const QUIZ_PASS_RATIO = 0.7

export interface QuizScore {
  passed: boolean
  /** Correctness percentage, 0-100, rounded to the nearest integer. */
  scorePct: number
}

/**
 * Pure helper calculating progress in step-by-step reading flow.
 */
export function calculateLessonProgress(
  currentStep: number,
  totalSteps: number
): { progressPct: number; isFinalStep: boolean } {
  if (totalSteps <= 1) return { progressPct: 100, isFinalStep: true }
  const clamped = Math.max(0, Math.min(currentStep, totalSteps - 1))
  const progressPct = Math.round(((clamped + 1) / totalSteps) * 100)
  return { progressPct, isFinalStep: clamped === totalSteps - 1 }
}

/**
 * Pure scoring function pulled out of `handleComplete` so it's testable
 * without mounting the panel. A quiz with no questions passes vacuously
 * (matches the existing "lessons pass by being read" rule) and reports a
 * full score rather than a division-by-zero NaN.
 */
export function scoreQuiz(questions: QuizQuestion[], answers: Record<string, string>): QuizScore {
  if (questions.length === 0) return { passed: true, scorePct: 100 }

  const correct = questions.filter(
    (q) => q.options.find((o) => o.id === answers[q.id])?.isCorrect
  ).length
  const scorePct = Math.round((correct / questions.length) * 100)
  return { passed: correct / questions.length >= QUIZ_PASS_RATIO, scorePct }
}

interface QuestPanelProps {
  quest: Quest | null
  /**
   * `passed` feeds the boss-battle outcome (Issue #4); `scorePct` is the quiz
   * correctness percentage (0-100), tracked per-world and persisted, or
   * `undefined` for quest types that aren't scored (lessons, challenges).
   */
  onComplete: (questId: string, xpEarned: number, passed: boolean, scorePct?: number) => void
  onClose: () => void
}

export function QuestPanel({ quest, onComplete, onClose }: QuestPanelProps) {
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)

  if (!quest) return null

  const quizScore =
    quest.type === 'quiz'
      ? scoreQuiz(quest.content as QuizQuestion[], quizAnswers)
      : { passed: true, scorePct: 100 }

  const handleComplete = () => {
    // Pass/fail feeds the boss-battle outcome: lessons pass by being read,
    // quizzes require QUIZ_PASS_RATIO of the answers to be correct.
    let passed = true
    let scorePct: number | undefined
    if (quest.type === 'quiz') {
      passed = quizScore.passed
      scorePct = quizScore.scorePct
    }
    onComplete(quest.id, quest.xpReward, passed, scorePct)
    setQuizAnswers({})
    setQuizSubmitted(false)
  }

  const handleRetryQuiz = () => {
    setQuizSubmitted(false)
    setQuizAnswers({})
  }

  return (
    <AnimatePresence>
      <motion.div
        className="quest-panel"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={`quest-panel-inner ${quest.type === 'challenge' ? 'quest-panel-inner--challenge' : ''}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="mb-1 font-pixel text-[10px] text-brand-purple-light uppercase">
                {quest.type === 'lesson'
                  ? '📖 Lesson'
                  : quest.type === 'quiz'
                    ? '❓ Quiz'
                    : quest.type === 'challenge'
                      ? '⚔️ Challenge'
                      : '👹 Boss Battle'}
              </div>
              <h2 className="font-pixel text-sm text-brand-gold">{quest.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="font-pixel text-xs text-brand-gold/50 transition hover:text-brand-gold"
            >
              ✕
            </button>
          </div>

          {/* XP reward */}
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-brand-dark-3 px-4 py-2">
            <span className="text-brand-gold-bright">⭐</span>
            <span className="font-pixel text-[10px] text-brand-gold">
              Reward: {quest.xpReward} XP
            </span>
            <span className="ml-2 font-pixel text-[10px] text-brand-gold/40">
              ~{quest.estimatedMinutes} min
            </span>
          </div>

          {/* Content */}
          <div className="mb-8">
            {quest.type === 'lesson' && <LessonContent blocks={quest.content as LessonBlock[]} />}
            {quest.type === 'quiz' && (
              <QuizContent
                questions={quest.content as QuizQuestion[]}
                answers={quizAnswers}
                submitted={quizSubmitted}
                onChange={setQuizAnswers}
                onSubmit={() => setQuizSubmitted(true)}
              />
            )}
            {quest.type === 'challenge' && (
              <ChallengeContent
                questId={quest.id}
                challenge={quest.content as ChallengeSpec}
                onPassed={handleComplete}
              />
            )}
          </div>

          {/* Source citation — every factual claim links back to official docs */}
          {quest.source && (
            <div className="mb-6 flex items-start gap-2 border-t border-brand-dark-4 pt-3">
              <span className="mt-px flex-none font-pixel text-[8px] leading-[1.6] text-brand-gold/40">
                SOURCE
              </span>
              <a
                href={quest.source}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-xs text-stellar-blue underline decoration-stellar-blue/40 underline-offset-2 transition hover:text-brand-gold"
              >
                {quest.source}
              </a>
            </div>
          )}

          {/* Footer */}
          {quest.type !== 'challenge' && (
            <div className="flex justify-end gap-4">
              <button
                onClick={onClose}
                className="font-pixel text-[10px] text-brand-gold/50 transition hover:text-brand-gold"
              >
                Save & Exit
              </button>
              {quest.type === 'lesson' && (
                <button onClick={handleComplete} className="btn-pixel text-[10px]">
                  ▶ Complete Quest (+{quest.xpReward} XP)
                </button>
              )}
              {quest.type === 'quiz' && quizSubmitted && quizScore.passed && (
                <button onClick={handleComplete} className="btn-pixel text-[10px]">
                  ▶ Complete Quest (+{quest.xpReward} XP)
                </button>
              )}
              {quest.type === 'quiz' && quizSubmitted && !quizScore.passed && (
                <button
                  onClick={handleRetryQuiz}
                  className="btn-pixel text-[10px] bg-brand-purple/40 hover:bg-brand-purple text-brand-gold"
                >
                  🔄 Try Again
                </button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function LessonContent({ blocks }: { blocks: LessonBlock[] }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [guidedMode, setGuidedMode] = useState(blocks.length > 2)

  const { progressPct, isFinalStep } = calculateLessonProgress(currentStep, blocks.length)

  const renderBlock = (block: LessonBlock, i: number) => {
    if (block.type === 'text') {
      return (
        <div
          key={i}
          className="prose prose-invert prose-sm max-w-none font-sans text-brand-gold/80"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(block.content) }}
        />
      )
    }
    if (block.type === 'callout') {
      const colors = {
        info: 'border-stellar-blue/40 bg-stellar-blue/10',
        tip: 'border-stellar-green/40 bg-stellar-green/10',
        warning: 'border-yellow-500/40 bg-yellow-500/10',
      }
      return (
        <div
          key={i}
          className={`rounded-lg border px-4 py-3 font-sans text-sm text-brand-gold/80 ${colors[block.variant ?? 'info']}`}
        >
          {block.content}
        </div>
      )
    }
    if (block.type === 'code') {
      return (
        <pre key={i} className="code-block">
          <code>{block.content}</code>
        </pre>
      )
    }
    return null
  }

  if (!guidedMode || blocks.length <= 1) {
    return (
      <div className="space-y-4">
        {blocks.length > 1 && (
          <div className="flex justify-end">
            <button
              onClick={() => setGuidedMode(true)}
              className="font-pixel text-[9px] text-brand-gold/40 hover:text-brand-gold transition"
            >
              Switch to Step-by-Step Reader →
            </button>
          </div>
        )}
        {blocks.map((block, i) => renderBlock(block, i))}
      </div>
    )
  }

  const activeBlock = blocks[currentStep]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-brand-purple/20 pb-2">
        <div className="flex items-center gap-2 font-pixel text-[10px] text-brand-gold/70">
          <span>
            Section {currentStep + 1} of {blocks.length}
          </span>
          <span className="text-brand-gold/30">•</span>
          <span className="text-stellar-blue">{progressPct}% read</span>
        </div>
        <button
          onClick={() => setGuidedMode(false)}
          className="font-pixel text-[9px] text-brand-gold/40 hover:text-brand-gold transition"
        >
          View All
        </button>
      </div>

      <div className="min-h-[120px] py-2">
        {activeBlock && renderBlock(activeBlock, currentStep)}
      </div>

      <div className="flex items-center justify-between border-t border-brand-purple/20 pt-3">
        <button
          disabled={currentStep === 0}
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          className={`font-pixel text-[10px] text-brand-gold/60 hover:text-brand-gold transition ${
            currentStep === 0 ? 'opacity-30 cursor-not-allowed' : ''
          }`}
        >
          ← Previous
        </button>
        <div className="flex gap-1.5">
          {blocks.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-2 w-2 rounded-full transition ${
                idx === currentStep
                  ? 'bg-brand-gold'
                  : idx < currentStep
                    ? 'bg-brand-gold/40'
                    : 'bg-brand-purple/30'
              }`}
            />
          ))}
        </div>
        <button
          disabled={isFinalStep}
          onClick={() => setCurrentStep(Math.min(blocks.length - 1, currentStep + 1))}
          className={`font-pixel text-[10px] text-brand-gold/80 hover:text-brand-gold transition ${
            isFinalStep ? 'opacity-30 cursor-not-allowed' : 'text-stellar-blue'
          }`}
        >
          Next Section →
        </button>
      </div>
    </div>
  )
}

function QuizContent({
  questions,
  answers,
  submitted,
  onChange,
  onSubmit,
}: {
  questions: QuizQuestion[]
  answers: Record<string, string>
  submitted: boolean
  onChange: (answers: Record<string, string>) => void
  onSubmit: () => void
}) {
  const allAnswered = questions.every((q) => answers[q.id] !== undefined)
  const score = questions.filter((q) => {
    const selectedId = answers[q.id]
    return q.options.find((o) => o.id === selectedId)?.isCorrect
  }).length

  return (
    <div className="space-y-6">
      {questions.map((q) => (
        <div key={q.id} className="rounded-lg border border-brand-purple/20 bg-brand-dark-3 p-4">
          <p className="mb-4 font-sans text-sm font-medium text-brand-gold">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt) => {
              const isSelected = answers[q.id] === opt.id
              const isCorrect = opt.isCorrect
              const showResult = submitted

              let optClass = 'border-brand-dark-4 bg-brand-dark-2 text-brand-gold/70'
              if (isSelected && !showResult)
                optClass = 'border-brand-purple bg-brand-purple/20 text-brand-gold'
              if (showResult && isCorrect)
                optClass = 'border-green-500 bg-green-500/20 text-green-400'
              if (showResult && isSelected && !isCorrect)
                optClass = 'border-red-500 bg-red-500/20 text-red-400'

              return (
                <button
                  key={opt.id}
                  disabled={submitted}
                  onClick={() => onChange({ ...answers, [q.id]: opt.id })}
                  className={`w-full rounded border px-4 py-2 text-left font-sans text-sm transition ${optClass}`}
                >
                  {opt.text}
                </button>
              )
            })}
          </div>
          {submitted && (
            <p className="mt-3 font-sans text-xs text-brand-gold/60 italic">{q.explanation}</p>
          )}
        </div>
      ))}

      {!submitted && (
        <button
          onClick={onSubmit}
          disabled={!allAnswered}
          className={`btn-pixel w-full text-[10px] ${!allAnswered ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          Submit Answers
        </button>
      )}

      {submitted && (
        <div className="rounded-lg border border-brand-gold/20 bg-brand-dark-3 p-4 text-center">
          <div className="font-pixel text-xl text-brand-gold-bright">
            {score}/{questions.length}
          </div>
          <div className="font-pixel text-[10px] text-brand-gold/60 mt-1">
            {score === questions.length
              ? '🏆 Perfect Score! Passed!'
              : score / questions.length >= QUIZ_PASS_RATIO
                ? '✅ Passed! Ready to complete quest.'
                : '📚 Score below 70% passing threshold. Review answers and try again!'}
          </div>
        </div>
      )}
    </div>
  )
}

// Markdown table block → HTML table (comparison tables like "XLM vs Bitcoin").
function renderTable(mdTable: string): string {
  const rows = mdTable
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const isSeparator = (l: string) => /^\|(?:\s*:?-+:?\s*\|)+\s*$/.test(l)
  const parseRow = (l: string) =>
    l
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim())

  const header = rows.find((l) => !isSeparator(l))
  const body = rows.filter((l) => l !== header && !isSeparator(l))

  const thead = header
    ? `<thead><tr>${parseRow(header)
        .map((c) => `<th>${c}</th>`)
        .join('')}</tr></thead>`
    : ''
  const tbody = body.length
    ? `<tbody>${body
        .map(
          (r) =>
            `<tr>${parseRow(r)
              .map((c) => `<td>${c}</td>`)
              .join('')}</tr>`
        )
        .join('')}</tbody>`
    : ''

  return `<table class="lesson-table">${thead}${tbody}</table>`
}

// Very minimal markdown → HTML converter for lesson content
function markdownToHtml(md: string): string {
  return md
    .replace(/(?:^\|.+\|[ \t]*$)(?:\n^\|.+\|[ \t]*$)*/gm, renderTable)
    .replace(/^## (.+)$/gm, '<h2 class="font-pixel text-sm text-brand-gold mt-6 mb-3">$1</h2>')
    .replace(
      /^### (.+)$/gm,
      '<h3 class="font-pixel text-xs text-brand-purple-light mt-4 mb-2">$1</h3>'
    )
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-brand-gold font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(
      /`(.+?)`/g,
      '<code class="rounded bg-brand-dark-3 px-1 py-0.5 font-mono text-brand-purple-light text-xs">$1</code>'
    )
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/^(.+)$/gm, (line) => {
      if (line.startsWith('<')) return line
      return `<p class="mb-3">${line}</p>`
    })
}
