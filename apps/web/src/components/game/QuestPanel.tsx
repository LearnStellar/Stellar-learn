'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import type {
  ChallengeSpec,
  LessonBlock,
  Quest,
  QuizQuestion,
  ValidationRule,
} from '@stellar-learn/content'
import { runChallenge, type ChallengeRunResult } from '@/lib/challengeRunner'
import {
  getQuestions,
  getTeachingPages,
  isAnswerCorrect,
  isChallengeQuest,
  scoreQuest,
  type LessonPage,
  type QuestResult,
} from './questFlow'

/**
 * QuestPanel — the gated "teach, then test" quest overlay.
 *
 * A quest always walks the same shape: it teaches, then it tests, then it
 * reports. The phases are:
 *
 *   1. `teach`     — the lesson (or the challenge brief) as paginated steps the
 *                    player clicks through one at a time.
 *   2. `challenge` — for challenge quests: the code editor and its testnet
 *                    validation. The player cannot advance until it passes.
 *   3. `quiz`      — the quest's questions, asked one at a time. The player must
 *                    answer before advancing and sees the explanation after.
 *   4. `result`    — the computed score and pass/fail, which is what actually
 *                    completes the quest and feeds the boss battle.
 *
 * A quest can therefore never be completed without doing its test: the
 * "Complete Quest" control only exists in the `result` phase, and the only
 * route there is validating the challenge and answering every question.
 */
type Phase = 'teach' | 'challenge' | 'quiz' | 'result'

// Monaco pulls in browser-only worker/DOM APIs — load it client-side only,
// same reasoning CLAUDE.md rule 1 gives for keeping Phaser out of SSR.
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface QuestPanelProps {
  quest: Quest | null
  /**
   * Called once the player finishes the quest, with the computed result:
   * `passed` feeds the boss-battle outcome (Issue #4) and `scorePct` is the
   * quiz correctness percentage tracked per world and persisted.
   */
  onComplete: (result: QuestResult) => void
  /** Called when the player leaves without finishing (emits `quest-closed`). */
  onClose: () => void
}

export function QuestPanel({ quest, onComplete, onClose }: QuestPanelProps) {
  const pages = useMemo<LessonPage[]>(() => (quest ? getTeachingPages(quest) : []), [quest])
  const questions = useMemo<QuizQuestion[]>(() => (quest ? getQuestions(quest) : []), [quest])
  const isChallenge = quest ? isChallengeQuest(quest) : false

  // Where the flow starts, and where each phase hands over. Both derive from
  // what the quest actually carries, so a lesson with no questions and a
  // challenge with a follow-up quiz walk the same machine.
  const afterTeach: Phase = isChallenge ? 'challenge' : questions.length > 0 ? 'quiz' : 'result'
  const afterChallenge: Phase = questions.length > 0 ? 'quiz' : 'result'
  const firstPhase: Phase = pages.length > 0 ? 'teach' : afterTeach

  const [phase, setPhase] = useState<Phase>(firstPhase)
  const [pageIndex, setPageIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  /** Question ids whose answer has been locked in and explained. */
  const [revealed, setRevealed] = useState<Record<string, true>>({})
  /** Set once the challenge runner reports every validation rule passing. */
  const [challengePassed, setChallengePassed] = useState(false)

  // Opening a different quest restarts the flow from its first teaching step.
  useEffect(() => {
    setPhase(firstPhase)
    setPageIndex(0)
    setQuestionIndex(0)
    setAnswers({})
    setRevealed({})
    setChallengePassed(false)
  }, [quest?.id, firstPhase])

  if (!quest) return null

  const totalSteps = pages.length + (isChallenge ? 1 : 0) + questions.length
  const stepNumber =
    phase === 'teach'
      ? pageIndex + 1
      : phase === 'challenge'
        ? pages.length + 1
        : phase === 'quiz'
          ? pages.length + (isChallenge ? 1 : 0) + questionIndex + 1
          : totalSteps

  const result = scoreQuest(quest, answers, challengePassed)

  const advanceQuestion = () => {
    if (questionIndex + 1 < questions.length) setQuestionIndex(questionIndex + 1)
    else setPhase('result')
  }

  const retryQuestions = () => {
    setAnswers({})
    setRevealed({})
    setQuestionIndex(0)
    setPhase(questions.length > 0 ? 'quiz' : isChallenge ? 'challenge' : 'teach')
  }

  const reviewLesson = () => {
    setPageIndex(0)
    setPhase('teach')
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
                <span>{phase === 'result' ? 'Result' : `Step ${stepNumber} of ${totalSteps}`}</span>
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
            {phase === 'teach' && <TeachingStep key={`page-${pageIndex}`} page={pages[pageIndex]} />}

            {phase === 'challenge' && (
              <ChallengeStep
                spec={quest.content as ChallengeSpec}
                onValidated={setChallengePassed}
              />
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

            {phase === 'result' && <ResultStep quest={quest} result={result} />}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-end gap-4">
            <button
              onClick={onClose}
              className="mr-auto font-pixel text-[10px] text-brand-gold/50 transition hover:text-brand-gold"
            >
              {phase === 'result' ? 'Close' : 'Save & Exit'}
            </button>

            {phase === 'teach' && (
              <>
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
                  <button onClick={() => setPhase(afterTeach)} className="btn-pixel text-[10px]">
                    {afterTeach === 'challenge'
                      ? 'Start the Challenge ▶'
                      : afterTeach === 'quiz'
                        ? `Start Questions (${questions.length}) ▶`
                        : 'Finish Lesson ▶'}
                  </button>
                )}
              </>
            )}

            {phase === 'challenge' && (
              <>
                {pages.length > 0 && (
                  <button
                    onClick={reviewLesson}
                    className="font-pixel text-[10px] text-brand-gold/60 transition hover:text-brand-gold"
                  >
                    ‹ Re-read Brief
                  </button>
                )}
                <button
                  onClick={() => setPhase(afterChallenge)}
                  disabled={!challengePassed}
                  className={`btn-pixel text-[10px] ${!challengePassed ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  {challengePassed
                    ? afterChallenge === 'quiz'
                      ? `Start Questions (${questions.length}) ▶`
                      : 'See Result ▶'
                    : 'Validate your code first'}
                </button>
              </>
            )}

            {phase === 'quiz' && questions[questionIndex] && (
              <QuestionControls
                question={questions[questionIndex]!}
                selectedId={answers[questions[questionIndex]!.id]}
                revealed={revealed[questions[questionIndex]!.id] === true}
                isLast={questionIndex + 1 === questions.length}
                onCheck={() =>
                  setRevealed((prev) => ({ ...prev, [questions[questionIndex]!.id]: true }))
                }
                onNext={advanceQuestion}
              />
            )}

            {phase === 'result' && (
              <ResultControls
                quest={quest}
                result={result}
                hasLesson={pages.length > 0}
                onReview={reviewLesson}
                onRetry={retryQuestions}
                onComplete={() => onComplete(result)}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function phaseLabel(phase: Phase, questType: Quest['type']): string {
  if (phase === 'challenge') return '⚔️ Challenge'
  if (phase === 'quiz') return '❓ Question Time'
  if (phase === 'result') return '📊 Result'
  if (questType === 'challenge') return '⚔️ Challenge Brief'
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

/**
 * The challenge test phase: a Monaco editor seeded with `starterCode`, hints
 * the player can reveal one at a time, and a "Run & Validate" button that runs
 * the code against the Stellar testnet and checks every `ValidationRule` in
 * the spec. `onValidated` reports the outcome, which is what unlocks the
 * panel's Continue control.
 */
function ChallengeStep({
  spec,
  onValidated,
}: {
  spec: ChallengeSpec
  onValidated: (passed: boolean) => void
}) {
  const [code, setCode] = useState(spec.starterCode)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ChallengeRunResult | null>(null)
  const [hintsShown, setHintsShown] = useState(0)

  const handleRun = async () => {
    setRunning(true)
    setResult(null)
    const outcome = await runChallenge(code, spec)
    setResult(outcome)
    onValidated(outcome.passed)
    setRunning(false)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <p className="font-sans text-sm text-brand-gold/80">{spec.description}</p>

      <div className="overflow-hidden rounded-lg border border-brand-purple/20">
        <MonacoEditor
          height="260px"
          language="javascript"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value ?? '')}
          options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setHintsShown((n) => Math.min(n + 1, spec.hints.length))}
          disabled={hintsShown >= spec.hints.length}
          className="font-pixel text-[10px] text-brand-gold/50 transition hover:text-brand-gold disabled:cursor-not-allowed disabled:opacity-30"
        >
          {hintsShown >= spec.hints.length
            ? '💡 No more hints'
            : `💡 Get a hint (${hintsShown + 1}/${spec.hints.length})`}
        </button>
        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={running}
          className="btn-pixel text-[10px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? 'Validating on testnet…' : '▶ Run & Validate'}
        </button>
      </div>

      {hintsShown > 0 && (
        <ul className="space-y-1 rounded-lg border border-brand-gold/20 bg-brand-dark-3 p-4 font-sans text-xs text-brand-gold/70">
          {spec.hints.slice(0, hintsShown).map((hint, i) => (
            <li key={i}>💡 {hint}</li>
          ))}
        </ul>
      )}

      {result && (
        <div
          className={`rounded-lg border p-4 font-sans text-sm ${
            result.passed
              ? 'border-green-500 bg-green-500/10 text-green-400'
              : 'border-red-500 bg-red-500/10 text-red-400'
          }`}
        >
          <p className="mb-2 font-pixel text-xs">
            {result.passed ? '✅ All checks passed!' : '❌ Some checks failed'}
          </p>
          {result.runtimeError && (
            <p className="mb-2 font-sans text-xs text-red-300">
              Your code threw an error: {result.runtimeError}
            </p>
          )}
          <ul className="space-y-1 font-sans text-xs">
            {result.ruleResults.map((r, i) => (
              <li key={i} className={r.passed ? 'text-green-400' : 'text-red-300'}>
                {r.passed ? '✔' : '✘'} {r.passed ? ruleLabel(r.rule) : r.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}

/** Friendly label for a rule that passed (failures already show its errorMessage). */
function ruleLabel(rule: ValidationRule): string {
  switch (rule.type) {
    case 'code_contains':
      return `Code calls ${String(rule.params.substring ?? '...')}`
    case 'account_created':
      return 'Account exists on testnet'
    case 'balance_check':
      return 'Balance meets the required minimum'
    case 'tx_success':
      return 'Transaction succeeded'
    case 'asset_issued':
      return 'Asset trustline and balance confirmed'
    default:
      return 'Check passed'
  }
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

          let optClass =
            'border-brand-dark-4 bg-brand-dark-2 text-brand-gold/70 hover:border-brand-purple/60'
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
          <div className={`mb-2 font-pixel text-[10px] ${correct ? 'text-green-400' : 'text-red-400'}`}>
            {correct ? '✔ Correct' : '✖ Not quite'}
          </div>
          <p className="font-sans text-xs leading-relaxed text-brand-gold/70">{question.explanation}</p>
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
  onCheck,
  onNext,
}: {
  question: QuizQuestion
  selectedId: string | undefined
  revealed: boolean
  isLast: boolean
  onCheck: () => void
  onNext: () => void
}) {
  const hasAnswer = selectedId !== undefined && question.options.some((o) => o.id === selectedId)

  if (revealed) {
    return (
      <button onClick={onNext} className="btn-pixel text-[10px]">
        {isLast ? 'See Result ▶' : 'Next Question ▶'}
      </button>
    )
  }

  return (
    <button
      onClick={onCheck}
      disabled={!hasAnswer}
      className={`btn-pixel text-[10px] ${!hasAnswer ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      {hasAnswer ? 'Check Answer ▶' : 'Pick an answer'}
    </button>
  )
}

function ResultStep({ quest, result }: { quest: Quest; result: QuestResult }) {
  const { score, total, passed } = result

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
          ? 'Quest complete. This knowledge will be tested when you face the world boss.'
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
  result,
  hasLesson,
  onReview,
  onRetry,
  onComplete,
}: {
  quest: Quest
  result: QuestResult
  hasLesson: boolean
  onReview: () => void
  onRetry: () => void
  onComplete: () => void
}) {
  const { passed, total } = result

  // A failed attempt still finishes the quest if the player insists — the
  // failure is recorded and the world boss settles it later.
  return (
    <>
      {hasLesson && (
        <button
          onClick={onReview}
          className="font-pixel text-[10px] text-brand-gold/60 transition hover:text-brand-gold"
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
