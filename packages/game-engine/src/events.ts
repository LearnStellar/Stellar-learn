/**
 * Strongly-typed event contracts between Phaser game scenes and the React UI.
 *
 * All game ↔ React communication must use these payloads and event names
 * to avoid stringly-typed drifting.
 */

export interface QuestTriggeredPayload {
  questIndex: number
}

export interface QuestClosedPayload {
  questIndex: number
  completed: boolean
}

export interface BossStartPayload {
  won: boolean
  bossName?: string
}

export interface BossResolvedPayload {
  won: boolean
  worldId: string
}

export type QuestsSyncedPayload = number[]

export interface GameEngineEvents {
  'quest-triggered': QuestTriggeredPayload
  'quest-closed': QuestClosedPayload
  'quests-synced': QuestsSyncedPayload
  'boss-start': BossStartPayload
  'boss-resolved': BossResolvedPayload
  'level-ready': void
  'set-interacting': boolean
}

export type GameEngineEventName = keyof GameEngineEvents

/** Type guard verifying that a quest index is within valid level boundaries (0-4). */
export function isValidQuestIndex(index: unknown): index is number {
  return typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < 5
}

/** Type guard verifying a valid boss resolution payload. */
export function isBossResolvedPayload(payload: unknown): payload is BossResolvedPayload {
  if (!payload || typeof payload !== 'object') return false
  const p = payload as Record<string, unknown>
  return typeof p.won === 'boolean' && typeof p.worldId === 'string' && p.worldId.trim().length > 0
}
