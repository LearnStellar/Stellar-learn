import Link from 'next/link'
import { worlds, worldQuests } from '@stellar-learn/content'
import { GuestOnly, AuthedOnly } from '@/components/auth/AuthGate'

/**
 * Landing page (issue #75).
 *
 * Guest-first: the primary call to action drops a visitor straight into the
 * first world with no account. Signing up is offered as the way to keep
 * progress across devices, never as a gate in front of the game.
 *
 * World and quest counts are read from the content package rather than
 * hardcoded, so adding curriculum updates this page automatically.
 */

const FIRST_WORLD_SLUG = worlds[0]?.slug ?? 'origin-plains'
const WORLD_COUNT = worlds.length
const QUEST_COUNT = worlds.reduce((sum, world) => sum + worldQuests(world).length, 0)

/** Rounded down to the nearest ten so the copy stays true as quests are added. */
const QUEST_COUNT_LABEL = `${Math.floor(QUEST_COUNT / 10) * 10}+`

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-brand-dark">
      {/* Star field background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0d0d2b_100%)]" />
        <div className="stars absolute inset-0" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-8">
        <span className="font-pixel text-sm text-brand-gold">STELLAR LEARN</span>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/playground"
            className="font-pixel text-xs text-brand-gold/70 transition hover:text-brand-gold"
          >
            Playground
          </Link>
          <GuestOnly>
            <Link
              href="/sign-in"
              className="font-pixel text-xs text-brand-gold/70 transition hover:text-brand-gold"
            >
              Sign In
            </Link>
            <Link href={`/world/${FIRST_WORLD_SLUG}`} className="btn-pixel">
              Play Now
            </Link>
          </GuestOnly>
          <AuthedOnly>
            <Link href="/dashboard" className="btn-pixel">
              Continue Journey
            </Link>
          </AuthedOnly>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto mt-16 max-w-5xl px-6 text-center sm:mt-20 sm:px-8">
        <div className="mb-6 inline-block rounded-full border border-brand-purple/40 bg-brand-purple/10 px-4 py-2">
          <span className="font-pixel text-[10px] text-brand-purple-light">
            No Signup Needed · Open Source · Free Forever
          </span>
        </div>

        <h1 className="mb-6 font-pixel text-2xl leading-tight text-brand-gold sm:text-3xl md:text-4xl">
          Learn Stellar
          <br />
          <span className="text-brand-purple-light">Through Adventure</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl font-sans text-base text-brand-gold/70 sm:text-lg">
          A gamified 2D adventure that takes you from &quot;what is blockchain?&quot; to building
          real applications on the Stellar network. Start playing instantly — no account, no
          install.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <GuestOnly>
            <Link href={`/world/${FIRST_WORLD_SLUG}`} className="btn-pixel text-sm">
              Start Playing Free
            </Link>
          </GuestOnly>
          <AuthedOnly>
            <Link href="/dashboard" className="btn-pixel text-sm">
              Continue Quest
            </Link>
          </AuthedOnly>
          <a
            href="https://github.com/noevidence1017/Stellar-learn"
            target="_blank"
            rel="noopener noreferrer"
            className="font-pixel text-xs text-brand-gold/60 underline underline-offset-4 transition hover:text-brand-gold"
          >
            Star on GitHub
          </a>
        </div>

        <GuestOnly>
          <p className="mt-6 font-sans text-xs text-brand-gold/50">
            Your progress saves on this device. Create a free account any time to keep it
            everywhere.
          </p>
        </GuestOnly>
      </section>

      {/* Worlds Preview */}
      <section className="relative z-10 mx-auto mt-24 max-w-6xl px-6 sm:mt-32 sm:px-8">
        <h2 className="mb-12 text-center font-pixel text-base text-brand-gold sm:text-lg">
          {WORLD_COUNT} Worlds. {QUEST_COUNT_LABEL} Quests. 1 Journey.
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {worlds.map((world, i) => (
            <Link
              key={world.slug}
              href={`/world/${world.slug}`}
              className="group flex flex-col items-center gap-3 rounded-xl border border-brand-purple/20 bg-brand-dark-2 p-4 transition hover:border-brand-purple/60"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-purple/15 font-pixel text-sm text-brand-purple-light">
                {i + 1}
              </div>
              <span className="text-center font-pixel text-[8px] leading-relaxed text-brand-gold/80">
                {world.title}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto mt-24 max-w-5xl px-6 sm:mt-32 sm:px-8">
        <h2 className="mb-12 text-center font-pixel text-base text-brand-gold sm:text-lg">
          How It Works
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-brand-purple/20 bg-brand-dark-2 p-6"
            >
              <h3 className="mb-2 font-pixel text-xs text-brand-gold">{f.title}</h3>
              <p className="font-sans text-sm text-brand-gold/60">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto mt-24 mb-20 max-w-2xl px-6 text-center sm:mt-32 sm:px-8">
        <h2 className="mb-4 font-pixel text-lg text-brand-gold sm:text-xl">Ready, Adventurer?</h2>
        <GuestOnly>
          <p className="mb-8 font-sans text-brand-gold/60">
            Jump straight in — the first world is playable right now, with no account.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href={`/world/${FIRST_WORLD_SLUG}`} className="btn-pixel text-sm">
              Start Playing Free
            </Link>
            <Link
              href="/sign-up"
              className="font-pixel text-xs text-brand-gold/60 underline underline-offset-4 transition hover:text-brand-gold"
            >
              Or create an account
            </Link>
          </div>
        </GuestOnly>
        <AuthedOnly>
          <p className="mb-8 font-sans text-brand-gold/60">
            Pick up where you left off and keep building on Stellar.
          </p>
          <Link href="/dashboard" className="btn-pixel text-sm">
            Continue Your Journey
          </Link>
        </AuthedOnly>
      </section>
    </main>
  )
}

const FEATURES = [
  {
    title: 'Play to Learn',
    description:
      'Navigate a real 2D platformer. Each zone is a new Stellar concept. Defeat bosses by solving coding challenges.',
  },
  {
    title: 'Real Blockchain',
    description:
      'Send XLM, issue assets, and deploy smart contracts on the Stellar testnet — inside the game.',
  },
  {
    title: 'Earn Rewards',
    description:
      'Collect XP, unlock characters, earn achievement badges, and mint NFT certificates on Stellar.',
  },
]
