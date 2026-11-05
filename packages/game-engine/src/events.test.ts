import { describe, expect, it } from 'vitest'
import {
  isValidQuestIndex,
  isBossResolvedPayload,
  type QuestTriggeredPayload,
  type QuestClosedPayload,
  type BossStartPayload,
  type BossResolvedPayload,
} from './events'

describe('GameEngine Event Contracts', () => {
  describe('isValidQuestIndex', () => {
    it('accepts valid 0-based quest indices within a 5-quest world', () => {
      expect(isValidQuestIndex(0)).toBe(true)
      expect(isValidQuestIndex(1)).toBe(true)
      expect(isValidQuestIndex(2)).toBe(true)
      expect(isValidQuestIndex(3)).toBe(true)
      expect(isValidQuestIndex(4)).toBe(true)
    })

    it('rejects out of bounds and non-integer values', () => {
      expect(isValidQuestIndex(-1)).toBe(false)
      expect(isValidQuestIndex(5)).toBe(false)
      expect(isValidQuestIndex(1.5)).toBe(false)
      expect(isValidQuestIndex('0')).toBe(false)
      expect(isValidQuestIndex(null)).toBe(false)
      expect(isValidQuestIndex(undefined)).toBe(false)
    })
  })

  describe('isBossResolvedPayload', () => {
    it('validates correct boss resolved payloads', () => {
      const winPayload: BossResolvedPayload = { won: true, worldId: 'world-1-origin-plains' }
      const lossPayload: BossResolvedPayload = { won: false, worldId: 'world-2-wallet-kingdom' }

      expect(isBossResolvedPayload(winPayload)).toBe(true)
      expect(isBossResolvedPayload(lossPayload)).toBe(true)
    })

    it('rejects invalid payloads missing required fields', () => {
      expect(isBossResolvedPayload(null)).toBe(false)
      expect(isBossResolvedPayload({})).toBe(false)
      expect(isBossResolvedPayload({ won: 'true', worldId: 'world-1' })).toBe(false)
      expect(isBossResolvedPayload({ won: true, worldId: '' })).toBe(false)
      expect(isBossResolvedPayload({ won: true })).toBe(false)
    })
  })

  describe('Type payload contracts', () => {
    it('correctly types quest and boss payloads', () => {
      const questTrigger: QuestTriggeredPayload = { questIndex: 2 }
      const questClose: QuestClosedPayload = { questIndex: 2, completed: true }
      const bossStart: BossStartPayload = { won: true, bossName: 'The Doubt Wraith' }

      expect(questTrigger.questIndex).toBe(2)
      expect(questClose.completed).toBe(true)
      expect(bossStart.bossName).toBe('The Doubt Wraith')
    })
  })
})
