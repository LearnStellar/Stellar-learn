import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@stellar-learn/database'
import { CATEGORY_TO_SLOT, isEquipSlot, type EquipSlot } from '@stellar-learn/game-engine/characterRender'
import { clerkEnabled } from '@/lib/auth'
import { isCharacterId, pickRandomCharacter } from '@/lib/characters'
import { loggerFromHeaders } from '@/lib/correlation'
import { toEquippedItemMap } from '@/lib/equippedItems'
import { getItemCategory, getOwnedItemIds } from '@/lib/ownership'

/** True only when itemId's catalog category actually occupies `slot`. Fails closed on an unknown category. */
function categoryMatchesSlot(category: string | undefined, slot: EquipSlot): boolean {
  return category !== undefined && CATEGORY_TO_SLOT[category] === slot
}

async function profilePayload(userId: string, characterId: string, equippedItemsRaw: unknown) {
  const ownedItemIds = await getOwnedItemIds(userId)
  const owned = new Set(ownedItemIds)

  // A stored equip can outlive ownership (e.g. a future refund/transfer once
  // #77 supports that) — never render or report an item the user no longer
  // owns, even though the slot map still names it until explicitly unequipped.
  const equippedItems = toEquippedItemMap(equippedItemsRaw)
  for (const slot of Object.keys(equippedItems) as EquipSlot[]) {
    const itemId = equippedItems[slot]
    if (itemId && !owned.has(itemId)) delete equippedItems[slot]
  }

  return { characterId, equippedItems, ownedItemIds }
}

export async function GET(request: Request) {
  const log = loggerFromHeaders(request.headers)
  if (!clerkEnabled) return NextResponse.json({ error: 'Auth not configured' }, { status: 401 })

  const { userId: clerkId } = auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { clerkId } })

    // A signed-in player with no local row yet simply hasn't finished
    // onboarding — report the same defaults signup will assign, rather than
    // 404ing (mirrors the "no row yet" handling in api/progress).
    if (!user) return NextResponse.json(await profilePayload(clerkId, 'warrior', {}))

    return NextResponse.json(await profilePayload(user.id, user.characterId, user.equippedItems))
  } catch (error) {
    log.error('profile fetch failed', { clerkId }, error)
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}

/**
 * Raw, fully untrusted request body — every field is optional/unknown-typed
 * on purpose. Each action below validates exactly the fields it needs rather
 * than relying on a discriminated union to do it structurally, since this is
 * parsed straight from client JSON.
 */
interface RawProfileBody {
  action?: unknown
  characterId?: unknown
  slot?: unknown
  itemId?: unknown
}

export async function POST(request: Request) {
  const log = loggerFromHeaders(request.headers)
  if (!clerkEnabled) return NextResponse.json({ error: 'Auth not configured' }, { status: 401 })

  const { userId: clerkId } = auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as RawProfileBody
  const action = body.action
  if (action !== 'select-character' && action !== 'equip' && action !== 'unequip') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  try {
    // Same fallback-create as api/progress: the Clerk webhook normally
    // creates this row at signup; this only covers local dev without it.
    const clerkUser = await currentUser()
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? `${clerkId}@noemail.local`
    const username = clerkUser?.username ?? `player_${clerkId.slice(-8)}`
    const user = await prisma.user.upsert({
      where: { clerkId },
      update: { lastActiveAt: new Date() },
      create: {
        clerkId,
        email,
        username,
        avatarUrl: clerkUser?.imageUrl ?? null,
        characterId: pickRandomCharacter(),
        lastActiveAt: new Date(),
      },
    })

    if (action === 'select-character') {
      if (typeof body.characterId !== 'string' || !isCharacterId(body.characterId)) {
        return NextResponse.json({ error: 'Unknown character id' }, { status: 400 })
      }
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { characterId: body.characterId },
      })
      log.info('character selected', { clerkId, characterId: body.characterId })
      return NextResponse.json(await profilePayload(updated.id, updated.characterId, updated.equippedItems))
    }

    // Both equip and unequip need a valid slot.
    if (typeof body.slot !== 'string' || !isEquipSlot(body.slot)) {
      return NextResponse.json({ error: 'Unknown equip slot' }, { status: 400 })
    }
    const slot: EquipSlot = body.slot
    const current = toEquippedItemMap(user.equippedItems)

    if (action === 'unequip') {
      delete current[slot]
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { equippedItems: current },
      })
      log.info('item unequipped', { clerkId, slot })
      return NextResponse.json(await profilePayload(updated.id, updated.characterId, updated.equippedItems))
    }

    // action === 'equip' — never trust the client: the item must be owned.
    // getOwnedItemIds is the seam issue #77's ownership table fills in; until
    // then it returns [] and every equip is correctly rejected.
    if (typeof body.itemId !== 'string' || body.itemId.length === 0) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
    }
    const itemId = body.itemId
    const owned = await getOwnedItemIds(user.id)
    if (!owned.includes(itemId)) {
      return NextResponse.json({ error: 'Item is not owned' }, { status: 403 })
    }
    // TODO(#77): getItemCategory has no catalog to consult yet, so this
    // always fails closed — harmless today since the ownership check above
    // already rejects every equip, but required so an owned item can never
    // be written into a slot its category doesn't occupy once both the
    // catalog and ownership exist.
    if (!categoryMatchesSlot(getItemCategory(itemId), slot)) {
      return NextResponse.json({ error: 'Item does not match this equip slot' }, { status: 400 })
    }

    // Equipping a weapon-slot item (sword or spear) replaces whatever else
    // occupied that slot — a single map key, so this is just an overwrite.
    current[slot] = itemId
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { equippedItems: current },
    })
    log.info('item equipped', { clerkId, slot, itemId })
    return NextResponse.json(await profilePayload(updated.id, updated.characterId, updated.equippedItems))
  } catch (error) {
    log.error('profile update failed', { clerkId }, error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
