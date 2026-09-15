'use client'

import { useEffect, useState } from 'react'
import { EQUIP_SLOTS, type EquipSlot, type EquippedItemMap } from '@stellar-learn/game-engine/characterRender'
import { CHARACTER_IDS, characterDisplayName } from '@/lib/characters'
import { CharacterPortrait } from './CharacterPortrait'
import { SpriteSlot } from '@/components/ui/SpriteSlot'

interface ProfilePayload {
  characterId: string
  equippedItems: EquippedItemMap
  ownedItemIds: string[]
}

const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon: 'WEAPON',
  offhand: 'OFFHAND',
  body: 'ARMOR',
  head: 'HELMET',
}

/**
 * AvatarSelect — hero picker + equip panel.
 *
 * The live preview and every slot below it render through `CharacterPortrait`
 * (backed by `buildCharacterLayers`), so this screen and the HUD/dashboard
 * can never visually disagree about what a character with a given equip set
 * looks like.
 *
 * Equip slots are always empty today: owning a cosmetic item depends on the
 * marketplace (issue #77), which has not shipped — `ownedItemIds` from
 * /api/profile is correctly always `[]` until it does (see
 * apps/web/src/lib/ownership.ts). The slots are still fully wired so no
 * further UI work is needed once items exist to equip.
 */
export function AvatarSelect() {
  const [profile, setProfile] = useState<ProfilePayload | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load profile'))))
      .then((data: ProfilePayload) => {
        if (cancelled) return
        setProfile(data)
        setSelected(data.characterId)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your profile. Sign in and try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const confirmSelection = async () => {
    if (!selected || selected === profile?.characterId) return
    setSaving(true)
    setError(null)
    setSavedMessage(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select-character', characterId: selected }),
      })
      if (!res.ok) throw new Error('Selection failed')
      const data = (await res.json()) as ProfilePayload
      setProfile(data)
      setSavedMessage(`${characterDisplayName(data.characterId)} is now your hero.`)
    } catch {
      setError('Could not save your selection. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const unequip = async (slot: EquipSlot) => {
    setError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unequip', slot }),
      })
      if (!res.ok) throw new Error('Unequip failed')
      setProfile((await res.json()) as ProfilePayload)
    } catch {
      setError('Could not update that slot. Try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-dark">
        <div className="font-pixel text-xs text-brand-gold/60 animate-pulse">Loading avatar...</div>
      </div>
    )
  }

  const previewId = selected ?? 'warrior'

  return (
    <div className="min-h-screen bg-brand-dark px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 font-pixel text-lg text-brand-gold">Choose Your Hero</h1>
        <p className="mb-8 font-sans text-sm text-brand-gold/60">
          Pick a hero and manage the cosmetic items you own.
        </p>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-sans text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-[1fr_auto]">
          {/* Hero grid */}
          <div>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
              {CHARACTER_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(id)}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition ${
                    selected === id
                      ? 'border-brand-gold-bright bg-brand-dark-2'
                      : 'border-brand-dark-4 bg-brand-dark-2/50 hover:border-brand-purple-light'
                  }`}
                >
                  <CharacterPortrait characterId={id} size={48} />
                  <span className="font-pixel text-[8px] text-brand-gold/80">
                    {characterDisplayName(id)}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void confirmSelection()}
              disabled={saving || !selected || selected === profile?.characterId}
              className="btn-pixel mt-6 text-[10px] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving
                ? 'Saving...'
                : selected === profile?.characterId
                  ? 'Selected'
                  : 'Confirm Hero'}
            </button>
            {savedMessage && (
              <p className="mt-3 font-sans text-xs text-brand-gold-bright">{savedMessage}</p>
            )}
          </div>

          {/* Live preview + equip slots */}
          <div className="flex flex-col items-center gap-4 rounded-xl border border-brand-dark-4 bg-brand-dark-2/50 p-6">
            <CharacterPortrait
              characterId={previewId}
              equippedItems={profile?.equippedItems}
              size={140}
            />
            <span className="font-pixel text-xs text-brand-gold">
              {characterDisplayName(previewId)}
            </span>

            <div className="mt-2 grid grid-cols-2 gap-3">
              {EQUIP_SLOTS.map((slot) => {
                const itemId = profile?.equippedItems[slot]
                return (
                  <div key={slot} className="flex flex-col items-center gap-1">
                    <SpriteSlot
                      label={SLOT_LABELS[slot]}
                      dim={itemId ?? 'No item owned'}
                      className="h-16 w-16"
                    />
                    {itemId && (
                      <button
                        type="button"
                        onClick={() => void unequip(slot)}
                        className="font-pixel text-[7px] text-brand-gold/50 hover:text-brand-gold"
                      >
                        UNEQUIP
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="max-w-[220px] text-center font-sans text-[11px] text-brand-gold/40">
              Cosmetic items appear here once you own them from the marketplace.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
