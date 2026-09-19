import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@stellar-learn/database'
import { getQuestById } from '@stellar-learn/content'
import { clerkEnabled } from '@/lib/auth'
import { pickRandomCharacter } from '@/lib/characters'
import { loggerFromHeaders } from '@/lib/correlation'
import { updateLeaderboard } from '@/lib/leaderboard'
import { isValidScore } from '@/lib/progressValidation'

/**
 * Migrate guest progress onto a freshly signed-in account (issue #75).
 *
 * A visitor plays without an account; their completions live in localStorage
 * (apps/web/src/lib/localProgress.ts). On signup the client posts them here
 * once and clears local storage.
 *
 * Server-authoritative, exactly like /api/progress: the client sends quest ids
 * and optional quiz scores, never an XP amount. Each id is resolved against the
 * curriculum and its own `xpReward` is what gets credited, so a tampered
 * localStorage can at most claim quests that genuinely exist.
 *
 * Idempotent: a quest already COMPLETED on the account is skipped and awards
 * nothing, so a retried or duplicated migration cannot inflate a balance.
 */

/** Guest sessions are short; this bounds a hostile payload without cutting off real play. */
const MAX_QUESTS_PER_MIGRATION = 200

interface MigrateQuest {
  questId: string
  score?: number
}

export async function POST(request: Request) {
  const log = loggerFromHeaders(request.headers)
  if (!clerkEnabled) return NextResponse.json({ error: 'Auth not configured' }, { status: 401 })

  const { userId: clerkId } = auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Send a JSON body' }, { status: 400 })
  }

  const rawQuests = (body as { quests?: unknown } | null)?.quests
  if (!Array.isArray(rawQuests)) {
    return NextResponse.json({ error: 'quests must be an array' }, { status: 400 })
  }
  if (rawQuests.length > MAX_QUESTS_PER_MIGRATION) {
    return NextResponse.json(
      { error: `quests must contain at most ${MAX_QUESTS_PER_MIGRATION} entries` },
      { status: 400 }
    )
  }

  // Drop anything malformed rather than failing the whole migration: a single
  // bad record must not cost the player every other quest they completed.
  const seen = new Set<string>()
  const candidates: MigrateQuest[] = []
  for (const entry of rawQuests) {
    const record = entry as Partial<MigrateQuest> | null
    if (!record || typeof record.questId !== 'string' || record.questId.length === 0) continue
    if (seen.has(record.questId)) continue
    if (!isValidScore(record.score)) continue
    if (!getQuestById(record.questId)) continue
    seen.add(record.questId)
    candidates.push({ questId: record.questId, score: record.score })
  }

  try {
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
      },
    })

    // Quests already completed on the account award nothing. This is what makes
    // a repeated migration safe.
    const existing = await prisma.progress.findMany({
      where: { userId: user.id, questId: { in: candidates.map((q) => q.questId) } },
      select: { questId: true, status: true },
    })
    const alreadyCompleted = new Set(
      existing.filter((p) => p.status === 'COMPLETED').map((p) => p.questId)
    )

    const toApply = candidates.filter((q) => !alreadyCompleted.has(q.questId))
    let xpAwarded = 0

    for (const quest of toApply) {
      const xpReward = getQuestById(quest.questId)?.xpReward ?? 0
      xpAwarded += xpReward
      await prisma.progress.upsert({
        where: { userId_questId: { userId: user.id, questId: quest.questId } },
        update: {
          status: 'COMPLETED',
          xpEarned: xpReward,
          score: quest.score ?? null,
          completedAt: new Date(),
          attempts: { increment: 1 },
        },
        create: {
          userId: user.id,
          questId: quest.questId,
          status: 'COMPLETED',
          xpEarned: xpReward,
          score: quest.score ?? null,
          completedAt: new Date(),
          attempts: 1,
        },
      })
    }

    const updatedUser =
      xpAwarded > 0
        ? await prisma.user.update({
            where: { id: user.id },
            data: { currentXP: { increment: xpAwarded }, lastActiveAt: new Date() },
          })
        : user

    await updateLeaderboard(user.id, user.username, updatedUser.currentXP)

    log.info('guest progress migrated', {
      clerkId,
      submitted: rawQuests.length,
      applied: toApply.length,
      skipped: alreadyCompleted.size,
      xpAwarded,
    })

    return NextResponse.json({
      migrated: toApply.length,
      skipped: alreadyCompleted.size,
      xpAwarded,
      totalXP: updatedUser.currentXP,
    })
  } catch (error) {
    log.error('guest progress migration failed', { clerkId }, error)
    return NextResponse.json({ error: 'Failed to migrate progress' }, { status: 500 })
  }
}
