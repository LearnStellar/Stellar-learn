import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@stellar-learn/database'
import { clerkEnabled } from '@/lib/auth'
import { loggerFromHeaders } from '@/lib/correlation'
import {
  computeWorldStates,
  isKnownWorld,
  nextWorldSlug,
  routeAfterBoss,
  type WorldState,
} from '@/lib/progression'

/**
 * World progression (Issue #5).
 *
 * GET  → the locked / unlocked / completed state of every world.
 * POST → record a boss outcome: a win clears the world and unlocks the next
 *        one, a loss keeps the player in the world and reopens the quests they
 *        failed so they can retry the material.
 *
 * Both are guarded: with Clerk or the database unconfigured the route still
 * answers 200 with `persisted: false` and the derived default map, so the game
 * remains playable offline and the client falls back to its local mirror.
 */

interface BossOutcomeBody {
  worldId?: string
  won?: boolean
  /** Quests the player failed; reopened on a loss so they can be retried. */
  failedQuestIds?: string[]
}

function unpersisted(completedSlugs: string[] = []): { worlds: WorldState[]; persisted: false } {
  return { worlds: computeWorldStates(completedSlugs), persisted: false }
}

/** The signed-in player's local user row, or null when we cannot resolve one. */
async function currentUserId(): Promise<string | null> {
  if (!clerkEnabled) return null
  const { userId: clerkId } = auth()
  if (!clerkId) return null
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } })
  return user?.id ?? null
}

export async function GET(request: Request) {
  const log = loggerFromHeaders(request.headers)

  try {
    const userId = await currentUserId()
    if (!userId) return NextResponse.json(unpersisted())

    const rows = await prisma.worldProgress.findMany({
      where: { userId, status: 'COMPLETED' },
      select: { worldSlug: true },
    })

    return NextResponse.json({
      worlds: computeWorldStates(rows.map((row) => row.worldSlug)),
      persisted: true,
    })
  } catch (error) {
    // No database configured (or it is down) — the game must still be playable.
    log.error('world progress fetch failed', {}, error)
    return NextResponse.json(unpersisted())
  }
}

export async function POST(request: Request) {
  const log = loggerFromHeaders(request.headers)

  const body = (await request.json().catch(() => ({}))) as BossOutcomeBody
  const worldSlug = body.worldId
  const won = body.won === true
  const failedQuestIds = Array.isArray(body.failedQuestIds) ? body.failedQuestIds : []

  if (!worldSlug || !isKnownWorld(worldSlug)) {
    return NextResponse.json({ error: 'A known worldId is required' }, { status: 400 })
  }

  // The routing decision is pure and never depends on the database, so a win
  // advances the player even when nothing can be saved.
  const routing = {
    won,
    worldId: worldSlug,
    nextWorldSlug: won ? nextWorldSlug(worldSlug) : null,
    redirectTo: routeAfterBoss(worldSlug, won),
  }

  try {
    const userId = await currentUserId()
    if (!userId) return NextResponse.json({ ...routing, ...unpersisted(won ? [worldSlug] : []) })

    await prisma.$transaction(async (tx) => {
      await tx.worldProgress.upsert({
        where: { userId_worldSlug: { userId, worldSlug } },
        update: {
          status: won ? 'COMPLETED' : 'UNLOCKED',
          bossWon: won,
          bossAttempts: { increment: 1 },
          completedAt: won ? new Date() : null,
        },
        create: {
          userId,
          worldSlug,
          status: won ? 'COMPLETED' : 'UNLOCKED',
          bossWon: won,
          bossAttempts: 1,
          completedAt: won ? new Date() : null,
        },
      })

      if (won) {
        // Unlock the next world. `update: {}` keeps an already-completed world
        // completed if the player replays an earlier one.
        const next = nextWorldSlug(worldSlug)
        if (next) {
          await tx.worldProgress.upsert({
            where: { userId_worldSlug: { userId, worldSlug: next } },
            update: {},
            create: { userId, worldSlug: next, status: 'UNLOCKED' },
          })
        }
      } else if (failedQuestIds.length > 0) {
        // Reopen the quests that lost the battle so their runes come back and
        // the player retries exactly the material they got wrong. XP already
        // awarded stays — only the completion is rolled back.
        await tx.progress.updateMany({
          where: { userId, questId: { in: failedQuestIds } },
          data: { status: 'IN_PROGRESS', completedAt: null },
        })
      }
    })

    const rows = await prisma.worldProgress.findMany({
      where: { userId, status: 'COMPLETED' },
      select: { worldSlug: true },
    })

    log.info('boss outcome recorded', { worldSlug, won, reopened: failedQuestIds.length })
    return NextResponse.json({
      ...routing,
      worlds: computeWorldStates(rows.map((row) => row.worldSlug)),
      persisted: true,
    })
  } catch (error) {
    log.error('world progress update failed', { worldSlug, won }, error)
    return NextResponse.json({ ...routing, ...unpersisted(won ? [worldSlug] : []) })
  }
}
