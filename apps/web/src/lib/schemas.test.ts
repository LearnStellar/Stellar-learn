import { describe, expect, it } from 'vitest'
import {
  gemTransactionSchema,
  guestMigrationSchema,
  marketplacePurchaseSchema,
  playgroundExecutionSchema,
  profileActionSchema,
  progressSubmissionSchema,
  worldParamSchema,
  levelParamSchema,
} from './schemas'
import { parseJsonBodyWithSchema } from './api'

describe('API Input Validation Schemas (schemas.ts)', () => {
  describe('progressSubmissionSchema', () => {
    it('accepts valid quest progress submissions', () => {
      const valid = progressSubmissionSchema.safeParse({ questId: 'q-1', score: 95 })
      expect(valid.success).toBe(true)
      if (valid.success) {
        expect(valid.data.questId).toBe('q-1')
        expect(valid.data.score).toBe(95)
      }
    })

    it('accepts quest progress submission without score', () => {
      const valid = progressSubmissionSchema.safeParse({ questId: 'q-lesson' })
      expect(valid.success).toBe(true)
    })

    it('rejects missing questId or out-of-range scores', () => {
      expect(progressSubmissionSchema.safeParse({}).success).toBe(false)
      expect(progressSubmissionSchema.safeParse({ questId: '' }).success).toBe(false)
      expect(progressSubmissionSchema.safeParse({ questId: 'q-1', score: -5 }).success).toBe(false)
      expect(progressSubmissionSchema.safeParse({ questId: 'q-1', score: 105 }).success).toBe(false)
    })
  })

  describe('guestMigrationSchema', () => {
    it('accepts valid guest migration payload', () => {
      const valid = guestMigrationSchema.safeParse({
        quests: [{ questId: 'q-1', score: 80 }, { questId: 'q-2' }],
      })
      expect(valid.success).toBe(true)
    })

    it('rejects if quests exceeds 200 items', () => {
      const largeList = Array.from({ length: 201 }, (_, i) => ({ questId: `q-${i}` }))
      expect(guestMigrationSchema.safeParse({ quests: largeList }).success).toBe(false)
    })
  })

  describe('gemTransactionSchema', () => {
    it('validates earn action for DAILY_CHECK_IN', () => {
      const valid = gemTransactionSchema.safeParse({
        action: 'earn',
        source: 'DAILY_CHECK_IN',
      })
      expect(valid.success).toBe(true)
    })

    it('validates spend action for MARKETPLACE_PURCHASE', () => {
      const valid = gemTransactionSchema.safeParse({
        action: 'spend',
        source: 'MARKETPLACE_PURCHASE',
        amount: 50,
        idempotencyKey: 'spend-key-1',
        metadata: { itemId: 'sword' },
      })
      expect(valid.success).toBe(true)
    })

    it('rejects invalid or unauthorized spend actions', () => {
      expect(
        gemTransactionSchema.safeParse({
          action: 'spend',
          source: 'DAILY_CHECK_IN',
          amount: 50,
          idempotencyKey: 'k',
        }).success
      ).toBe(false)

      expect(
        gemTransactionSchema.safeParse({
          action: 'spend',
          source: 'MARKETPLACE_PURCHASE',
          amount: -10,
          idempotencyKey: 'k',
        }).success
      ).toBe(false)
    })
  })

  describe('profileActionSchema', () => {
    it('validates select-character, equip, and unequip', () => {
      expect(
        profileActionSchema.safeParse({
          action: 'select-character',
          characterId: 'warrior',
        }).success
      ).toBe(true)

      expect(
        profileActionSchema.safeParse({
          action: 'equip',
          slot: 'weapon',
          itemId: 'item-sword',
        }).success
      ).toBe(true)

      expect(
        profileActionSchema.safeParse({
          action: 'unequip',
          slot: 'head',
        }).success
      ).toBe(true)
    })

    it('rejects unknown slots or missing item ids', () => {
      expect(
        profileActionSchema.safeParse({
          action: 'equip',
          slot: 'invalid-slot',
          itemId: 'item-1',
        }).success
      ).toBe(false)

      expect(
        profileActionSchema.safeParse({
          action: 'equip',
          slot: 'weapon',
        }).success
      ).toBe(false)
    })
  })

  describe('marketplacePurchaseSchema & playgroundExecutionSchema', () => {
    it('validates marketplace purchase request', () => {
      expect(marketplacePurchaseSchema.safeParse({ itemId: 'shield' }).success).toBe(true)
      expect(marketplacePurchaseSchema.safeParse({ itemId: '' }).success).toBe(false)
    })

    it('validates playground code payload', () => {
      expect(playgroundExecutionSchema.safeParse({ code: 'const x = 1;' }).success).toBe(true)
      expect(playgroundExecutionSchema.safeParse({ code: '' }).success).toBe(false)
    })
  })

  describe('route param schemas', () => {
    it('validates world and level params', () => {
      expect(worldParamSchema.safeParse({ worldId: 'world-1' }).success).toBe(true)
      expect(worldParamSchema.safeParse({ worldId: '' }).success).toBe(false)
      expect(levelParamSchema.safeParse({ worldId: 'world-1', levelId: '1' }).success).toBe(true)
    })
  })

  describe('parseJsonBodyWithSchema', () => {
    it('parses and validates JSON request correctly', async () => {
      const req = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId: 'q-abc', score: 85 }),
      })
      const res = await parseJsonBodyWithSchema(req, progressSubmissionSchema)
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.questId).toBe('q-abc')
        expect(res.data.score).toBe(85)
      }
    })

    it('returns descriptive error on schema violation', async () => {
      const req = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId: 'q-abc', score: 150 }),
      })
      const res = await parseJsonBodyWithSchema(req, progressSubmissionSchema)
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toContain('score')
      }
    })

    it('handles malformed JSON body safely', async () => {
      const req = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json',
      })
      const res = await parseJsonBodyWithSchema(req, progressSubmissionSchema)
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBe('Invalid JSON body')
      }
    })
  })
})
