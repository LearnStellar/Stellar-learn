import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@stellar-learn/database'
import { isEquipSlot, type EquipSlot } from '@stellar-learn/game-engine/characterRender'
import { clerkEnabled } from '@/lib/auth'
import { isCharacterId, pickRandomCharacter } from '@/lib/characters'
import { loggerFromHeaders } from '@/lib/correlation'
import { toEquippedItemMap } from '@/lib/equippedItems'
import { getOwnedItemIds } from '@/lib/ownership'

async function profilePayload(userId: string, characterId: string, equippedItems: unknown) {
  return {
    characterId,
    equippedItems: toEquippedItemMap(equippedItems),
    ownedItemIds: await getOwnedItemIds(userId),
  }
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
