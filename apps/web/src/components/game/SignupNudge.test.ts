import { describe, expect, it } from 'vitest'
import { shouldNudgeAt } from './SignupNudge'

describe('shouldNudgeAt', () => {
  it('never nudges before a quest is completed', () => {
    expect(shouldNudgeAt(0)).toBe(false)
    expect(shouldNudgeAt(-1)).toBe(false)
  })

  it('nudges on the first completion', () => {
    expect(shouldNudgeAt(1)).toBe(true)
  })

  it('stays quiet on the two completions after a nudge', () => {
    expect(shouldNudgeAt(2)).toBe(false)
    expect(shouldNudgeAt(3)).toBe(false)
  })

  it('nudges again every third completion', () => {
    expect(shouldNudgeAt(4)).toBe(true)
    expect(shouldNudgeAt(7)).toBe(true)
    expect(shouldNudgeAt(10)).toBe(true)
  })

  it('nudges at most once per three completions over a long session', () => {
    const nudges = Array.from({ length: 30 }, (_, i) => shouldNudgeAt(i + 1)).filter(Boolean)
    expect(nudges).toHaveLength(10)
  })
})
