import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  getWorldProgressSummary,
  isWorldCompleted,
  isWorldPlayable,
  isWorldUnlocked,
  worlds,
} from '@stellar-learn/content'
import { prisma } from '@stellar-learn/database'
import { clerkEnabled } from '@/lib/auth'
import { characterDisplayName } from '@/lib/characters'
import { CharacterPortrait } from '@/components/game/CharacterPortrait'
import { GuestProgressSync } from '@/components/game/GuestProgressSync'
import { toEquippedItemMap } from '@/lib/equippedItems'

// Flat XP required to advance one player level; the progress bar fills toward
// this threshold (level = floor(xp / XP_PER_LEVEL) + 1).
const XP_PER_LEVEL = 500

export default async function DashboardPage() {
  // Without Clerk configured there is no auth session; send visitors straight
  // into the playable game (via /game) instead of crashing on currentUser().
  if (!clerkEnabled) redirect('/game')

  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    include: { progress: true },
  })

  const completedQuestIds = (dbUser?.progress ?? [])
    .filter((p) => p.status === 'COMPLETED')
    .map((p) => p.questId)

  // XP / level progress derived from the stored total. The `level` column is
  // not kept in sync elsewhere yet, so compute it here from currentXP rather
  // than reading a value that never advances.
  const xp = dbUser?.currentXP ?? 0
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpIntoLevel = xp % XP_PER_LEVEL
  const xpPct = Math.min(100, Math.round((xpIntoLevel / XP_PER_LEVEL) * 100))

  return (
    <div className="min-h-screen bg-brand-dark px-8 py-12">
      {/* Moves any progress earned before signup onto this account (issue #75). */}
      <GuestProgressSync />
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {dbUser && (
              <CharacterPortrait
                characterId={dbUser.characterId}
                equippedItems={toEquippedItemMap(dbUser.equippedItems)}
                size={56}
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
              <Link
                href="/avatar"
                className="mt-2 inline-block font-pixel text-[9px] text-brand-purple-light hover:text-brand-gold"
              >
                Change Avatar »
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-pixel text-2xl text-brand-gold-bright">{xp} XP</div>
              <div className="font-pixel text-[10px] text-brand-gold/50">Level {level}</div>
            </div>
            <Link
              href="/marketplace"
              className="flex flex-col items-center gap-1 rounded-lg border border-brand-dark-4 bg-brand-dark-2 px-4 py-2 transition hover:border-brand-purple-light"
            >
              <span className="text-xl">🛒</span>
              <span className="font-pixel text-[8px] text-brand-gold/70">MARKET</span>
            </Link>
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
            <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
          </div>
        </div>

        {/* Worlds grid */}
        <h2 className="mb-6 font-pixel text-sm text-brand-gold">Your Worlds</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {worlds.map((world, i) => {
            const playable = isWorldPlayable(world)
            const unlocked = isWorldUnlocked(world, completedQuestIds)
            const completed = isWorldCompleted(world, completedQuestIds)
            const summary = getWorldProgressSummary(world, completedQuestIds)
            const emoji = WORLD_EMOJIS[world.slug] ?? '🗺️'

            return (
              <div
                key={world.slug}
                className={`flex flex-col justify-between rounded-xl border p-6 transition ${
                  unlocked
                    ? 'border-brand-purple bg-brand-dark-2 hover:border-brand-purple-light'
                    : 'border-brand-dark-4 bg-brand-dark-2/50 opacity-60'
                }`}
              >
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-3xl">{emoji}</span>
                    <div>
                      <div className="font-pixel text-[10px] text-brand-gold/50">World {i + 1}</div>
                      <div className="font-pixel text-xs text-brand-gold">{world.title}</div>
                    </div>
                    {completed ? (
                      <span className="ml-auto font-pixel text-[8px] text-stellar-green">
                        👑 CLEARED
                      </span>
                    ) : !unlocked ? (
                      <span className="ml-auto font-pixel text-[8px] text-brand-gold/30">
                        🔒 LOCKED
                      </span>
                    ) : (
                      <span className="ml-auto font-pixel text-[8px] text-stellar-teal">
                        {summary.percentComplete}%
                      </span>
                    )}
                  </div>

                  <p className="mb-4 font-sans text-xs text-brand-gold/60">{world.description}</p>
                </div>

                <div>
                  {unlocked ? (
                    <Link
                      href={`/world/${world.slug}`}
                      className="btn-pixel block w-full text-center text-[10px]"
                    >
                      {completed
                        ? '▶ Replay World'
                        : summary.completedQuests > 0
                          ? `▶ Continue (${summary.completedQuests}/${summary.totalQuests})`
                          : '▶ Enter World'}
                    </Link>
                  ) : playable ? (
                    <button
                      disabled
                      className="w-full cursor-not-allowed rounded border border-brand-dark-4 py-2 font-pixel text-[9px] text-brand-gold/40"
                    >
                      Complete World {i} to unlock
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full cursor-not-allowed rounded border border-brand-dark-4 py-2 font-pixel text-[9px] text-brand-gold/30"
                    >
                      Coming soon
                    </button>
                  )}
                </div>
              </div>
            )
          })}
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

const WORLD_EMOJIS: Record<string, string> = {
  'origin-plains': '🌲',
  'wallet-kingdom': '🏰',
  'asset-forge': '⚒️',
  'reserve-reach': '🏛️',
  'anchor-anchorage': '⚓',
  'trading-bazaar': '⛰️',
  'liquidity-lagoon': '🌊',
  'payment-realm': '💫',
  'guardian-keep': '🛡️',
  'soroban-gateway': '🏯',
  'contract-forge': '🔥',
  'storage-sanctum': '📜',
  'deployment-depths': '🚀',
}
