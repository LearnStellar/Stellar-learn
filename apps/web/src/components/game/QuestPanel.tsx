'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import type { Quest, LessonBlock, QuizQuestion, ChallengeSpec, ValidationRule } from '@stellar-learn/content'
import { runChallenge, type ChallengeRunResult } from '@/lib/challengeRunner'

/** Minimum share of correct quiz answers that counts as passing the quest. */
const QUIZ_PASS_RATIO = 0.7

// Monaco pulls in browser-only worker/DOM APIs — load it client-side only,
// same reasoning CLAUDE.md rule 1 gives for keeping Phaser out of SSR.
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface QuestPanelProps {
  quest: Quest | null
  onComplete: (questId: string, xpEarned: number, passed: boolean) => void
  onClose: () => void
}

export function QuestPanel({ quest, onComplete, onClose }: QuestPanelProps) {
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [challengePassed, setChallengePassed] = useState(false)

  if (!quest) return null

  const handleComplete = () => {
    // Pass/fail feeds the boss-battle outcome: lessons pass by being read,
    // quizzes require QUIZ_PASS_RATIO of the answers to be correct, and
    // challenges can only be completed once their validation has passed
    // (the Complete Quest button is gated on challengePassed below).
    let passed = true
    if (quest.type === 'quiz') {
      const questions = quest.content as QuizQuestion[]
      const score = questions.filter(
        (q) => q.options.find((o) => o.id === quizAnswers[q.id])?.isCorrect
      ).length
      passed = questions.length === 0 || score / questions.length >= QUIZ_PASS_RATIO
    } else if (quest.type === 'challenge') {
      passed = challengePassed
    }
    onComplete(quest.id, quest.xpReward, passed)
    setQuizAnswers({})
    setQuizSubmitted(false)
    setChallengePassed(false)
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
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="mb-1 font-pixel text-[10px] text-brand-purple-light uppercase">
                {quest.type === 'lesson' ? '📖 Lesson' :
                 quest.type === 'quiz' ? '❓ Quiz' :
                 quest.type === 'challenge' ? '⚔️ Challenge' : '👹 Boss Battle'}
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
            {quest.type === 'lesson' && (
              <LessonContent blocks={quest.content as LessonBlock[]} />
            )}
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
                spec={quest.content as ChallengeSpec}
                onValidated={setChallengePassed}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="font-pixel text-[10px] text-brand-gold/50 transition hover:text-brand-gold"
            >
              Save & Exit
            </button>
            {(quest.type === 'lesson' ||
              (quest.type === 'quiz' && quizSubmitted) ||
              (quest.type === 'challenge' && challengePassed)) && (
              <button onClick={handleComplete} className="btn-pixel text-[10px]">
                ▶ Complete Quest (+{quest.xpReward} XP)
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function LessonContent({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
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
      })}
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
              if (isSelected && !showResult) optClass = 'border-brand-purple bg-brand-purple/20 text-brand-gold'
              if (showResult && isCorrect) optClass = 'border-green-500 bg-green-500/20 text-green-400'
              if (showResult && isSelected && !isCorrect) optClass = 'border-red-500 bg-red-500/20 text-red-400'

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
            {score === questions.length ? '🏆 Perfect Score!' :
             score >= questions.length * 0.7 ? '✅ Well done!' : '📚 Keep studying!'}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Challenge content: a Monaco editor seeded with `starterCode`, hints the
 * player can reveal one at a time, and a "Run & Validate" button that
 * executes the code against the Stellar testnet and checks every
 * `ValidationRule` in the spec. `onValidated` fires once validation passes,
 * which is what unlocks the panel's "Complete Quest" button.
 */
function ChallengeContent({
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
    <div className="space-y-4">
      <p className="font-sans text-sm text-brand-gold/80">{spec.description}</p>

      {spec.testnetRequired && (
        <div className="rounded-lg border border-stellar-blue/40 bg-stellar-blue/10 px-4 py-2 font-sans text-xs text-brand-gold/70">
          This challenge submits real operations to the Stellar <strong>testnet</strong> — never mainnet.
        </div>
      )}

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
          {hintsShown >= spec.hints.length ? '💡 No more hints' : `💡 Get a hint (${hintsShown + 1}/${spec.hints.length})`}
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
            result.passed ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-red-500 bg-red-500/10 text-red-400'
          }`}
        >
          <p className="mb-2 font-pixel text-xs">
            {result.passed ? '✅ All checks passed!' : '❌ Some checks failed'}
          </p>
          {result.runtimeError && (
            <p className="mb-2 font-sans text-xs text-red-300">Your code threw an error: {result.runtimeError}</p>
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
    </div>
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

// Very minimal markdown → HTML converter for lesson content
function markdownToHtml(md: string): string {
  return md
    .replace(/^## (.+)$/gm, '<h2 class="font-pixel text-sm text-brand-gold mt-6 mb-3">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="font-pixel text-xs text-brand-purple-light mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-brand-gold font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-brand-dark-3 px-1 py-0.5 font-mono text-brand-purple-light text-xs">$1</code>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/^(.+)$/gm, (line) => {
      if (line.startsWith('<')) return line
      return `<p class="mb-3">${line}</p>`
    })
}
