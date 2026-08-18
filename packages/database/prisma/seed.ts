/**
 * Database seed — populates `worlds` and `quests` from the curriculum that
 * lives in `@stellar-learn/content` (the source of truth for all lessons).
 *
 * Idempotent: uses upserts keyed on the content IDs, so it's safe to re-run
 * whenever the curriculum changes. Run with `npm run db:seed`.
 */
import { PrismaClient, QuestType, Prisma } from '@prisma/client'
import { worlds, worldQuests } from '@stellar-learn/content'

const prisma = new PrismaClient()

/** Map the content package's lowercase quest types to the Prisma enum. */
const QUEST_TYPE: Record<string, QuestType> = {
  lesson: QuestType.LESSON,
  quiz: QuestType.QUIZ,
  challenge: QuestType.CHALLENGE,
  boss: QuestType.BOSS,
}

async function main() {
  console.log(`Seeding ${worlds.length} world(s) from @stellar-learn/content…`)

  for (const world of worlds) {
    const worldData = {
      slug: world.slug,
      title: world.title,
      description: world.description,
      theme: world.theme,
      order: world.order,
      // Only the first world starts unlocked; the rest gate on progression.
      isLocked: world.order !== 1,
      xpReward: world.xpReward,
    }

    await prisma.world.upsert({
      where: { id: world.id },
      update: worldData,
      create: { id: world.id, ...worldData },
    })

    for (const quest of worldQuests(world)) {
      const type = QUEST_TYPE[quest.type]
      if (!type) {
        throw new Error(`Unknown quest type "${quest.type}" on quest "${quest.slug}"`)
      }

      const questData = {
        worldId: world.id,
        slug: quest.slug,
        title: quest.title,
        description: quest.description,
        type,
        order: quest.order,
        xpReward: quest.xpReward,
        // Lesson blocks / quiz questions / challenge spec — stored as JSON.
        content: quest.content as unknown as Prisma.InputJsonValue,
      }

      await prisma.quest.upsert({
        where: { id: quest.id },
        update: questData,
        create: { id: quest.id, ...questData },
      })
    }

    console.log(`  ✓ ${world.title} — ${worldQuests(world).length} quest(s)`)
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
