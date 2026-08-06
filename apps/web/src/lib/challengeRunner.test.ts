import { describe, expect, it } from 'vitest'
import { isPlainObject, ruleLabel, runChallenge } from './challengeRunner'
import type { ChallengeSpec, ValidationRule } from '@stellar-learn/content'

function spec(validationRules: ValidationRule[], overrides: Partial<ChallengeSpec> = {}): ChallengeSpec {
  return {
    description: 'test challenge',
    starterCode: '',
    hints: [],
    testnetRequired: false,
    validationRules,
    ...overrides,
  }
}

describe('isPlainObject', () => {
  it('accepts plain objects', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject({ publicKey: 'G...' })).toBe(true)
  })

  it('rejects null, primitives, and arrays are still objects (accepted)', () => {
    expect(isPlainObject(null)).toBe(false)
    expect(isPlainObject(undefined)).toBe(false)
    expect(isPlainObject('a string')).toBe(false)
    expect(isPlainObject(42)).toBe(false)
    expect(isPlainObject(true)).toBe(false)
  })
})

describe('ruleLabel', () => {
  it('describes a code_contains rule by its required substring', () => {
    const rule: ValidationRule = {
      type: 'code_contains',
      params: { substring: 'fundTestnetAccount' },
      errorMessage: 'nope',
    }
    expect(ruleLabel(rule)).toBe('Code calls fundTestnetAccount')
  })

  it('gives a friendly label for every rule type', () => {
    const types: ValidationRule['type'][] = [
      'account_created',
      'balance_check',
      'tx_success',
      'asset_issued',
    ]
    for (const type of types) {
      const label = ruleLabel({ type, params: {}, errorMessage: 'nope' })
      expect(label.length).toBeGreaterThan(0)
      expect(label).not.toBe('Check passed')
    }
  })
})

describe('runChallenge — code_contains (no execution needed)', () => {
  it('passes when the source includes the required substring', async () => {
    const result = await runChallenge(
      'const x = stellar.fundTestnetAccount(publicKey)',
      spec([{ type: 'code_contains', params: { substring: 'fundTestnetAccount' }, errorMessage: 'missing call' }])
    )
    expect(result.passed).toBe(true)
    expect(result.ruleResults).toEqual([
      { rule: expect.objectContaining({ type: 'code_contains' }), passed: true, message: undefined },
    ])
    expect(result.runtimeError).toBeUndefined()
  })

  it('fails and surfaces the errorMessage when the substring is missing', async () => {
    const result = await runChallenge(
      'return {}',
      spec([{ type: 'code_contains', params: { substring: 'fundTestnetAccount' }, errorMessage: 'missing call' }])
    )
    expect(result.passed).toBe(false)
    expect(result.ruleResults[0]).toEqual({
      rule: expect.objectContaining({ type: 'code_contains' }),
      passed: false,
      message: 'missing call',
    })
  })

  it('never executes the player code when every rule is code_contains', async () => {
    // If this ran, the syntax error below would surface as a runtimeError.
    const result = await runChallenge(
      'this is not valid javascript {{{',
      spec([{ type: 'code_contains', params: { substring: 'stellar' }, errorMessage: 'nope' }])
    )
    expect(result.runtimeError).toBeUndefined()
    expect(result.passed).toBe(false) // substring "stellar" isn't in the source either
  })
})

describe('runChallenge — runtime errors', () => {
  it('fails every execution-requiring rule but still evaluates code_contains', async () => {
    const result = await runChallenge(
      'throw new Error("boom")',
      spec([
        { type: 'code_contains', params: { substring: 'throw' }, errorMessage: 'no throw' },
        { type: 'account_created', params: { field: 'publicKey' }, errorMessage: 'no account' },
      ])
    )

    expect(result.runtimeError).toBe('boom')
    expect(result.passed).toBe(false)

    const codeContainsResult = result.ruleResults.find((r) => r.rule.type === 'code_contains')
    expect(codeContainsResult?.passed).toBe(true) // static check unaffected by the throw

    const accountResult = result.ruleResults.find((r) => r.rule.type === 'account_created')
    expect(accountResult).toEqual({
      rule: expect.objectContaining({ type: 'account_created' }),
      passed: false,
      message: 'no account',
    })
  })

  it('captures a non-Error throw as a string', async () => {
    const result = await runChallenge(
      'throw "not an Error instance"',
      spec([{ type: 'account_created', params: {}, errorMessage: 'nope' }])
    )
    expect(result.runtimeError).toBe('not an Error instance')
    expect(result.passed).toBe(false)
  })
})

describe('runChallenge — sandbox surface', () => {
  it('gives player code access to the stellar API functions', async () => {
    // Throws if the binding is missing — asserting on runtimeError being
    // undefined proves the sandbox object was there without making any
    // actual network call (account_created short-circuits below since no
    // publicKey is returned, per the "non-object return" test).
    const result = await runChallenge(
      'if (typeof stellar.generateKeypair !== "function" || typeof stellar.fundTestnetAccount !== "function") {\n' +
        '  throw new Error("stellar sandbox missing expected functions")\n' +
        '}\n' +
        'return {}',
      spec([{ type: 'account_created', params: { field: 'publicKey' }, errorMessage: 'no account' }])
    )
    expect(result.runtimeError).toBeUndefined()
    expect(result.ruleResults[0]).toEqual({
      rule: expect.objectContaining({ type: 'account_created' }),
      passed: false,
      message: 'no account',
    })
  })

  it('treats a non-object return as an empty output rather than throwing', async () => {
    const result = await runChallenge(
      'return 42',
      spec([{ type: 'account_created', params: { field: 'publicKey' }, errorMessage: 'no account' }])
    )
    expect(result.runtimeError).toBeUndefined()
    expect(result.passed).toBe(false)
    expect(result.ruleResults[0]?.message).toBe('no account')
  })
})
