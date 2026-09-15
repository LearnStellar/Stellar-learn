import { notFound } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { worlds } from '@stellar-learn/content'
import { prisma } from '@stellar-learn/database'
import { clerkEnabled } from '@/lib/auth'
import { LevelMap } from '@/components/game/LevelMap'

interface PageProps {
  params: { worldId: string }
}

/**
 * In-world level map (Issue #78). Guest-playable: the map renders for everyone.
 * A signed-in user's completed quests (only when Clerk is configured and a
 * session exists) drive the locked / available / completed states; signed-out
 * visitors get the default state (level 1 available, the rest locked). The
 * decision to gate or prompt for auth lives with the guest-play issue, not here.
 */
export default async function WorldMapPage({ params }: PageProps) {
  const world = worlds.find((w) => w.slug === params.worldId)
  if (!world) notFound()

  let completedQuestIds: string[] = []
  if (clerkEnabled) {
    try {
      const user = await currentUser()
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { clerkId: user.id },
          include: { progress: true },
        })
        completedQuestIds = (dbUser?.progress ?? [])
          .filter((p) => p.status === 'COMPLETED')
          .map((p) => p.questId)
      }
    } catch {
      // Not signed in or DB unavailable — render without progress.
      completedQuestIds = []
    }
  }

  return <LevelMap world={world} completedQuestIds={completedQuestIds} />
}
