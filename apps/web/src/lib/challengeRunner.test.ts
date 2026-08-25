import { describe, expect, it } from 'vitest'
import { parseChallengeProgram } from './challengeRunner'

describe('parseChallengeProgram', () => {
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

  it('rejects arbitrary network access and unknown capabilities', () => {
    expect(parseChallengeProgram('await fetch("https://horizon.stellar.org")').errors).toEqual([
      'fetch is not available in the testnet challenge sandbox.',
    ])
    expect(parseChallengeProgram("await stellar.deployContract('anything')").errors).toEqual([
      'stellar.deployContract is not an allowed challenge operation.',
    ])
  })

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
})
