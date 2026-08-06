import { worlds, worldSlugs } from '@stellar-learn/content'

/**
 * World progression rules, shared by the API routes, the dashboard and the
 * in-game overlays so every surface agrees on what is locked.
 *
 * The rule is deliberately simple and derived, never stored as truth: the
 * first world is always open, and world N is open once world N-1 is cleared.
 * Only the set of *cleared* worlds is persisted, so a curriculum reorder can
 * never leave a player stranded behind a stale lock row.
 */
export type WorldStatus = 'locked' | 'unlocked' | 'completed'

export interface WorldState {
  slug: string
  /** 1-based position in the curriculum order. */
  order: number
  title: string
  status: WorldStatus
  /** Slug of the world this one leads to, or null at the end of the journey. */
  nextSlug: string | null
  /** True once the world has playable quests in `@stellar-learn/content`. */
  hasContent: boolean
}

/** Curriculum world slugs in play order. */
export const WORLD_ORDER: readonly string[] = worldSlugs

/** True when `slug` names a world in the curriculum. */
export function isKnownWorld(slug: string): boolean {
  return WORLD_ORDER.includes(slug)
}

/** The world that follows `slug`, or null if it is the last one. */
export function nextWorldSlug(slug: string): string | null {
  const index = WORLD_ORDER.indexOf(slug)
  if (index === -1 || index + 1 >= WORLD_ORDER.length) return null
  return WORLD_ORDER[index + 1] ?? null
}

/** Human title for a world slug, falling back to a title-cased slug. */
function titleFor(slug: string): string {
  const authored = worlds.find((world) => world.slug === slug)
  if (authored) return authored.title
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Derive the state of every world from the set of worlds the player cleared.
 *
 * `completedSlugs` is order-independent; unlocking always walks the curriculum
 * order, so clearing world 2 without world 1 (a replay, a seeded account) still
 * produces a coherent map.
 */
export function computeWorldStates(completedSlugs: Iterable<string>): WorldState[] {
  const completed = new Set(completedSlugs)

  return WORLD_ORDER.map((slug, index) => {
    const previous = index === 0 ? null : WORLD_ORDER[index - 1]
    const unlocked = index === 0 || (previous !== undefined && previous !== null && completed.has(previous))

    return {
      slug,
      order: index + 1,
      title: titleFor(slug),
      status: completed.has(slug) ? 'completed' : unlocked ? 'unlocked' : 'locked',
      nextSlug: nextWorldSlug(slug),
      hasContent: worlds.some((world) => world.slug === slug),
    }
  })
}

/**
 * Where the player goes after a boss battle.
 *
 * A win routes to the next world that actually has content; the end of the
 * authored curriculum routes back to the dashboard. A loss keeps the player in
 * the world they just lost so they can retry the material.
 */
export function routeAfterBoss(slug: string, won: boolean): string {
  if (!won) return `/world/${slug}/level/1`

  let candidate = nextWorldSlug(slug)
  while (candidate) {
    if (worlds.some((world) => world.slug === candidate)) return `/world/${candidate}/level/1`
    candidate = nextWorldSlug(candidate)
  }
  return '/dashboard'
}
