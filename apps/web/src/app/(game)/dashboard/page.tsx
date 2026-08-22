import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { worlds } from '@stellar-learn/content'
import { prisma } from '@stellar-learn/database'
import { clerkEnabled } from '@/lib/auth'
import { characterDisplayName, characterPortraitPath } from '@/lib/characters'
import { GuestProgressMigrator } from '@/components/game/GuestProgressMigrator'

// Flat XP required to advance one player level; the progress bar fills toward
// this threshold (level = floor(xp / XP_PER_LEVEL) + 1).
const XP_PER_LEVEL = 500

export default async function DashboardPage() {
  // Without Clerk configured there is no auth session; send visitors straight
  // into the playable game (via /game) instead of crashing on currentUser().
  if (!clerkEnabled) redirect('/game')

  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })

  // XP / level progress derived from the stored total. The `level` column is
  // not kept in sync elsewhere yet, so compute it here from currentXP rather
  // than reading a value that never advances.
  const xp = dbUser?.currentXP ?? 0
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpIntoLevel = xp % XP_PER_LEVEL
  const xpPct = Math.min(100, Math.round((xpIntoLevel / XP_PER_LEVEL) * 100))

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
            <div className="font-pixel text-2xl text-brand-gold-bright">{xp} XP</div>
            <div className="font-pixel text-[10px] text-brand-gold/50">Level {level}</div>
          </div>
        </div>

        {/* Guest progress migration — runs once after signup */}
        <GuestProgressMigrator />

        {/* XP Bar */}
        <div className="mb-10">
          <div className="mb-2 flex justify-between font-pixel text-[10px] text-brand-gold/50">
            <span>Progress to Level {level + 1}</span>
            <span>{xpIntoLevel} / {XP_PER_LEVEL} XP</span>
          </div>
          <div className="xp-bar">
            <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
          </div>
        </div>

        {/* Worlds grid */}
        <h2 className="mb-6 font-pixel text-sm text-brand-gold">Your Worlds</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {WORLD_CARDS.map((world, i) => (
            <div
              key={world.slug}
              className={`rounded-xl border p-6 transition ${
                i === 0
                  ? 'border-brand-purple bg-brand-dark-2 hover:border-brand-purple-light'
                  : 'border-brand-dark-4 bg-brand-dark-2/50 opacity-50'
              }`}
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="text-3xl">{world.emoji}</span>
                <div>
                  <div className="font-pixel text-[10px] text-brand-gold/50">World {i + 1}</div>
                  <div className="font-pixel text-xs text-brand-gold">{world.title}</div>
                </div>
                {i > 0 && (
                  <span className="ml-auto font-pixel text-[8px] text-brand-gold/30">🔒 LOCKED</span>
                )}
              </div>

              <p className="mb-4 font-sans text-xs text-brand-gold/60">{world.description}</p>

              {i === 0 ? (
                <Link
                  href={`/world/${world.slug}`}
                  className="btn-pixel w-full text-center text-[10px]"
                >
                  ▶ Enter World
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full cursor-not-allowed rounded border border-brand-dark-4 py-2 font-pixel text-[10px] text-brand-gold/30"
                >
                  Complete previous world to unlock
                </button>
              )}
            </div>
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
