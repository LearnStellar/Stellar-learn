import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@stellar-learn/database'
import { clerkEnabled } from '@/lib/auth'
import { pickRandomCharacter } from '@/lib/characters'
import { loggerFromHeaders } from '@/lib/correlation'
import { updateLeaderboard } from '@/lib/leaderboard'
import { isValidScore } from '@/lib/progressValidation'

export async function GET(request: Request) {
  const log = loggerFromHeaders(request.headers)
  if (!clerkEnabled) return NextResponse.json({ error: 'Auth not configured' }, { status: 401 })

  const { userId: clerkId } = auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        progress: { include: { quest: true } },
      },
    })

    // A signed-in player who hasn't completed anything yet simply has no row —
    // return an empty progress set rather than a 404 the dashboard has to handle.
    if (!user) return NextResponse.json({ progress: [], xp: 0, level: 1 })

    return NextResponse.json({ progress: user.progress, xp: user.currentXP, level: user.level })
  } catch (error) {
    log.error('progress fetch failed', { clerkId }, error)
    return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const log = loggerFromHeaders(request.headers)
  if (!clerkEnabled) return NextResponse.json({ error: 'Auth not configured' }, { status: 401 })

  const { userId: clerkId } = auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as { questId: string; xpEarned: number; score?: number }
  const { questId, xpEarned, score } = body
  if (!questId || typeof xpEarned !== 'number') {
    return NextResponse.json({ error: 'questId and xpEarned are required' }, { status: 400 })
  }
  if (!isValidScore(score)) {
    return NextResponse.json({ error: 'score must be a number between 0 and 100' }, { status: 400 })
  }

  try {
    // Create the local user row on first interaction (Clerk holds the identity;
    // our DB needs a matching row to attach progress/XP to).
    const clerkUser = await currentUser()
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? `${clerkId}@noemail.local`
    const username = clerkUser?.username ?? `player_${clerkId.slice(-8)}`

    // Normally the Clerk webhook (api/webhooks/clerk) has already created this
    // row with a random character at signup; this upsert only creates it here
    // as a fallback (e.g. the webhook isn't configured in local dev).
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

    // Award XP only the first time a quest is completed; replays don't double-count.
    const existing = await prisma.progress.findUnique({
      where: { userId_questId: { userId: user.id, questId } },
    })
    const alreadyCompleted = existing?.status === 'COMPLETED'
    const award = alreadyCompleted ? 0 : xpEarned

    await prisma.progress.upsert({
      where: { userId_questId: { userId: user.id, questId } },
      update: {
        status: 'COMPLETED',
        xpEarned: Math.max(existing?.xpEarned ?? 0, xpEarned),
        // A retake's score replaces the old one; keep the previous score if
        // this submission didn't include one (e.g. a lesson replaying a quiz's row).
        score: score ?? existing?.score ?? null,
        completedAt: new Date(),
        attempts: { increment: 1 },
      },
      create: {
        userId: user.id,
        questId,
        status: 'COMPLETED',
        xpEarned,
        score: score ?? null,
        completedAt: new Date(),
        attempts: 1,
      },
    })

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        currentXP: { increment: award },
        lastActiveAt: new Date(),
      },
    })

    // Mirror the new XP total into the global leaderboard (no-op if Upstash off).
    await updateLeaderboard(user.id, user.username, updatedUser.currentXP)

    log.info('quest progress recorded', { clerkId, questId, awarded: award })
    return NextResponse.json({
      success: true,
      totalXP: updatedUser.currentXP,
      awarded: award,
    })
  } catch (error) {
    log.error('progress update failed', { clerkId, questId }, error)
    return NextResponse.json({ error: 'Failed to record progress' }, { status: 500 })
  }
}
