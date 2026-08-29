'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState } from 'react'
import {
  Braces,
  Check,
  Copy,
  Loader2,
  Play,
  Rocket,
  RotateCcw,
  ShieldCheck,
  Terminal,
} from 'lucide-react'
import {
  SOROBAN_PLAYGROUND_TEMPLATES,
  type PlaygroundTemplateId,
} from '@stellar-learn/stellar/soroban/templates'
import { PixelButton, PixelPanel, PixelStrip } from '@/components/ui'

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#0d1117] font-mono text-sm text-brand-gold/60">
      Loading editor...
    </div>
  ),
})

interface PlaygroundResponse {
  ok: boolean
  network: 'testnet'
  stage?: 'deploy' | 'run'
  logs: string[]
  contractId?: string
  transactionHash?: string
  result?: unknown
  error?: {
    code: string
    message: string
  }
}

const initialOutput: PlaygroundResponse = {
  ok: true,
  network: 'testnet',
  logs: [
    '[testnet] Ready.',
    'Select a reviewed template, then deploy it to Stellar testnet.',
  ],
}

export function SorobanPlayground() {
  const [templateId, setTemplateId] = useState<PlaygroundTemplateId>('hello')
  const [source, setSource] = useState(SOROBAN_PLAYGROUND_TEMPLATES.hello.source)
  const [contractId, setContractId] = useState<string>()
  const [output, setOutput] = useState<PlaygroundResponse>(initialOutput)
  const [action, setAction] = useState<'deploy' | 'run'>()
  const [copied, setCopied] = useState(false)

  const template = SOROBAN_PLAYGROUND_TEMPLATES[templateId]
  const isRunning = action !== undefined

  function selectTemplate(nextTemplateId: PlaygroundTemplateId) {
    setTemplateId(nextTemplateId)
    setSource(SOROBAN_PLAYGROUND_TEMPLATES[nextTemplateId].source)
    setContractId(undefined)
    setOutput({
      ok: true,
      network: 'testnet',
      logs: [`[testnet] ${SOROBAN_PLAYGROUND_TEMPLATES[nextTemplateId].title} template loaded.`],
    })
  }

  function resetTemplate() {
    setSource(template.source)
    setOutput({
      ok: true,
      network: 'testnet',
      contractId,
      logs: [`[testnet] ${template.title} source reset.`],
    })
  }

  async function execute(nextAction: 'deploy' | 'run') {
    setAction(nextAction)
    setOutput({
      ok: true,
      network: 'testnet',
      contractId,
      logs: [`[testnet] ${nextAction === 'deploy' ? 'Deploying' : 'Invoking'} ${template.title}...`],
    })

    try {
      const response = await fetch('/api/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: nextAction,
          templateId,
          code: source,
          ...(nextAction === 'run' ? { contractId } : {}),
        }),
      })
      const result = (await response.json()) as PlaygroundResponse

      setOutput(result)
      if (result.ok && result.contractId) {
        setContractId(result.contractId)
      }
    } catch {
      setOutput({
        ok: false,
        network: 'testnet',
        logs: ['[testnet] The request could not reach the playground service.'],
        error: {
          code: 'CONNECTION_FAILED',
          message: 'Unable to contact the testnet playground. Please try again.',
        },
      })
    } finally {
      setAction(undefined)
    }
  }

  async function copyContractId() {
    if (!contractId) return

    await navigator.clipboard.writeText(contractId)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_500)
  }

  return (
    <main className="min-h-screen bg-brand-dark px-4 py-5 text-brand-gold sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b-2 border-brand-panel-line pb-5">
          <Link
            href="/"
            className="font-pixel text-[10px] leading-6 text-brand-gold transition hover:text-stellar-teal"
          >
            STELLAR LEARN
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="font-pixel text-[9px] leading-5 text-brand-gold/60 transition hover:text-brand-gold"
            >
              DASHBOARD
            </Link>
            <span className="inline-flex items-center gap-2 border-2 border-stellar-teal bg-stellar-teal/10 px-3 py-2 font-pixel text-[9px] leading-4 text-stellar-teal">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              TESTNET ONLY
            </span>
          </div>
        </header>

        <section className="mb-6 flex flex-col justify-between gap-4 border-l-4 border-brand-purple pl-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 font-pixel text-[9px] leading-5 text-stellar-teal">SOROBAN LAB</p>
            <h1 className="font-pixel text-xl leading-9 text-brand-gold sm:text-2xl">Soroban Playground</h1>
            <p className="mt-3 max-w-3xl font-read text-xl leading-6 text-brand-gold/70">
              Start from a reviewed template, deploy to Stellar testnet, and inspect the live contract result.
            </p>
          </div>
          <div className="flex items-center gap-2 font-pixel text-[8px] leading-5 text-brand-gold/55">
            <ShieldCheck className="h-4 w-4 shrink-0 text-stellar-teal" aria-hidden="true" />
            EPHEMERAL TESTNET ACCOUNT
          </div>
        </section>

        <section className="mb-6 flex flex-wrap items-center gap-3 border-2 border-brand-panel-line bg-brand-dark-2 p-3">
          <div className="mr-2 flex items-center gap-2 font-pixel text-[9px] text-brand-gold/70">
            <Braces className="h-4 w-4 text-stellar-teal" aria-hidden="true" />
            TEMPLATE
          </div>
          {(Object.keys(SOROBAN_PLAYGROUND_TEMPLATES) as PlaygroundTemplateId[]).map((id) => {
            const isSelected = id === templateId
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectTemplate(id)}
                disabled={isRunning}
                className={`border-2 px-3 py-2 font-pixel text-[9px] leading-5 transition ${
                  isSelected
                    ? 'border-brand-gold bg-brand-purple text-white'
                    : 'border-brand-panel-line bg-brand-dark text-brand-gold/65 hover:border-brand-purple-light hover:text-brand-gold'
                } disabled:cursor-not-allowed disabled:opacity-50`}
                aria-pressed={isSelected}
              >
                {SOROBAN_PLAYGROUND_TEMPLATES[id].title.toUpperCase()}
              </button>
            )
          })}
          <button
            type="button"
            onClick={resetTemplate}
            disabled={isRunning}
            className="ml-auto inline-flex h-10 w-10 items-center justify-center border-2 border-brand-panel-line bg-brand-dark text-brand-gold/70 transition hover:border-brand-gold hover:text-brand-gold"
            title="Reset selected template"
            aria-label="Reset selected template"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
          <PixelPanel variant="soft" className="overflow-hidden">
            <PixelStrip>
              <Braces className="relative h-4 w-4" aria-hidden="true" />
              <span className="relative font-pixel text-[10px] leading-5">{template.title.toUpperCase()}.RS</span>
              <span className="relative ml-auto font-mono text-xs text-white/70">Rust</span>
            </PixelStrip>
            <div className="h-[510px] min-h-[55vh] bg-[#0d1117]">
              <Editor
                height="100%"
                defaultLanguage="rust"
                language="rust"
                theme="vs-dark"
                value={source}
                onChange={(value) => setSource(value ?? '')}
                options={{
                  automaticLayout: true,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 14,
                  lineHeight: 22,
                  minimap: { enabled: false },
                  padding: { top: 16, bottom: 16 },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t-4 border-brand-ink bg-brand-dark-2 px-4 py-4">
              <p className="font-read text-lg leading-5 text-brand-gold/65">{template.description}</p>
              <div className="flex flex-wrap gap-3">
                <PixelButton
                  type="button"
                  variant="ghost"
                  sm
                  disabled={!contractId || isRunning}
                  onClick={() => execute('run')}
                  title={contractId ? 'Invoke the deployed testnet contract' : 'Deploy this template before running it'}
                >
                  {action === 'run' ? <Loader2 className="mr-2 inline h-3 w-3 animate-spin" /> : <Play className="mr-2 inline h-3 w-3" />}
                  RUN
                </PixelButton>
                <PixelButton type="button" variant="gold" sm disabled={isRunning} onClick={() => execute('deploy')}>
                  {action === 'deploy' ? <Loader2 className="mr-2 inline h-3 w-3 animate-spin" /> : <Rocket className="mr-2 inline h-3 w-3" />}
                  DEPLOY
                </PixelButton>
              </div>
            </div>
          </PixelPanel>

          <aside className="flex min-w-0 flex-col gap-8">
            <PixelPanel variant="purple" className="overflow-hidden">
              <PixelStrip>
                <Terminal className="relative h-4 w-4" aria-hidden="true" />
                <span className="relative font-pixel text-[10px] leading-5">CONSOLE</span>
                <span
                  className={`relative ml-auto h-2.5 w-2.5 border border-brand-ink ${
                    isRunning ? 'animate-pulse bg-brand-gold-bright' : output.ok ? 'bg-stellar-teal' : 'bg-red-400'
                  }`}
                  aria-label={isRunning ? 'Running' : output.ok ? 'Ready' : 'Failed'}
                />
              </PixelStrip>
              <div className="min-h-[270px] space-y-3 bg-[#0d1117] p-4 font-mono text-xs leading-6 text-brand-gold/80" aria-live="polite">
                {output.logs.map((line, index) => (
                  <p key={`${line}-${index}`} className="break-words">
                    {line}
                  </p>
                ))}
                {output.error && (
                  <div className="border-l-2 border-red-400 bg-red-950/30 px-3 py-2 text-red-200">
                    <p className="font-semibold">{output.error.code}</p>
                    <p className="mt-1 break-words">{output.error.message}</p>
                  </div>
                )}
                {output.result !== undefined && (
                  <div className="border-l-2 border-stellar-teal bg-stellar-teal/10 px-3 py-2 text-stellar-teal">
                    <p className="mb-1 font-semibold">RESULT</p>
                    <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5">{formatResult(output.result)}</pre>
                  </div>
                )}
              </div>
            </PixelPanel>

            <section className="border-2 border-brand-panel-line bg-brand-dark-2 p-4">
              <p className="mb-3 font-pixel text-[9px] leading-5 text-brand-gold/65">DEPLOYMENT</p>
              {contractId ? (
                <>
                  <div className="flex items-start gap-2">
                    <code className="min-w-0 flex-1 break-all border border-brand-panel-line bg-brand-dark px-3 py-2 font-mono text-xs leading-5 text-stellar-teal">
                      {contractId}
                    </code>
                    <button
                      type="button"
                      onClick={copyContractId}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-brand-panel-line text-brand-gold transition hover:border-brand-gold"
                      title="Copy contract ID"
                      aria-label="Copy contract ID"
                    >
                      {copied ? <Check className="h-4 w-4 text-stellar-teal" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  {output.transactionHash && (
                    <p className="mt-3 break-all font-mono text-[11px] leading-5 text-brand-gold/60">
                      TX: {output.transactionHash}
                    </p>
                  )}
                </>
              ) : (
                <p className="font-read text-xl leading-6 text-brand-gold/55">Deploy a template to receive its testnet contract ID.</p>
              )}
            </section>

            <section className="border-l-2 border-stellar-teal bg-stellar-teal/5 px-4 py-3">
              <p className="font-pixel text-[8px] leading-5 text-stellar-teal">TESTNET GUARD</p>
              <p className="mt-2 font-read text-lg leading-5 text-brand-gold/70">
                Deployments use a fresh Friendbot account. Mainnet endpoints and wallet keys are never accepted.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}

function formatResult(value: unknown): string {
  if (typeof value === 'string') return value

  try {
    return JSON.stringify(value, (_, item) => (typeof item === 'bigint' ? item.toString() : item), 2)
  } catch {
    return String(value)
  }
}
