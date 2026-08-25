import {
  createTestnetTrustline,
  fundTestnetAccount,
  generateTestnetKeypair,
  getTestnetAssetBalance,
  issueTestnetAsset,
  loadTestnetAccount,
  sendTestnetPayment,
} from '@stellar-learn/stellar'
import type { ChallengeSpec, ValidationRule } from '@stellar-learn/content'

/**
 * Testnet challenge sandbox
 *
 * Monaco text is deliberately not executed with eval, Function, a server VM,
 * or a browser worker. Those options would give untrusted input ambient network
 * access. This small interpreter accepts only four capability calls, creates
 * fresh keypairs in this function, and sends requests only through the SDK's
 * hardcoded testnet helpers. The source never receives a secret key, endpoint,
 * network selector, or arbitrary fetch capability. Validation reloads Horizon
 * state after the action, and all logs redact Stellar secret keys.
 */

const MAX_ACTIONS = 12
const MAX_ACCOUNTS = 6
const SAFE_ALIAS = /^[a-z][a-z0-9_-]{0,31}$/i
const SAFE_ASSET_CODE = /^[A-Z0-9]{1,12}$/
const SAFE_AMOUNT = /^(?:0|[1-9]\d*)(?:\.\d{1,7})?$/
const FORBIDDEN_SOURCE = /\b(?:fetch|XMLHttpRequest|WebSocket|importScripts|eval|Function|mainnet|Networks\.PUBLIC|horizon\.stellar\.org)\b/i
const SECRET_KEY_PATTERN = /\bS[A-Z2-7]{55}\b/g

type SupportedOperation = 'fundAccount' | 'sendPayment' | 'createTrustline' | 'issueAsset'

interface FundAccountAction {
  type: 'fundAccount'
  account: string
}

interface SendPaymentAction {
  type: 'sendPayment'
  from: string
  to: string
  amount: string
}

interface CreateTrustlineAction {
  type: 'createTrustline'
  account: string
  issuer: string
  assetCode: string
}

interface IssueAssetAction {
  type: 'issueAsset'
  issuer: string
  holder: string
  assetCode: string
  amount: string
}

type ChallengeAction =
  | FundAccountAction
  | SendPaymentAction
  | CreateTrustlineAction
  | IssueAssetAction

interface ParsedProgram {
  actions: ChallengeAction[]
  errors: string[]
}

interface ChallengeAccount {
  alias: string
  publicKey: string
  secretKey: string
  funded: boolean
}

interface SubmittedTransaction {
  operation: SupportedOperation
  successful: boolean
  hash?: string
  ledger?: number
}

interface BalanceSnapshot {
  account: string
  assetCode: string
  issuer?: string
  before: number
}

interface RuntimeState {
  accounts: Map<string, ChallengeAccount>
  transactions: SubmittedTransaction[]
  snapshots: BalanceSnapshot[]
  logs: string[]
}

export interface ChallengeRuleResult {
  type: ValidationRule['type']
  passed: boolean
  message: string
  details?: string
}

export interface ChallengeRunResult {
  passed: boolean
  logs: string[]
  rules: ChallengeRuleResult[]
  artifacts: {
    accounts: Record<string, string>
    transactions: Array<{
      operation: SupportedOperation
      hash?: string
      ledger?: number
      successful: boolean
    }>
  }
}

export interface RunChallengeInput {
  challengeId: string
  code: string
  validationRules: ChallengeSpec['validationRules']
}

export function parseChallengeProgram(source: string): ParsedProgram {
  const errors: string[] = []
  const actions: ChallengeAction[] = []
  const executableSource = maskNonExecutableSource(source)

  const forbidden = executableSource.match(FORBIDDEN_SOURCE)
  if (forbidden) {
    return {
      actions,
      errors: [`${forbidden[0]} is not available in the testnet challenge sandbox.`],
    }
  }

  const unsupportedCall = [...executableSource.matchAll(/\bstellar\.([A-Za-z_$][\w$]*)\s*\(/g)].find(
    (match) => !isSupportedOperation(match[1])
  )
  if (unsupportedCall?.[1]) {
    return {
      actions,
      errors: [`stellar.${unsupportedCall[1]} is not an allowed challenge operation.`],
    }
  }

  const matcher = /\bstellar\.(fundAccount|sendPayment|createTrustline|issueAsset)\s*\(/g
  let match: RegExpExecArray | null
  while ((match = matcher.exec(executableSource)) !== null) {
    const operation = match[1]
    if (!operation || !isSupportedOperation(operation)) continue

    const extracted = extractCallArgument(source, match.index + match[0].length)
    if (!extracted) {
      errors.push(`Could not read stellar.${operation} arguments.`)
      continue
    }

    matcher.lastIndex = extracted.end
    const action = parseAction(operation, extracted.argument)
    if ('error' in action) {
      errors.push(action.error)
    } else {
      actions.push(action)
    }
  }

  if (actions.length === 0 && errors.length === 0) {
    errors.push('Add at least one allowed stellar.* operation before running the challenge.')
  }
  if (actions.length > MAX_ACTIONS) {
    errors.push(`A challenge can run at most ${MAX_ACTIONS} testnet operations at once.`)
  }

  return { actions, errors }
}

export async function runChallenge({
  challengeId,
  code,
  validationRules,
}: RunChallengeInput): Promise<ChallengeRunResult> {
  const parsed = parseChallengeProgram(code)
  const executableSource = maskNonExecutableSource(code)
  const state: RuntimeState = {
    accounts: new Map(),
    transactions: [],
    snapshots: [],
    logs: [`[sandbox] Starting ${challengeId} on Stellar testnet.`],
  }

  for (const error of parsed.errors) log(state, `[sandbox] ${error}`)

  if (parsed.errors.length === 0) {
    for (const action of parsed.actions) {
      try {
        await executeAction(state, action)
      } catch (error) {
        log(state, `[error] ${toSafeMessage(error)}`)
        break
      }
    }
  }

  const rules = await Promise.all(
    validationRules.map((rule) => validateRule(rule, state, executableSource))
  )
  const passed = parsed.errors.length === 0 && rules.every((rule) => rule.passed)

  log(state, passed ? '[result] All testnet validation rules passed.' : '[result] Fix the failing rule and run again.')

  return {
    passed,
    logs: state.logs,
    rules,
    artifacts: {
      accounts: Object.fromEntries(
        [...state.accounts.entries()].map(([alias, account]) => [alias, account.publicKey])
      ),
      transactions: state.transactions.map((transaction) => ({
        operation: transaction.operation,
        successful: transaction.successful,
        ...(transaction.hash ? { hash: transaction.hash } : {}),
        ...(typeof transaction.ledger === 'number' ? { ledger: transaction.ledger } : {}),
      })),
    },
  }
}

async function executeAction(state: RuntimeState, action: ChallengeAction): Promise<void> {
  switch (action.type) {
    case 'fundAccount': {
      const account = getOrCreateAccount(state, action.account)
      await fundTestnetAccount(account.publicKey)
      account.funded = true
      // A freshly generated keypair has no ledger entry, so its baseline is
      // explicitly zero before Friendbot creates it.
      state.snapshots.push({ account: account.alias, assetCode: 'XLM', before: 0 })
      state.transactions.push({ operation: action.type, successful: true })
      log(state, `[friendbot] Funded ${account.alias}: ${account.publicKey}`)
      return
    }
    case 'sendPayment': {
      const sender = getFundedAccount(state, action.from)
      const recipient = getFundedAccount(state, action.to)
      const recipientAccount = await loadTestnetAccount(recipient.publicKey)
      const before = parseAmount(getTestnetAssetBalance(recipientAccount))
      const result = await sendTestnetPayment({
        senderSecretKey: sender.secretKey,
        destinationPublicKey: recipient.publicKey,
        amount: action.amount,
      })
      state.snapshots.push({
        account: recipient.alias,
        assetCode: 'XLM',
        before,
      })
      state.transactions.push({
        operation: action.type,
        successful: result.successful,
        hash: result.hash,
        ledger: result.ledger,
      })
      log(state, `[payment] ${action.amount} XLM sent to ${recipient.alias}. Tx: ${result.hash}`)
      return
    }
    case 'createTrustline': {
      const account = getFundedAccount(state, action.account)
      const issuer = getFundedAccount(state, action.issuer)
      const result = await createTestnetTrustline({
        accountSecretKey: account.secretKey,
        assetCode: action.assetCode,
        issuerPublicKey: issuer.publicKey,
      })
      state.transactions.push({
        operation: action.type,
        successful: result.successful,
        hash: result.hash,
        ledger: result.ledger,
      })
      log(state, `[trustline] ${account.alias} trusts ${action.assetCode} from ${issuer.alias}. Tx: ${result.hash}`)
      return
    }
    case 'issueAsset': {
      const issuer = getFundedAccount(state, action.issuer)
      const holder = getFundedAccount(state, action.holder)
      const result = await issueTestnetAsset({
        issuerSecretKey: issuer.secretKey,
        distributorSecretKey: holder.secretKey,
        assetCode: action.assetCode,
        amount: action.amount,
      })
      state.transactions.push({
        operation: action.type,
        successful: result.successful,
        hash: result.hash,
        ledger: result.ledger,
      })
      log(state, `[asset] Issued ${action.amount} ${action.assetCode} to ${holder.alias}. Tx: ${result.hash}`)
      return
    }
  }
}

async function validateRule(
  rule: ValidationRule,
  state: RuntimeState,
  source: string
): Promise<ChallengeRuleResult> {
  try {
    switch (rule.type) {
      case 'tx_success':
        return validateTransactionRule(rule, state)
      case 'account_created':
        return await validateAccountRule(rule, state)
      case 'balance_check':
        return await validateBalanceRule(rule, state)
      case 'asset_issued':
        return await validateAssetRule(rule, state)
      case 'code_contains':
        return validateCodeRule(rule, source)
      default:
        return failedRule(rule, 'This validation rule is not supported by the challenge runner.')
    }
  } catch (error) {
    return failedRule(rule, toSafeMessage(error))
  }
}

function validateTransactionRule(rule: ValidationRule, state: RuntimeState): ChallengeRuleResult {
  const transaction = readStringParam(rule.params, 'transaction')
  if (!transaction || !isSupportedOperation(transaction)) {
    return failedRule(rule, 'The challenge author did not provide a valid transaction target.')
  }
  const result = state.transactions.find(
    (submitted) => submitted.operation === transaction && submitted.successful
  )
  if (!result) return failedRule(rule)
  return passedRule(rule, result.hash ? `Confirmed transaction ${result.hash}.` : 'Friendbot confirmed the account funding.')
}

async function validateAccountRule(
  rule: ValidationRule,
  state: RuntimeState
): Promise<ChallengeRuleResult> {
  const alias = readStringParam(rule.params, 'account')
  const account = alias ? state.accounts.get(alias) : undefined
  if (!account || !account.funded) return failedRule(rule)
  await loadTestnetAccount(account.publicKey)
  return passedRule(rule, `${account.alias} exists on Stellar testnet: ${account.publicKey}`)
}

async function validateBalanceRule(
  rule: ValidationRule,
  state: RuntimeState
): Promise<ChallengeRuleResult> {
  const alias = readStringParam(rule.params, 'account')
  const assetCode = readStringParam(rule.params, 'assetCode') ?? 'XLM'
  const issuerAlias = readStringParam(rule.params, 'issuer')
  const account = alias ? state.accounts.get(alias) : undefined
  const issuer = issuerAlias ? state.accounts.get(issuerAlias) : undefined
  if (!account || (assetCode !== 'XLM' && !issuer)) return failedRule(rule)

  const current = await readBalance(account.publicKey, assetCode, issuer?.publicKey)
  const minimum = readAmountParam(rule.params, 'minimum')
  const minimumDelta = readAmountParam(rule.params, 'minimumDelta')

  if (minimum !== undefined && current < minimum) return failedRule(rule, `Observed ${current} ${assetCode}.`)
  if (minimumDelta !== undefined) {
    const snapshot = state.snapshots.find(
      (entry) =>
        entry.account === alias &&
        entry.assetCode === assetCode &&
        entry.issuer === issuerAlias
    )
    if (!snapshot || current < snapshot.before + minimumDelta) {
      return failedRule(rule, `Observed ${current} ${assetCode}.`)
    }
  }

  return passedRule(rule, `Observed ${current} ${assetCode} on ${account.alias}.`)
}

async function validateAssetRule(
  rule: ValidationRule,
  state: RuntimeState
): Promise<ChallengeRuleResult> {
  const issuerAlias = readStringParam(rule.params, 'issuer')
  const holderAlias = readStringParam(rule.params, 'holder')
  const assetCode = readStringParam(rule.params, 'assetCode')
  const minimum = readAmountParam(rule.params, 'minimum')
  const issuer = issuerAlias ? state.accounts.get(issuerAlias) : undefined
  const holder = holderAlias ? state.accounts.get(holderAlias) : undefined
  if (!issuer || !holder || !assetCode || minimum === undefined) return failedRule(rule)

  const balance = await readBalance(holder.publicKey, assetCode, issuer.publicKey)
  if (balance < minimum) return failedRule(rule, `Observed ${balance} ${assetCode}.`)
  return passedRule(rule, `Observed ${balance} ${assetCode} held by ${holder.alias}.`)
}

function validateCodeRule(rule: ValidationRule, source: string): ChallengeRuleResult {
  const fragments = Array.isArray(rule.params.fragments)
    ? rule.params.fragments.filter((fragment): fragment is string => typeof fragment === 'string')
    : readStringParam(rule.params, 'fragment')
      ? [readStringParam(rule.params, 'fragment') as string]
      : []
  if (fragments.length === 0) return failedRule(rule, 'The challenge author did not provide a code fragment.')
  const missing = fragments.find((fragment) => !source.includes(fragment))
  return missing ? failedRule(rule, `Missing ${missing}.`) : passedRule(rule, 'Required code is present.')
}

async function readBalance(publicKey: string, assetCode: string, issuerPublicKey?: string): Promise<number> {
  const account = await loadTestnetAccount(publicKey)
  const balance =
    assetCode === 'XLM'
      ? getTestnetAssetBalance(account)
      : getTestnetAssetBalance(account, { assetCode, issuerPublicKey })
  return parseAmount(balance)
}

function getOrCreateAccount(state: RuntimeState, alias: string): ChallengeAccount {
  const existing = state.accounts.get(alias)
  if (existing) return existing
  if (state.accounts.size >= MAX_ACCOUNTS) {
    throw new Error(`A challenge can prepare at most ${MAX_ACCOUNTS} accounts.`)
  }
  const keypair = generateTestnetKeypair()
  const account: ChallengeAccount = {
    alias,
    publicKey: keypair.publicKey,
    secretKey: keypair.secretKey,
    funded: false,
  }
  state.accounts.set(alias, account)
  log(state, `[account] Prepared ${alias}: ${account.publicKey}`)
  return account
}

function getFundedAccount(state: RuntimeState, alias: string): ChallengeAccount {
  const account = state.accounts.get(alias)
  if (!account?.funded) {
    throw new Error(`${alias} must be funded with stellar.fundAccount before it can be used.`)
  }
  return account
}

function parseAction(
  operation: SupportedOperation,
  argument: string
): ChallengeAction | { error: string } {
  if (operation === 'fundAccount') {
    const account = parseAliasArgument(argument)
    return account ? { type: operation, account } : { error: 'fundAccount expects one quoted account alias.' }
  }

  const options = parseOptions(argument)
  if (!options) return { error: `${operation} expects an object literal with quoted values.` }

  if (operation === 'sendPayment') {
    const from = options.from
    const to = options.to
    const amount = options.amount
    if (!isAlias(from) || !isAlias(to) || !isAmount(amount)) {
      return { error: 'sendPayment requires safe from, to, and positive amount values.' }
    }
    return { type: operation, from, to, amount }
  }

  if (operation === 'createTrustline') {
    const account = options.account
    const issuer = options.issuer
    const assetCode = options.assetCode
    if (!isAlias(account) || !isAlias(issuer) || !isAssetCode(assetCode)) {
      return { error: 'createTrustline requires safe account, issuer, and uppercase assetCode values.' }
    }
    return { type: operation, account, issuer, assetCode }
  }

  const issuer = options.issuer
  const holder = options.holder
  const assetCode = options.assetCode
  const amount = options.amount
  if (!isAlias(issuer) || !isAlias(holder) || !isAssetCode(assetCode) || !isAmount(amount)) {
    return { error: 'issueAsset requires safe issuer, holder, assetCode, and positive amount values.' }
  }
  return { type: operation, issuer, holder, assetCode, amount }
}

function parseAliasArgument(argument: string): string | null {
  const match = argument.trim().match(/^(['"])([A-Za-z][A-Za-z0-9_-]{0,31})\1$/)
  const alias = match?.[2]
  return alias && isAlias(alias) ? alias : null
}

function parseOptions(argument: string): Record<string, string> | null {
  const trimmed = argument.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null
  const body = trimmed.slice(1, -1)
  const options: Record<string, string> = {}
  const matcher = /(?:^|,)\s*([A-Za-z][A-Za-z0-9_]*)\s*:\s*(['"])([^'"\\]*(?:\\.[^'"\\]*)*)\2\s*/g
  let match: RegExpExecArray | null
  while ((match = matcher.exec(body)) !== null) {
    const key = match[1]
    const value = match[3]
    if (key && value !== undefined) options[key] = value.replace(/\\(['"])/g, '$1')
  }
  return options
}

function extractCallArgument(source: string, start: number): { argument: string; end: number } | null {
  let depth = 1
  let quote = ''
  for (let index = start; index < source.length; index += 1) {
    const character = source.charAt(index)
    if (quote) {
      if (character === '\\') {
        index += 1
      } else if (character === quote) {
        quote = ''
      }
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if (character === '(') depth += 1
    if (character === ')') depth -= 1
    if (depth === 0) return { argument: source.slice(start, index), end: index + 1 }
  }
  return null
}

/** Masks comments and string literals without changing character offsets. */
function maskNonExecutableSource(source: string): string {
  let result = ''
  let quote = ''
  let lineComment = false
  let blockComment = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source.charAt(index)
    const next = source.charAt(index + 1)

    if (lineComment) {
      if (character === '\n') {
        lineComment = false
        result += character
      } else {
        result += ' '
      }
      continue
    }

    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false
        result += '  '
        index += 1
      } else {
        result += character === '\n' ? '\n' : ' '
      }
      continue
    }

    if (quote) {
      if (character === '\\') {
        result += ' '
        if (index + 1 < source.length) {
          result += source.charAt(index + 1) === '\n' ? '\n' : ' '
          index += 1
        }
      } else {
        result += character === '\n' ? '\n' : ' '
        if (character === quote) quote = ''
      }
      continue
    }

    if (character === '/' && next === '/') {
      lineComment = true
      result += '  '
      index += 1
      continue
    }
    if (character === '/' && next === '*') {
      blockComment = true
      result += '  '
      index += 1
      continue
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character
      result += ' '
      continue
    }

    result += character
  }

  return result
}

function isSupportedOperation(value: string | undefined): value is SupportedOperation {
  return value === 'fundAccount' || value === 'sendPayment' || value === 'createTrustline' || value === 'issueAsset'
}

function isAlias(value: string | undefined): value is string {
  return typeof value === 'string' && SAFE_ALIAS.test(value)
}

function isAssetCode(value: string | undefined): value is string {
  return typeof value === 'string' && value !== 'XLM' && SAFE_ASSET_CODE.test(value)
}

function isAmount(value: string | undefined): value is string {
  return typeof value === 'string' && SAFE_AMOUNT.test(value) && parseAmount(value) > 0 && parseAmount(value) <= 1000
}

function readStringParam(params: Record<string, unknown>, name: string): string | undefined {
  const value = params[name]
  return typeof value === 'string' ? value : undefined
}

function readAmountParam(params: Record<string, unknown>, name: string): number | undefined {
  const value = readStringParam(params, name)
  return value && isAmount(value) ? parseAmount(value) : undefined
}

function parseAmount(value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`Invalid Stellar amount: ${value}`)
  return parsed
}

function passedRule(rule: ValidationRule, details: string): ChallengeRuleResult {
  return { type: rule.type, passed: true, message: rule.errorMessage, details }
}

function failedRule(rule: ValidationRule, details?: string): ChallengeRuleResult {
  return { type: rule.type, passed: false, message: rule.errorMessage, ...(details ? { details } : {}) }
}

function log(state: RuntimeState, message: string): void {
  state.logs.push(message.replace(SECRET_KEY_PATTERN, '[redacted secret key]'))
}

function toSafeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unexpected challenge runner error.'
  return message.replace(SECRET_KEY_PATTERN, '[redacted secret key]')
}
