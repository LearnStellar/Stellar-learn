import { describe, expect, it } from 'vitest'
import { isValidScore } from './progressValidation'

describe('isValidScore', () => {
  it('accepts undefined (non-scored quest types omit it entirely)', () => {
    expect(isValidScore(undefined)).toBe(true)
  })

  it('accepts the boundary values 0 and 100', () => {
    expect(isValidScore(0)).toBe(true)
    expect(isValidScore(100)).toBe(true)
  })

  it('accepts a typical mid-range score', () => {
    expect(isValidScore(67)).toBe(true)
  })

  it('rejects a negative score', () => {
    expect(isValidScore(-1)).toBe(false)
  })

  it('rejects a score above 100', () => {
    expect(isValidScore(101)).toBe(false)
  })

  it('rejects null', () => {
    expect(isValidScore(null)).toBe(false)
  })

  it('rejects non-numeric types', () => {
    expect(isValidScore('80')).toBe(false)
    expect(isValidScore(true)).toBe(false)
    expect(isValidScore({})).toBe(false)
  })

  it('rejects NaN and non-finite numbers', () => {
    expect(isValidScore(NaN)).toBe(false)
    expect(isValidScore(Infinity)).toBe(false)
  })
})
