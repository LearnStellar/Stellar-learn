import { notFound, redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { worlds } from '@stellar-learn/content'
import { prisma } from '@stellar-learn/database'
import { clerkEnabled } from '@/lib/auth'
import { LevelMap } from '@/components/game/LevelMap'

interface PageProps {
  params: { worldId: string }
}

/**
 * In-world level map (Issue #78). Entering a world lands here: a data-driven
 * constellation of its levels with locked / available / completed states. The
 * map renders from `@stellar-learn/content`, so adding a level is a content
 * change only.
 *
 * Auth gate mirrors the dashboard: with Clerk configured, a signed-out visitor
 * is redirected to sign-in. Without Clerk the map still renders for local /
 * preview use (and no progress is loaded).
 */
export default async function WorldMapPage({ params }: PageProps) {
  const world = worlds.find((w) => w.slug === params.worldId)
  if (!world) notFound()

  if (!clerkEnabled) {
    return <LevelMap world={world} completedQuestIds={[]} />
  }

  const user = await currentUser()
  if (!user) redirect('/sign-in')

  let completedQuestIds: string[] = []
  try {
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      include: { progress: true },
    })
    completedQuestIds = (dbUser?.progress ?? [])
      .filter((p) => p.status === 'COMPLETED')
      .map((p) => p.questId)
  } catch {
    // DB unavailable — render without progress.
    completedQuestIds = []
  }

  return <LevelMap world={world} completedQuestIds={completedQuestIds} />
}
