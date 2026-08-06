/**
 * Executes a player's coding-challenge submission and validates the outcome
 * against its `ChallengeSpec.validationRules` — the runner Issue #10 called
 * out as missing (the types existed, nothing executed or checked them).
 *
 * Player code runs against a fixed `stellar` sandbox object exposing only
 * testnet-safe Stellar operations (every `@stellar-learn/stellar` call
 * defaults to testnet — CLAUDE.md rule 3 — so this can never reach mainnet
 * regardless of what the player writes). The code is expected to `return` a
 * plain object describing what it built, e.g. `{ publicKey }`, which the
 * validators below inspect.
 *
 * Security note: this runs untrusted code with the `Function` constructor,
 * which executes in the page's own JS realm — it can reach `window`/
 * `document` like any other script on the page, unlike a sandboxed iframe or
 * Web Worker. That's an accepted tradeoff for a client-side teaching tool
 * where the "secrets" in play are throwaway testnet keys the player just
 * generated, not session credentials. A hardened sandbox would be a
 * reasonable follow-up if challenges ever need stronger isolation.
 */
import * as stellar from '@stellar-learn/stellar'
import type { ChallengeSpec, ValidationRule } from '@stellar-learn/content'

/** The API surface exposed to player code as the `stellar` global. */
const SANDBOX_API = Object.freeze({
  generateKeypair: stellar.generateKeypair,
  fundTestnetAccount: stellar.fundTestnetAccount,
  loadAccount: stellar.loadAccount,
  accountExists: stellar.accountExists,
  getXLMBalance: stellar.getXLMBalance,
  sendPayment: stellar.sendPayment,
  createTrustline: stellar.createTrustline,
  issueAsset: stellar.issueAsset,
})

type SandboxApi = typeof SANDBOX_API
type ChallengeOutput = Record<string, unknown>
type AsyncFunctionCtor = new (...args: string[]) => (stellarApi: SandboxApi) => Promise<unknown>

export interface ChallengeRuleResult {
  rule: ValidationRule
  passed: boolean
  /** Populated only on failure — the rule's own `errorMessage`. */
  message?: string
}

export interface ChallengeRunResult {
  passed: boolean
  ruleResults: ChallengeRuleResult[]
  /** Set when the player's code threw instead of a rule simply failing. */
  runtimeError?: string
}

/** Run `code` and validate it against every rule in `spec.validationRules`. */
export async function runChallenge(code: string, spec: ChallengeSpec): Promise<ChallengeRunResult> {
  const needsExecution = spec.validationRules.some((rule) => rule.type !== 'code_contains')

  let output: ChallengeOutput = {}
  let runtimeError: string | undefined

  if (needsExecution) {
    try {
      const result = await executeChallengeCode(code)
      if (isPlainObject(result)) output = result
    } catch (err) {
      runtimeError = err instanceof Error ? err.message : String(err)
    }
  }

  const ruleResults: ChallengeRuleResult[] = []
  for (const rule of spec.validationRules) {
    // A runtime error fails every rule that needed execution to check;
    // code_contains is a static source check so it's still evaluated.
    const passed =
      runtimeError && rule.type !== 'code_contains' ? false : await evaluateRule(rule, code, output)
    ruleResults.push({ rule, passed, message: passed ? undefined : rule.errorMessage })
  }

  return { passed: ruleResults.every((r) => r.passed), ruleResults, runtimeError }
}

/** Run player code with `stellar` as its only injected binding. */
async function executeChallengeCode(code: string): Promise<unknown> {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as AsyncFunctionCtor
  const run = new AsyncFunction('stellar', `"use strict";\n${code}`)
  return run(SANDBOX_API)
}

export function isPlainObject(value: unknown): value is ChallengeOutput {
  return typeof value === 'object' && value !== null
}

/** Friendly label for a rule that passed (failures already show its own `errorMessage`). */
export function ruleLabel(rule: ValidationRule): string {
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

async function evaluateRule(rule: ValidationRule, code: string, output: ChallengeOutput): Promise<boolean> {
  switch (rule.type) {
    case 'code_contains': {
      const substring = String(rule.params.substring ?? '')
      return substring.length > 0 && code.includes(substring)
    }

    case 'account_created': {
      const publicKey = output[String(rule.params.field ?? 'publicKey')]
      if (typeof publicKey !== 'string') return false
      return stellar.accountExists(publicKey)
    }

    case 'balance_check': {
      const publicKey = output[String(rule.params.field ?? 'publicKey')]
      const minXLM = Number(rule.params.minXLM ?? 0)
      if (typeof publicKey !== 'string') return false
      try {
        const account = await stellar.loadAccount(publicKey)
        return Number(stellar.getXLMBalance(account)) >= minXLM
      } catch {
        return false
      }
    }

    case 'tx_success': {
      const value = output[String(rule.params.field ?? 'result')] ?? output
      return isPlainObject(value) && value.successful === true
    }

    case 'asset_issued': {
      const assetCode = String(rule.params.assetCode ?? '')
      const holder = output[String(rule.params.holderField ?? 'publicKey')]
      const issuer = output[String(rule.params.issuerField ?? 'issuerPublicKey')]
      if (typeof holder !== 'string' || typeof issuer !== 'string' || !assetCode) return false
      try {
        const account = await stellar.loadAccount(holder)
        const balance = stellar.getAssetBalance(account, assetCode, issuer)
        return balance !== null && Number(balance) > 0
      } catch {
        return false
      }
    }

    default:
      return false
  }
}
