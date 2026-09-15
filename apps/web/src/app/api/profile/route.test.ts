import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Exercises the full equip pipeline end to end at the API layer with a
 * temporary in-memory stand-in for #77's not-yet-built ownership/catalog —
 * exactly the scenario the PR review asked to see demonstrated ("equipped
 * items render on the character and in previews"), but as a repeatable
 * automated test rather than a one-off manual override + screen recording
 * (this environment has no screen-capture capability). A real Loom against
 * a live database is still tracked as a human follow-up in the PR.
 *
 * Everything genuinely external is mocked: Clerk auth, the Prisma client,
 * and the #77 ownership/catalog seam (`@/lib/ownership`). The route module
 * itself — validation, the ownership check, the slot/category check, the
 * ownership-intersection on read — runs for real.
 */

const CLERK_ID = 'clerk_test_user'

// In-memory "database" — just enough of the Prisma user shape this route touches.
let dbUser: { id: string; clerkId: string; characterId: string; equippedItems: unknown }

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => ({ userId: CLERK_ID }),
  currentUser: async () => ({
    emailAddresses: [{ emailAddress: 'tester@example.com' }],
    username: 'tester',
    imageUrl: null,
  }),
}))

vi.mock('@/lib/auth', () => ({ clerkEnabled: true }))

vi.mock('@stellar-learn/database', () => ({
  prisma: {
    user: {
      findUnique: async ({ where }: { where: { clerkId: string } }) =>
        where.clerkId === dbUser.clerkId ? { ...dbUser } : null,
      upsert: async () => ({ ...dbUser }),
      update: async ({ data }: { data: Partial<typeof dbUser> }) => {
        dbUser = { ...dbUser, ...data }
        return { ...dbUser }
      },
    },
  },
}))

// Stand-in for #77's ownership table + catalog, mutable per test so the
// "no longer owned" (ownership-intersection) case can be exercised too.
let ownedItemIds: string[]
const CATEGORY_BY_ITEM: Record<string, string> = {
  'sword-legendary-test': 'sword',
  'shield-rare-test': 'shield',
}

vi.mock('@/lib/ownership', () => ({
  getOwnedItemIds: async () => ownedItemIds,
  getItemCategory: (itemId: string) => CATEGORY_BY_ITEM[itemId],
}))

function post(body: unknown) {
  return new Request('http://localhost/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function get() {
  return new Request('http://localhost/api/profile')
}

describe('api/profile — equip pipeline (issue #82, standing in for #77 ownership)', () => {
  beforeEach(() => {
    dbUser = { id: 'user_1', clerkId: CLERK_ID, characterId: 'warrior', equippedItems: {} }
    ownedItemIds = ['sword-legendary-test', 'shield-rare-test']
  })

  it('equips an owned item whose category matches the slot, and it round-trips on GET', async () => {
    const { POST, GET } = await import('./route')

    const equipRes = await POST(post({ action: 'equip', slot: 'weapon', itemId: 'sword-legendary-test' }))
    expect(equipRes.status).toBe(200)
    const equipBody = await equipRes.json()
    expect(equipBody.equippedItems).toEqual({ weapon: 'sword-legendary-test' })
    expect(equipBody.ownedItemIds).toEqual(ownedItemIds)

    const getRes = await GET(get())
    const getBody = await getRes.json()
    expect(getBody.equippedItems).toEqual({ weapon: 'sword-legendary-test' })
  })

  it('rejects equipping an item that is not owned', async () => {
    const { POST } = await import('./route')
    const res = await POST(post({ action: 'equip', slot: 'weapon', itemId: 'not-owned-item' }))
    expect(res.status).toBe(403)
    expect(dbUser.equippedItems).toEqual({})
  })

  it('rejects equipping an owned item into a slot its category does not occupy', async () => {
    const { POST } = await import('./route')
    // shield-rare-test is category "shield" -> slot "offhand", not "weapon".
    const res = await POST(post({ action: 'equip', slot: 'weapon', itemId: 'shield-rare-test' }))
    expect(res.status).toBe(400)
    expect(dbUser.equippedItems).toEqual({})
  })

  it('unequip always clears the slot with no ownership check', async () => {
    const { POST } = await import('./route')
    await POST(post({ action: 'equip', slot: 'offhand', itemId: 'shield-rare-test' }))
    const res = await POST(post({ action: 'unequip', slot: 'offhand' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.equippedItems).toEqual({})
  })

  it('drops a stored equip whose item is no longer owned (ownership-intersection on read)', async () => {
    const { POST, GET } = await import('./route')
    await POST(post({ action: 'equip', slot: 'weapon', itemId: 'sword-legendary-test' }))

    // Simulate the item leaving the user's inventory after it was equipped.
    ownedItemIds = ownedItemIds.filter((id) => id !== 'sword-legendary-test')

    const res = await GET(get())
    const body = await res.json()
    expect(body.equippedItems).toEqual({})
  })

  it('persists a character selection', async () => {
    const { POST } = await import('./route')
    const res = await POST(post({ action: 'select-character', characterId: 'mage' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.characterId).toBe('mage')
    expect(dbUser.characterId).toBe('mage')
  })

  it('rejects an unknown character id', async () => {
    const { POST } = await import('./route')
    const res = await POST(post({ action: 'select-character', characterId: 'not-a-hero' }))
    expect(res.status).toBe(400)
  })
})
