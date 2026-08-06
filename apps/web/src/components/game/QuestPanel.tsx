'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LessonBlock, Quest, QuizQuestion } from '@stellar-learn/content'
import {
  getQuestions,
  getTeachingPages,
  isAnswerCorrect,
  scoreQuest,
  type LessonPage,
  type QuestResult,
} from './questFlow'

/**
 * QuestPanel — the gated "teach, then test" quest overlay.
 *
 * A quest always walks the same three phases:
 *   1. `teach`  — the lesson (or challenge brief) as paginated steps the
 *                 player clicks through one at a time.
 *   2. `quiz`   — the quest's questions, asked one at a time. The player must
 *                 answer before advancing and sees the explanation afterwards.
 *   3. `result` — the computed score and pass/fail, which is what actually
 *                 completes the quest and feeds the boss battle.
 *
 * A quest can therefore never be completed without working through its
 * questions: the "Complete Quest" control only exists in the `result` phase,
 * and the only route there is answering every question.
 */
type Phase = 'teach' | 'quiz' | 'result'

interface QuestPanelProps {
  quest: Quest | null
  /** Called once the player finishes the quest, with the computed result. */
  onComplete: (result: QuestResult) => void
  /** Called when the player leaves without finishing (emits `quest-closed`). */
  onClose: () => void
}

export function QuestPanel({ quest, onComplete, onClose }: QuestPanelProps) {
  const pages = useMemo<LessonPage[]>(() => (quest ? getTeachingPages(quest) : []), [quest])
  const questions = useMemo<QuizQuestion[]>(() => (quest ? getQuestions(quest) : []), [quest])

  const firstPhase: Phase = pages.length > 0 ? 'teach' : questions.length > 0 ? 'quiz' : 'result'

  const [phase, setPhase] = useState<Phase>(firstPhase)
  const [pageIndex, setPageIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  /** Question ids whose answer has been locked in and explained. */
  const [revealed, setRevealed] = useState<Record<string, true>>({})

  // Opening a different quest restarts the flow from its first teaching step.
  useEffect(() => {
    setPhase(firstPhase)
    setPageIndex(0)
    setQuestionIndex(0)
    setAnswers({})
    setRevealed({})
  }, [quest?.id, firstPhase])

  if (!quest) return null

  const totalSteps = pages.length + questions.length
  const stepNumber =
    phase === 'teach' ? pageIndex + 1 : phase === 'quiz' ? pages.length + questionIndex + 1 : totalSteps

  const startQuestions = () => {
    setPhase(questions.length > 0 ? 'quiz' : 'result')
  }

  const revealAnswer = (question: QuizQuestion) => {
    setRevealed((prev) => ({ ...prev, [question.id]: true }))
  }

  const advanceQuestion = () => {
    if (questionIndex + 1 < questions.length) {
      setQuestionIndex(questionIndex + 1)
    } else {
      setPhase('result')
    }
  }

  const retryQuestions = () => {
    setAnswers({})
    setRevealed({})
    setQuestionIndex(0)
    setPhase(questions.length > 0 ? 'quiz' : 'teach')
  }

  const reviewLesson = () => {
    setPageIndex(0)
    setPhase('teach')
  }

  const handleComplete = () => {
    const { score, total, passed } = scoreQuest(quest, answers)
    onComplete({ questId: quest.id, xpEarned: quest.xpReward, passed, score, total })
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
          className="quest-panel-inner"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="mb-1 font-pixel text-[10px] uppercase text-brand-purple-light">
                {phaseLabel(phase, quest.type)}
              </div>
              <h2 className="font-pixel text-sm text-brand-gold">{quest.title}</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close quest"
              className="font-pixel text-xs text-brand-gold/50 transition hover:text-brand-gold"
            >
              ✕
            </button>
          </div>

          {/* Step progress — makes the gating visible instead of surprising */}
          {totalSteps > 0 && (
            <div className="mb-5">
              <div className="mb-2 flex justify-between font-pixel text-[8px] text-brand-gold/50">
                <span>
                  {phase === 'result' ? 'Result' : `Step ${stepNumber} of ${totalSteps}`}
                </span>
                <span>
                  {quest.xpReward} XP · ~{quest.estimatedMinutes} min
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded bg-brand-dark-3">
                <motion.div
                  className="h-full bg-brand-gold"
                  initial={false}
                  animate={{ width: `${(stepNumber / totalSteps) * 100}%` }}
                  transition={{ duration: 0.25 }}
                />
              </div>
            </div>
          )}

          {/* Body */}
          <div className="mb-8 min-h-[180px]">
            {phase === 'teach' && (
              <TeachingStep key={`page-${pageIndex}`} page={pages[pageIndex]} />
            )}

            {phase === 'quiz' && questions[questionIndex] && (
              <QuestionStep
                key={questions[questionIndex]!.id}
                question={questions[questionIndex]!}
                selectedId={answers[questions[questionIndex]!.id]}
                revealed={revealed[questions[questionIndex]!.id] === true}
                onSelect={(optionId) =>
                  setAnswers((prev) => ({ ...prev, [questions[questionIndex]!.id]: optionId }))
                }
              />
            )}

            {phase === 'result' && <ResultStep quest={quest} answers={answers} />}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-end gap-4">
            {phase === 'teach' && (
              <>
                <button
                  onClick={onClose}
                  className="mr-auto font-pixel text-[10px] text-brand-gold/50 transition hover:text-brand-gold"
                >
                  Save &amp; Exit
                </button>
                {pageIndex > 0 && (
                  <button
                    onClick={() => setPageIndex(pageIndex - 1)}
                    className="font-pixel text-[10px] text-brand-gold/60 transition hover:text-brand-gold"
                  >
                    ‹ Back
                  </button>
                )}
                {pageIndex + 1 < pages.length ? (
                  <button onClick={() => setPageIndex(pageIndex + 1)} className="btn-pixel text-[10px]">
                    Continue ▶
                  </button>
                ) : (
                  <button onClick={startQuestions} className="btn-pixel text-[10px]">
                    {questions.length > 0
                      ? `Start Questions (${questions.length}) ▶`
                      : 'Finish Lesson ▶'}
                  </button>
                )}
              </>
            )}

            {phase === 'quiz' && questions[questionIndex] && (
              <QuestionControls
                question={questions[questionIndex]!}
                selectedId={answers[questions[questionIndex]!.id]}
                revealed={revealed[questions[questionIndex]!.id] === true}
                isLast={questionIndex + 1 === questions.length}
                onClose={onClose}
                onCheck={() => revealAnswer(questions[questionIndex]!)}
                onNext={advanceQuestion}
              />
            )}

            {phase === 'result' && (
              <ResultControls
                quest={quest}
                answers={answers}
                hasLesson={pages.length > 0}
                onReview={reviewLesson}
                onRetry={retryQuestions}
                onComplete={handleComplete}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function phaseLabel(phase: Phase, questType: Quest['type']): string {
  if (phase === 'quiz') return '❓ Question Time'
  if (phase === 'result') return '📊 Result'
  if (questType === 'challenge') return '⚔️ Challenge'
  if (questType === 'boss') return '👹 Boss Battle'
  return '📖 Lesson'
}

/** A single paginated teaching step. */
function TeachingStep({ page }: { page: LessonPage | undefined }) {
  if (!page) return null
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {page.title && <h3 className="font-pixel text-xs text-brand-gold">{page.title}</h3>}
      {page.blocks.map((block, i) => (
        <LessonBlockView key={i} block={block} />
      ))}
    </motion.div>
  )
}

function LessonBlockView({ block }: { block: LessonBlock }) {
  if (block.type === 'text') {
    return (
      <div
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
        className={`rounded-lg border px-4 py-3 font-sans text-sm text-brand-gold/80 ${colors[block.variant ?? 'info']}`}
        dangerouslySetInnerHTML={{ __html: markdownToHtml(block.content) }}
      />
    )
  }

  if (block.type === 'code') {
    return (
      <pre className="code-block">
        <code>{block.content}</code>
      </pre>
    )
  }

  return null
}

/** One quiz question. Options lock the moment the answer is checked. */
function QuestionStep({
  question,
  selectedId,
  revealed,
  onSelect,
}: {
  question: QuizQuestion
  selectedId: string | undefined
  revealed: boolean
  onSelect: (optionId: string) => void
}) {
  const correct = isAnswerCorrect(question, selectedId)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <p className="mb-4 font-sans text-sm font-medium text-brand-gold">{question.question}</p>
      <div className="space-y-2">
        {question.options.map((option) => {
          const isSelected = selectedId === option.id

          let optClass = 'border-brand-dark-4 bg-brand-dark-2 text-brand-gold/70 hover:border-brand-purple/60'
          if (isSelected && !revealed) {
            optClass = 'border-brand-purple bg-brand-purple/20 text-brand-gold'
          }
          if (revealed && option.isCorrect) {
            optClass = 'border-green-500 bg-green-500/20 text-green-400'
          }
          if (revealed && isSelected && !option.isCorrect) {
            optClass = 'border-red-500 bg-red-500/20 text-red-400'
          }

          return (
            <button
              key={option.id}
              disabled={revealed}
              aria-pressed={isSelected}
              onClick={() => onSelect(option.id)}
              className={`w-full rounded border px-4 py-2 text-left font-sans text-sm transition ${optClass} ${
                revealed ? 'cursor-default' : ''
              }`}
            >
              {option.text}
            </button>
          )
        })}
      </div>

      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 rounded-lg border px-4 py-3 ${
            correct ? 'border-green-500/40 bg-green-500/10' : 'border-red-500/40 bg-red-500/10'
          }`}
        >
          <div
            className={`mb-2 font-pixel text-[10px] ${correct ? 'text-green-400' : 'text-red-400'}`}
          >
            {correct ? '✔ Correct' : '✖ Not quite'}
          </div>
          <p className="font-sans text-xs leading-relaxed text-brand-gold/70">
            {question.explanation}
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}

function QuestionControls({
  question,
  selectedId,
  revealed,
  isLast,
  onClose,
  onCheck,
  onNext,
}: {
  question: QuizQuestion
  selectedId: string | undefined
  revealed: boolean
  isLast: boolean
  onClose: () => void
  onCheck: () => void
  onNext: () => void
}) {
  const hasAnswer = selectedId !== undefined && question.options.some((o) => o.id === selectedId)

  return (
    <>
      <button
        onClick={onClose}
        className="mr-auto font-pixel text-[10px] text-brand-gold/50 transition hover:text-brand-gold"
      >
        Save &amp; Exit
      </button>
      {!revealed ? (
        <button
          onClick={onCheck}
          disabled={!hasAnswer}
          className={`btn-pixel text-[10px] ${!hasAnswer ? 'cursor-not-allowed opacity-40' : ''}`}
        >
          {hasAnswer ? 'Check Answer ▶' : 'Pick an answer'}
        </button>
      ) : (
        <button onClick={onNext} className="btn-pixel text-[10px]">
          {isLast ? 'See Result ▶' : 'Next Question ▶'}
        </button>
      )}
    </>
  )
}

function ResultStep({ quest, answers }: { quest: Quest; answers: Record<string, string> }) {
  const { score, total, passed } = scoreQuest(quest, answers)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-3 py-6 text-center"
    >
      <div className={`font-pixel text-2xl ${passed ? 'text-brand-gold-bright' : 'text-red-400'}`}>
        {passed ? 'PASSED' : 'NOT YET'}
      </div>
      {total > 0 && (
        <div className="font-pixel text-sm text-brand-gold">
          {score}/{total} correct
        </div>
      )}
      <p className="max-w-md font-sans text-sm text-brand-gold/70">
        {total === 0
          ? 'Lesson complete. This knowledge will be tested when you face the world boss.'
          : passed
            ? 'You understand this material. It will count in your favour in the boss battle.'
            : 'Review the lesson and try the questions again — the boss will test exactly this.'}
      </p>
      {passed && (
        <div className="font-pixel text-[10px] text-brand-gold/60">+{quest.xpReward} XP earned</div>
      )}
    </motion.div>
  )
}

function ResultControls({
  quest,
  answers,
  hasLesson,
  onReview,
  onRetry,
  onComplete,
}: {
  quest: Quest
  answers: Record<string, string>
  hasLesson: boolean
  onReview: () => void
  onRetry: () => void
  onComplete: () => void
}) {
  const { total, passed } = scoreQuest(quest, answers)

  // A failed attempt still finishes the quest if the player insists — the
  // failure is recorded and the world boss settles it later.
  return (
    <>
      {hasLesson && (
        <button
          onClick={onReview}
          className="mr-auto font-pixel text-[10px] text-brand-gold/50 transition hover:text-brand-gold"
        >
          ‹ Review Lesson
        </button>
      )}
      {!passed && total > 0 && (
        <>
          <button
            onClick={onComplete}
            className="font-pixel text-[10px] text-brand-gold/50 transition hover:text-brand-gold"
          >
            Move on anyway
          </button>
          <button onClick={onRetry} className="btn-pixel text-[10px]">
            ↺ Try Questions Again
          </button>
        </>
      )}
      {(passed || total === 0) && (
        <button onClick={onComplete} className="btn-pixel text-[10px]">
          ▶ Complete Quest (+{quest.xpReward} XP)
        </button>
      )}
    </>
  )
}

// Very minimal markdown → HTML converter for lesson content. Input comes from
// the trusted `@stellar-learn/content` package, never from players.
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="font-pixel text-xs text-brand-purple-light mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-pixel text-sm text-brand-gold mt-6 mb-3">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-brand-gold font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-brand-dark-3 px-1 py-0.5 font-mono text-brand-purple-light text-xs">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc mb-1">$1</li>')
    .replace(/^(.+)$/gm, (line) => {
      if (line.startsWith('<')) return line
      return `<p class="mb-3">${line}</p>`
    })
}
