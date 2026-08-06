import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@stellar-learn/database'
import { clerkEnabled } from '@/lib/auth'
import { characterDisplayName, characterPortraitPath } from '@/lib/characters'
import { computeWorldStates, type WorldState } from '@/lib/progression'

/** XP needed to move up a level, mirroring the XP bar copy. */
const XP_PER_LEVEL = 500

export default async function DashboardPage() {
  // Without Clerk configured there is no auth session; send visitors straight
  // into the playable game (via /game) instead of crashing on currentUser().
  if (!clerkEnabled) redirect('/game')

  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })

  // Worlds the player has cleared drive the unlock chain (Issue #5). A player
  // with no rows yet simply starts with World 1 open.
  const cleared = dbUser
    ? await prisma.worldProgress.findMany({
        where: { userId: dbUser.id, status: 'COMPLETED' },
        select: { worldSlug: true },
      })
    : []
  const worldStates = computeWorldStates(cleared.map((row) => row.worldSlug))

  const currentXP = dbUser?.currentXP ?? 0
  const level = dbUser?.level ?? 1
  const xpIntoLevel = currentXP % XP_PER_LEVEL

  return (
    <div className="min-h-screen bg-brand-dark px-8 py-12">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {dbUser && (
              <Image
                src={characterPortraitPath(dbUser.characterId)}
                alt={characterDisplayName(dbUser.characterId)}
                width={56}
                height={56}
                className="rounded-lg border border-brand-dark-4"
                style={{ imageRendering: 'pixelated' }}
              />
            )}
            <div>
              <h1 className="font-pixel text-xl text-brand-gold">
                Welcome back, {user.firstName ?? 'Adventurer'}!
              </h1>
              <p className="mt-2 font-sans text-sm text-brand-gold/60">
                {dbUser
                  ? `Playing as ${characterDisplayName(dbUser.characterId)} — continue your Stellar journey`
                  : 'Continue your Stellar journey'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="font-pixel text-2xl text-brand-gold-bright">{currentXP} XP</div>
            <div className="font-pixel text-[10px] text-brand-gold/50">Level {level}</div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mb-10">
          <div className="mb-2 flex justify-between font-pixel text-[10px] text-brand-gold/50">
            <span>Progress to Level {level + 1}</span>
            <span>
              {xpIntoLevel} / {XP_PER_LEVEL} XP
            </span>
          </div>
          <div className="xp-bar">
            <div
              className="xp-bar-fill"
              style={{ width: `${(xpIntoLevel / XP_PER_LEVEL) * 100}%` }}
            />
          </div>
        </div>

        {/* Worlds grid — locked / unlocked / completed straight from progress */}
        <h2 className="mb-6 font-pixel text-sm text-brand-gold">Your Worlds</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {worldStates.map((state) => (
            <WorldCard
              key={state.slug}
              state={state}
              card={WORLD_CARDS.find((card) => card.slug === state.slug)}
            />
          ))}
        </div>

        {/* Recent achievements placeholder */}
        <div className="mt-12">
          <h2 className="mb-6 font-pixel text-sm text-brand-gold">Achievements</h2>
          <div className="rounded-xl border border-brand-dark-4 bg-brand-dark-2/50 p-8 text-center">
            <p className="font-pixel text-[10px] text-brand-gold/40">
              Complete your first quest to earn achievements!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * One world tile. Locked worlds are dimmed and unplayable, completed worlds are
 * marked and replayable, and a world with no authored quests yet says so rather
 * than sending the player into an empty level.
 */
function WorldCard({
  state,
  card,
}: {
  state: WorldState
  card: (typeof WORLD_CARDS)[number] | undefined
}) {
  const locked = state.status === 'locked'
  const completed = state.status === 'completed'
  const playable = !locked && state.hasContent

  return (
    <div
      className={`rounded-xl border p-6 transition ${
        locked
          ? 'border-brand-dark-4 bg-brand-dark-2/50 opacity-50'
          : completed
            ? 'border-brand-gold/50 bg-brand-dark-2'
            : 'border-brand-purple bg-brand-dark-2 hover:border-brand-purple-light'
      }`}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="text-3xl">{card?.emoji ?? '✦'}</span>
        <div>
          <div className="font-pixel text-[10px] text-brand-gold/50">World {state.order}</div>
          <div className="font-pixel text-xs text-brand-gold">{card?.title ?? state.title}</div>
        </div>
        <span className="ml-auto font-pixel text-[8px] text-brand-gold/40">
          {locked ? '🔒 LOCKED' : completed ? '✅ CLEARED' : ''}
        </span>
      </div>

      <p className="mb-4 font-sans text-xs text-brand-gold/60">
        {card?.description ?? 'Curriculum for this world is open for contribution.'}
      </p>

      {playable ? (
        <Link href={`/world/${state.slug}/level/1`} className="btn-pixel block w-full text-center text-[10px]">
          {completed ? '↺ Replay World' : '▶ Enter World'}
        </Link>
      ) : (
        <button
          disabled
          className="w-full cursor-not-allowed rounded border border-brand-dark-4 py-2 font-pixel text-[10px] text-brand-gold/30"
        >
          {locked ? 'Complete previous world to unlock' : 'Curriculum coming soon'}
        </button>
      )}
    </div>
  )
}

const WORLD_CARDS = [
  {
    slug: 'origin-plains',
    title: 'Origin Plains',
    emoji: '🌲',
    description: 'Learn blockchain fundamentals, what Stellar is, and how XLM works.',
  },
  {
    slug: 'wallet-kingdom',
    title: 'Wallet Kingdom',
    emoji: '🏰',
    description: 'Create Stellar accounts, understand keypairs, and manage balances.',
  },
  {
    slug: 'asset-forge',
    title: 'Asset Forge',
    emoji: '⚒️',
    description: 'Issue custom tokens, create trustlines, and manage digital assets.',
  },
  {
    slug: 'trading-bazaar',
    title: 'Trading Bazaar',
    emoji: '⛰️',
    description: 'Trade on the SDEX, provide liquidity, and execute path payments.',
  },
  {
    slug: 'payment-realm',
    title: 'Payment Realm',
    emoji: '💫',
    description: 'Send cross-border payments and integrate with Anchor protocols.',
  },
  {
    slug: 'soroban-citadel',
    title: 'Soroban Citadel',
    emoji: '🏯',
    description: 'Write, deploy, and interact with smart contracts using Soroban.',
  },
]
