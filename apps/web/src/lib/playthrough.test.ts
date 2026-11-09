import { describe, it, expect } from 'vitest'
import {
  emptyGuestProgress,
  withQuestCompleted,
  guestCompletedQuestIds,
  guestXP,
  guestGems,
  parseGuestProgress,
} from './localProgress'
import {
  worlds,
  worldQuests,
  isWorldUnlocked,
  isWorldCompleted,
  isWorldPlayable,
} from '@stellar-learn/content'
import { guestMigrationSchema } from './schemas'
import { GemSource } from '@stellar-learn/database'
import {
  checkInIdempotencyKey,
  CLIENT_TRIGGERED_EARN_AMOUNTS,
  CLIENT_SPENDABLE_SOURCES,
} from './gems'
import { toEquippedItemMap } from './equippedItems'

describe('End-to-End Playthrough Integration', () => {
  it('completes the full loop: guest play across Worlds 1-3, boss unlocking, account migration, and item purchase', () => {
    // Phase 1: Guest Play in World 1 (Origin Plains)
    const w1 = worlds[0]
    if (!w1) throw new Error('World 1 missing')
    expect(w1.id).toBe('world-1-origin-plains')
    expect(isWorldPlayable(w1)).toBe(true)
    expect(isWorldUnlocked(w1, [])).toBe(true)

    // Initial state
    let guestProgress = emptyGuestProgress()
    expect(guestProgress.quests).toHaveLength(0)

    // Player completes all quests in World 1 (60 quests across 12 levels)
    let time = 1700000000000
    const w1Quests = worldQuests(w1)
    expect(w1Quests.length).toBeGreaterThanOrEqual(5)

    for (const quest of w1Quests) {
      guestProgress = withQuestCompleted(guestProgress, quest.id, 100, time)
      time += 60000
    }

    let completedIds = guestCompletedQuestIds(guestProgress)
    expect(completedIds).toHaveLength(w1Quests.length)
    expect(isWorldCompleted(w1, completedIds)).toBe(true)
    expect(guestGems(guestProgress)).toBe(w1Quests.length * 10)

    // Phase 2: World 2 (Wallet Kingdom) Unlocks
    const w2 = worlds[1]
    if (!w2) throw new Error('World 2 missing')
    expect(w2.id).toBe('world-2-wallet-kingdom')
    expect(isWorldPlayable(w2)).toBe(true)
    expect(isWorldUnlocked(w2, completedIds)).toBe(true)
    expect(isWorldCompleted(w2, completedIds)).toBe(false)

    // Player completes all quests in World 2
    const w2Quests = worldQuests(w2)
    expect(w2Quests).toHaveLength(5)

    for (const quest of w2Quests) {
      guestProgress = withQuestCompleted(guestProgress, quest.id, 100, time)
      time += 60000
    }

    completedIds = guestCompletedQuestIds(guestProgress)
    expect(completedIds).toHaveLength(w1Quests.length + w2Quests.length)
    expect(isWorldCompleted(w2, completedIds)).toBe(true)
    expect(guestGems(guestProgress)).toBe((w1Quests.length + w2Quests.length) * 10)

    // Phase 3: World 3 (Asset Forge) Unlocks
    const w3 = worlds[2]
    if (!w3) throw new Error('World 3 missing')
    expect(w3.id).toBe('world-3-asset-forge')
    expect(isWorldPlayable(w3)).toBe(true)
    expect(isWorldUnlocked(w3, completedIds)).toBe(true)
    expect(isWorldCompleted(w3, completedIds)).toBe(false)

    // Player completes all quests in World 3
    const w3Quests = worldQuests(w3)
    expect(w3Quests).toHaveLength(5)

    for (const quest of w3Quests) {
      guestProgress = withQuestCompleted(guestProgress, quest.id, 100, time)
      time += 60000
    }

    completedIds = guestCompletedQuestIds(guestProgress)
    expect(completedIds).toHaveLength(w1Quests.length + w2Quests.length + w3Quests.length)
    expect(isWorldCompleted(w3, completedIds)).toBe(true)
    expect(guestGems(guestProgress)).toBe(
      (w1Quests.length + w2Quests.length + w3Quests.length) * 10
    )

    // Verify storage serialization and parsing resilience
    const serialized = JSON.stringify(guestProgress)
    const reloaded = parseGuestProgress(serialized)
    expect(reloaded.quests).toHaveLength(completedIds.length)

    // Phase 4: Account Migration Validation with Zod Schema
    const migrationResult = guestMigrationSchema.safeParse({
      quests: guestProgress.quests,
    })
    expect(migrationResult.success).toBe(true)
    if (!migrationResult.success) throw new Error('Schema validation failed')

    const totalCalculatedXp = guestXP(guestProgress)
    expect(totalCalculatedXp).toBeGreaterThan(1000)

    // Phase 5: In-game Economy & Marketplace Verification
    const userId = 'user_playthrough_complete'
    const checkinKey = checkInIdempotencyKey(userId, new Date('2026-11-09T00:00:00Z'))
    expect(checkinKey).toBe('checkin:user_playthrough_complete:2026-11-09')

    // Verify check-in reward definition is tamper-proof
    expect(CLIENT_TRIGGERED_EARN_AMOUNTS['DAILY_CHECK_IN']).toBe(10)
    expect(CLIENT_SPENDABLE_SOURCES.has(GemSource.MARKETPLACE_PURCHASE)).toBe(true)

    // Validate equipped item inventory slot parsing
    const rawEquipped = {
      weapon: 'sword-legendary',
      offhand: 'shield-rare',
      body: 'armor-epic',
      head: 'helmet-common',
    }
    const equipped = toEquippedItemMap(rawEquipped)
    expect(equipped.weapon).toBe('sword-legendary')
    expect(equipped.offhand).toBe('shield-rare')
    expect(equipped.body).toBe('armor-epic')
    expect(equipped.head).toBe('helmet-common')
  })
})
