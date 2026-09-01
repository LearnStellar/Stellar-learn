'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Circle,
  CircleX,
  Lightbulb,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
  Terminal,
} from 'lucide-react'
import type { ChallengeSpec } from '@stellar-learn/content'
import { PixelButton } from '@/components/ui'
import {
  runChallenge,
  type ChallengeRunResult,
} from '@/lib/challengeRunner'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[390px] items-center justify-center bg-[#0d1117] font-pixel text-[10px] text-brand-gold/60">
      Loading editor...
    </div>
  ),
})

interface ChallengeContentProps {
  questId: string
  challenge: ChallengeSpec
  onPassed: () => void
}

export function ChallengeContent({ questId, challenge, onPassed }: ChallengeContentProps) {
  const [code, setCode] = useState(challenge.starterCode)
  const [revealedHints, setRevealedHints] = useState(0)
  const [result, setResult] = useState<ChallengeRunResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [claimed, setClaimed] = useState(false)

  useEffect(() => {
    setCode(challenge.starterCode)
    setRevealedHints(0)
    setResult(null)
    setClaimed(false)
  }, [challenge])

  const runValidation = async () => {
    setIsRunning(true)
    setResult(null)
    try {
      const nextResult = await runChallenge({
        challengeId: questId,
        code,
        validationRules: challenge.validationRules,
      })
      setResult(nextResult)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The testnet runner could not complete.'
      setResult({
        passed: false,
        logs: [`[error] ${message}`],
        rules: challenge.validationRules.map((rule) => ({
          type: rule.type,
          passed: false,
          message: rule.errorMessage,
        })),
        artifacts: { accounts: {}, transactions: [] },
      })
    } finally {
      setIsRunning(false)
    }
  }

  const reset = () => {
    setCode(challenge.starterCode)
    setResult(null)
    setRevealedHints(0)
    setClaimed(false)
  }

  const claimCompletion = () => {
    if (!result?.passed || claimed) return
    setClaimed(true)
    onPassed()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-brand-purple/40 pb-4">
        <p className="max-w-3xl font-sans text-sm leading-6 text-brand-gold/80">
          {challenge.description}
        </p>
        <span className="inline-flex shrink-0 items-center gap-2 border border-stellar-teal/70 bg-stellar-teal/10 px-3 py-2 font-pixel text-[9px] text-stellar-teal">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          TESTNET ONLY
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(205px,0.85fr)_minmax(0,2fr)]">
        <aside className="border-2 border-brand-purple/45 bg-brand-dark-3">
          <div className="border-b-2 border-brand-purple/45 bg-brand-purple/20 px-4 py-3 font-pixel text-[10px] text-brand-gold">
            GOALS
          </div>
          <ol className="space-y-3 p-4">
            {challenge.validationRules.map((rule, index) => {
              const status = result?.rules[index]
              return (
                <li key={`${rule.type}-${index}`} className="flex gap-3">
                  {status?.passed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-stellar-green" aria-hidden="true" />
                  ) : status ? (
                    <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold/40" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className="font-pixel text-[9px] leading-5 text-brand-gold">
                      Rule {index + 1}
                    </p>
                    <p className={`mt-1 font-sans text-xs leading-5 ${status?.passed ? 'text-stellar-green' : 'text-brand-gold/60'}`}>
                      {status?.passed ? status.details ?? 'Validated on testnet.' : rule.errorMessage}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>

          {challenge.hints.length > 0 && (
            <div className="border-t-2 border-brand-purple/30 p-4">
              <button
                type="button"
                onClick={() => setRevealedHints((count) => Math.min(count + 1, challenge.hints.length))}
                disabled={revealedHints === challenge.hints.length}
                className="inline-flex items-center gap-2 font-pixel text-[9px] text-brand-gold transition hover:text-brand-gold-bright disabled:cursor-default disabled:text-brand-gold/40"
              >
                <Lightbulb className="h-4 w-4" aria-hidden="true" />
                {revealedHints === challenge.hints.length ? 'ALL HINTS SHOWN' : 'REVEAL HINT'}
              </button>
              {revealedHints > 0 && (
                <ol className="mt-3 space-y-2 border-l-2 border-stellar-teal/50 pl-3 font-sans text-xs leading-5 text-brand-gold/75">
                  {challenge.hints.slice(0, revealedHints).map((hint, index) => (
                    <li key={hint}>{index + 1}. {hint}</li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </aside>

        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden border-2 border-brand-purple/45 bg-[#0d1117]">
            <div className="flex items-center justify-between border-b-2 border-brand-purple/45 bg-brand-dark-3 px-4 py-3">
              <span className="font-pixel text-[10px] text-brand-gold">challenge.ts</span>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 font-pixel text-[9px] text-brand-gold/60 transition hover:text-brand-gold"
                title="Reset starter code"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                RESET
              </button>
            </div>
            <MonacoEditor
              height="390px"
              language="typescript"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value ?? '')}
              options={{
                automaticLayout: true,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 13,
                lineNumbersMinChars: 3,
                minimap: { enabled: false },
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          </section>

          <section className="border-2 border-brand-purple/45 bg-brand-dark-3">
            <div className="flex items-center gap-2 border-b-2 border-brand-purple/45 bg-brand-dark-2 px-4 py-3">
              <Terminal className="h-4 w-4 text-stellar-teal" aria-hidden="true" />
              <span className="font-pixel text-[10px] text-brand-gold">TESTNET OUTPUT</span>
            </div>
            <div className="pixel-scroll min-h-[132px] max-h-56 overflow-auto p-4 font-mono text-xs leading-6 text-brand-gold/75">
              {isRunning ? (
                <div className="flex items-center gap-2 text-stellar-teal">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Contacting Stellar testnet...
                </div>
              ) : result ? (
                <>
                  {result.logs.map((line, index) => (
                    <p key={`${line}-${index}`} className={line.startsWith('[error]') ? 'break-all text-red-300' : 'break-all'}>
                      {line}
                    </p>
                  ))}
                  {Object.keys(result.artifacts.accounts).length > 0 && (
                    <div className="mt-3 border-t border-brand-purple/30 pt-3 text-stellar-teal">
                      {Object.entries(result.artifacts.accounts).map(([alias, publicKey]) => (
                        <p key={alias} className="break-all">{alias}: {publicKey}</p>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-brand-gold/45">Run the challenge to see live testnet validation.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-brand-purple/40 pt-5">
        <p className="font-pixel text-[9px] text-brand-gold/55">FIXED TESTNET SANDBOX</p>
        <div className="flex flex-wrap justify-end gap-3">
          {result?.passed && !claimed && (
            <PixelButton variant="gold" sm type="button" onClick={claimCompletion}>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                COMPLETE QUEST
              </span>
            </PixelButton>
          )}
          <PixelButton type="button" onClick={runValidation} disabled={isRunning}>
            <span className="inline-flex items-center gap-2">
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
              {isRunning ? 'VALIDATING' : 'RUN + VALIDATE'}
            </span>
          </PixelButton>
        </div>
      </div>
    </div>
  )
}
