import { describe, expect, it } from 'vitest'
import { clampLimit } from './leaderboard'

describe('clampLimit', () => {
  it('uses the default when the param is absent', () => {
    expect(clampLimit(null)).toBe(20)
  })

  it('accepts a value inside the range', () => {
    expect(clampLimit('5')).toBe(5)
    expect(clampLimit('100')).toBe(100)
  })

  it('falls back to the default for a non-numeric value', () => {
    // Previously parseInt('abc') produced NaN, which reached zrange as a
    // NaN stop index.
    expect(clampLimit('abc')).toBe(20)
    expect(clampLimit('')).toBe(20)
  })

  it('raises zero and negative values to 1', () => {
    // A stop index of -1 makes Redis read from the end of the sorted set.
    expect(clampLimit('0')).toBe(1)
    expect(clampLimit('-5')).toBe(1)
  })

  it('caps anything above the maximum', () => {
    expect(clampLimit('1000')).toBe(100)
  })

  it('truncates a fractional value', () => {
    expect(clampLimit('7.9')).toBe(7)
  })
})
