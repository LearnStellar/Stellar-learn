import { NextResponse } from 'next/server'
import {
  deploySorobanPlaygroundTemplate,
  invokeSorobanPlaygroundContract,
  matchesSorobanPlaygroundTemplate,
  type PlaygroundTemplateId,
} from '@stellar-learn/stellar/soroban'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SOURCE_LENGTH = 24_000
const ALLOWED_FIELDS = new Set(['action', 'templateId', 'code', 'contractId'])

type PlaygroundAction = 'deploy' | 'run'

interface PlaygroundRequest {
  action: PlaygroundAction
  templateId: PlaygroundTemplateId
  code: string
  contractId?: string
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return failure('Send a JSON playground request.', 400, 'INVALID_JSON')
  }

  const parsed = parseRequest(body)
  if (parsed.ok === false) {
    return failure(parsed.error, 400, 'INVALID_REQUEST')
  }

  const { action, templateId, code, contractId } = parsed.request
  if (!matchesSorobanPlaygroundTemplate(templateId, code)) {
    return failure(
      'Only the selected reviewed template can be deployed. Reset the template before deploying.',
      422,
      'UNSUPPORTED_SOURCE'
    )
  }

  const logs = [
    '[testnet] Source accepted for the reviewed template.',
    '[testnet] Creating an ephemeral Friendbot-funded account.',
  ]

  try {
    if (action === 'deploy') {
      logs.push('[testnet] Uploading Wasm and creating the contract.')
      const result = await deploySorobanPlaygroundTemplate(templateId)
      logs.push('[testnet] Contract deployment confirmed.')

      return NextResponse.json({
        ok: true,
        network: 'testnet',
        stage: 'deploy',
        logs,
        ...result,
      })
    }

    logs.push('[testnet] Invoking the deployed contract.')
    const result = await invokeSorobanPlaygroundContract(templateId, contractId!)
    logs.push('[testnet] Contract invocation confirmed.')

    return NextResponse.json({
      ok: true,
      network: 'testnet',
      stage: 'run',
      contractId,
      logs,
      ...result,
    })
  } catch (error) {
    return failure(readableError(error), 502, 'TESTNET_EXECUTION_FAILED', logs)
  }
}

function parseRequest(value: unknown):
  | { ok: true; request: PlaygroundRequest }
  | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: 'The playground request must be an object.' }
  }

  const unexpectedField = Object.keys(value).find((key) => !ALLOWED_FIELDS.has(key))
  if (unexpectedField) {
    return {
      ok: false,
      error: `The ${unexpectedField} field is not accepted by the testnet playground.`,
    }
  }

  const action = value.action
  if (action !== 'deploy' && action !== 'run') {
    return { ok: false, error: 'Choose either deploy or run.' }
  }

  const templateId = value.templateId
  if (templateId !== 'hello' && templateId !== 'counter') {
    return { ok: false, error: 'Choose a supported Soroban template.' }
  }

  if (typeof value.code !== 'string' || value.code.length === 0) {
    return { ok: false, error: 'Add Soroban source code before running.' }
  }

  if (value.code.length > MAX_SOURCE_LENGTH) {
    return { ok: false, error: 'Source code is too large for this playground.' }
  }

  if (action === 'run') {
    if (typeof value.contractId !== 'string' || !/^C[A-Z2-7]{55}$/.test(value.contractId)) {
      return { ok: false, error: 'Deploy this template first, then run it with its contract ID.' }
    }

    return {
      ok: true,
      request: { action, templateId, code: value.code, contractId: value.contractId },
    }
  }

  return { ok: true, request: { action, templateId, code: value.code } }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function failure(message: string, status: number, code: string, logs: string[] = []) {
  return NextResponse.json(
    {
      ok: false,
      network: 'testnet',
      logs,
      error: { code, message },
    },
    { status }
  )
}

function readableError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown testnet execution error.'
  return message.replace(/S[A-Z2-7]{55}/g, '[redacted secret key]')
}
