import { z } from 'zod'

/**
 * Progression submission schema for POST /api/progress.
 */
export const progressSubmissionSchema = z.object({
  questId: z.string().min(1, 'questId is required'),
  score: z
    .number()
    .min(0, 'score must be between 0 and 100')
    .max(100, 'score must be between 0 and 100')
    .optional(),
})

export type ProgressSubmissionInput = z.infer<typeof progressSubmissionSchema>

/**
 * Guest migration record schema for individual quests.
 */
export const guestMigrationRecordSchema = z.object({
  questId: z.string().min(1, 'questId is required'),
  score: z
    .number()
    .min(0, 'score must be between 0 and 100')
    .max(100, 'score must be between 0 and 100')
    .optional(),
})

/**
 * Guest migration schema for POST /api/progress/migrate.
 */
export const guestMigrationSchema = z.object({
  quests: z.array(guestMigrationRecordSchema).max(200, 'quests must contain at most 200 entries'),
})

export type GuestMigrationInput = z.infer<typeof guestMigrationSchema>

/**
 * Earn schema for daily check-ins on POST /api/gems.
 */
export const gemEarnSchema = z.object({
  action: z.literal('earn'),
  source: z.literal('DAILY_CHECK_IN'),
})

/**
 * Spend schema for marketplace purchases on POST /api/gems.
 */
export const gemSpendSchema = z.object({
  action: z.literal('spend'),
  source: z.literal('MARKETPLACE_PURCHASE'),
  amount: z.number().int().positive('amount must be a positive integer'),
  idempotencyKey: z.string().min(1, 'idempotencyKey is required'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Discriminated union of gem economy actions on POST /api/gems.
 */
export const gemTransactionSchema = z.discriminatedUnion('action', [gemEarnSchema, gemSpendSchema])

export type GemTransactionInput = z.infer<typeof gemTransactionSchema>

/**
 * Character selection on PATCH /api/profile.
 */
export const profileSelectCharacterSchema = z.object({
  action: z.literal('select-character'),
  characterId: z.string().min(1, 'characterId is required'),
})

/**
 * Cosmetic item equipping on PATCH /api/profile.
 */
export const profileEquipSchema = z.object({
  action: z.literal('equip'),
  slot: z.enum(['head', 'chest', 'legs', 'weapon', 'offhand', 'accessory']),
  itemId: z.string().min(1, 'itemId is required'),
})

/**
 * Cosmetic item unequipping on PATCH /api/profile.
 */
export const profileUnequipSchema = z.object({
  action: z.literal('unequip'),
  slot: z.enum(['head', 'chest', 'legs', 'weapon', 'offhand', 'accessory']),
})

/**
 * Discriminated union of profile actions on PATCH /api/profile.
 */
export const profileActionSchema = z.discriminatedUnion('action', [
  profileSelectCharacterSchema,
  profileEquipSchema,
  profileUnequipSchema,
])

export type ProfileActionInput = z.infer<typeof profileActionSchema>

/**
 * Marketplace purchase request on POST /api/marketplace.
 */
export const marketplacePurchaseSchema = z.object({
  itemId: z.string().min(1, 'itemId is required'),
})

export type MarketplacePurchaseInput = z.infer<typeof marketplacePurchaseSchema>

/**
 * Playground execution request on POST /api/playground.
 */
export const playgroundExecutionSchema = z.object({
  code: z.string().min(1, 'code is required').max(100000, 'code exceeds maximum length'),
})

export type PlaygroundExecutionInput = z.infer<typeof playgroundExecutionSchema>

/**
 * Route params schemas.
 */
export const worldParamSchema = z.object({
  worldId: z.string().min(1, 'worldId is required'),
})

export const levelParamSchema = z.object({
  worldId: z.string().min(1, 'worldId is required'),
  levelId: z.string().min(1, 'levelId is required'),
})
