import { describe, expect, it } from 'vitest'
import { worlds, worldQuests } from '@stellar-learn/content'
import {
  GUEST_PROGRESS_VERSION,
  emptyGuestProgress,
  guestCompletedQuestIds,
  guestXP,
  parseGuestProgress,
  withQuestCompleted,
} from './localProgress'

/** Real quests, so the curriculum check in parseGuestProgress passes. */
const firstWorld = worlds[0]
if (!firstWorld) throw new Error('content package has no worlds registered')
const realQuests = worldQuests(firstWorld)
const QUEST_A = realQuests[0]
const QUEST_B = realQuests[1]
if (!QUEST_A || !QUEST_B) throw new Error('world 1 needs at least two quests for these tests')

describe('parseGuestProgress', () => {
  it('returns empty progress for null, malformed JSON, or a wrong version', () => {
    expect(parseGuestProgress(null).quests).toEqual([])
    expect(parseGuestProgress('not json').quests).toEqual([])
    expect(parseGuestProgress(JSON.stringify({ version: 999, quests: [] })).quests).toEqual([])
  })

  it('drops quest ids that do not exist in the curriculum', () => {
    // localStorage is user-writable, so an unknown id is either stale content
    // or tampering; either way it must not be credited.
    const raw = JSON.stringify({
      version: GUEST_PROGRESS_VERSION,
      quests: [{ questId: 'not-a-real-quest', completedAt: 1 }],
    })
    expect(parseGuestProgress(raw).quests).toEqual([])
  })

  it('drops records with an out-of-range score', () => {
    const raw = JSON.stringify({
      version: GUEST_PROGRESS_VERSION,
      quests: [{ questId: QUEST_A.id, score: 150, completedAt: 1 }],
    })
    expect(parseGuestProgress(raw).quests).toEqual([])
  })

  it('keeps a valid record and de-duplicates repeated ids', () => {
    const raw = JSON.stringify({
      version: GUEST_PROGRESS_VERSION,
      quests: [
        { questId: QUEST_A.id, score: 80, completedAt: 5 },
        { questId: QUEST_A.id, score: 90, completedAt: 6 },
      ],
    })
    const parsed = parseGuestProgress(raw)
    expect(parsed.quests).toHaveLength(1)
    expect(parsed.quests[0]).toMatchObject({ questId: QUEST_A.id, score: 80 })
  })
})

describe('withQuestCompleted', () => {
  it('adds a new completion without mutating the input', () => {
    const before = emptyGuestProgress()
    const after = withQuestCompleted(before, QUEST_A.id, 70, 100)
    expect(before.quests).toEqual([])
    expect(after.quests).toEqual([{ questId: QUEST_A.id, score: 70, completedAt: 100 }])
  })

  it('omits score entirely for an unscored quest type', () => {
    const after = withQuestCompleted(emptyGuestProgress(), QUEST_A.id, undefined, 100)
    expect(after.quests[0]).toEqual({ questId: QUEST_A.id, completedAt: 100 })
  })

  it('a retake takes the newer score but keeps the original completedAt', () => {
    // completedAt drives migration ordering, so a replay must not reorder it.
    const first = withQuestCompleted(emptyGuestProgress(), QUEST_A.id, 50, 100)
    const second = withQuestCompleted(first, QUEST_A.id, 95, 200)
    expect(second.quests).toHaveLength(1)
    expect(second.quests[0]).toEqual({ questId: QUEST_A.id, score: 95, completedAt: 100 })
  })
})

describe('guestXP', () => {
  it('sums the curriculum xpReward rather than any stored amount', () => {
    let progress = withQuestCompleted(emptyGuestProgress(), QUEST_A.id, undefined, 1)
    progress = withQuestCompleted(progress, QUEST_B.id, undefined, 2)
    expect(guestXP(progress)).toBe(QUEST_A.xpReward + QUEST_B.xpReward)
  })

  it('does not double-count a replayed quest', () => {
    let progress = withQuestCompleted(emptyGuestProgress(), QUEST_A.id, 40, 1)
    progress = withQuestCompleted(progress, QUEST_A.id, 90, 2)
    expect(guestXP(progress)).toBe(QUEST_A.xpReward)
  })
})

describe('guestCompletedQuestIds', () => {
  it('returns ids in completion order', () => {
    let progress = withQuestCompleted(emptyGuestProgress(), QUEST_B.id, undefined, 500)
    progress = withQuestCompleted(progress, QUEST_A.id, undefined, 100)
    expect(guestCompletedQuestIds(progress)).toEqual([QUEST_A.id, QUEST_B.id])
  })
})
