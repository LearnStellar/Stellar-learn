import Image from 'next/image'
import Link from 'next/link'
import { worlds, worldQuests, isWorldPlayable } from '@stellar-learn/content'
import { GuestOnly, AuthedOnly } from '@/components/auth/AuthGate'
import { SiteFooter, REPO_URL } from '@/components/layout/SiteFooter'

/**
 * Landing page (issue #75).
 *
 * Guest-first: the primary call to action drops a visitor straight into the
 * first world with no account. Signing up is offered as the way to keep
 * progress across devices, never as a gate in front of the game.
 *
 * World and quest counts are read from the content package rather than
 * hardcoded, so adding curriculum updates this page automatically. Worlds
 * that are still stubs (see `isWorldPlayable`) are shown as "Coming soon"
 * and are not linked, and only playable worlds count toward the quest total.
 */

const FIRST_WORLD_SLUG = worlds[0]?.slug ?? 'origin-plains'
const LIVE_WORLDS = worlds.filter(isWorldPlayable)
const LIVE_COUNT = LIVE_WORLDS.length
const SOON_COUNT = worlds.length - LIVE_COUNT
const QUEST_COUNT = LIVE_WORLDS.reduce((sum, world) => sum + worldQuests(world).length, 0)

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
      <nav className="relative z-10 flex items-center justify-between gap-4 px-4 py-5 sm:px-8 sm:py-6">
        <span className="whitespace-nowrap font-pixel text-[10px] text-brand-gold sm:text-sm">STELLAR LEARN</span>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/playground"
            className="hidden font-pixel text-xs text-brand-gold/80 transition hover:text-brand-gold sm:inline"
          >
            Playground
          </Link>
          <GuestOnly>
            <Link
              href="/sign-in"
              className="whitespace-nowrap font-pixel text-[10px] text-brand-gold/80 transition hover:text-brand-gold sm:text-xs"
            >
              Sign In
            </Link>
            <Link href={`/world/${FIRST_WORLD_SLUG}`} className="btn-pixel whitespace-nowrap px-3 text-[10px] sm:px-6 sm:text-xs">
              Play Now
            </Link>
          </GuestOnly>
          <AuthedOnly>
            <Link href="/dashboard" className="btn-pixel whitespace-nowrap px-3 text-[10px] sm:px-6 sm:text-xs">
              Continue Journey
            </Link>
          </AuthedOnly>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto mt-16 max-w-5xl px-6 text-center sm:mt-20 sm:px-8">
        <h1 className="mb-6 font-pixel text-2xl leading-tight text-brand-gold sm:text-3xl md:text-4xl">
          Learn Stellar
          <br />
          <span className="text-brand-purple-light">Through Adventure</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl font-sans text-base text-brand-gold/85 sm:text-lg">
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
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="btn-pixel-ghost text-sm">
            Star on GitHub
          </a>
        </div>

        <GuestOnly>
          <p className="mt-6 font-sans text-sm text-brand-gold/75">
            Your progress saves on this device. Create a free account any time to keep it
            everywhere.
          </p>
        </GuestOnly>

        <figure className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-xl border-2 border-brand-purple/40 shadow-[0_0_60px_rgba(123,94,167,0.25)]">
          <Image
            src="/assets/illustrations/hero-gameplay.png"
            alt="Gameplay: a pixel-art hero walking past glowing quest runes in The Origin Plains"
            width={1280}
            height={420}
            priority
            className="h-auto w-full [image-rendering:pixelated]"
          />
          <figcaption className="bg-brand-dark-2 px-4 py-2 text-left font-sans text-xs text-brand-gold/75">
            The Origin Plains — walk up to a rune and press E to open its lesson.
          </figcaption>
        </figure>
      </section>

      {/* Worlds Preview */}
      <section className="relative z-10 mx-auto mt-24 max-w-6xl px-6 sm:mt-32 sm:px-8">
        <h2 className="mb-3 text-center font-pixel text-base leading-relaxed text-brand-gold sm:text-lg">
          {LIVE_COUNT} Worlds Live. {QUEST_COUNT_LABEL} Quests. 1 Journey.
        </h2>
        <p className="mb-12 text-center font-sans text-sm text-brand-gold/75">
          {SOON_COUNT} more worlds are being written — from fees and the DEX to shipping Soroban
          contracts.
        </p>
        <ul className="flex flex-wrap justify-center gap-4">
          {worlds.map((world, i) => {
            const playable = isWorldPlayable(world)
            const body = (
              <>
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-purple/20 font-pixel text-xs text-brand-purple-light">
                    {i + 1}
                  </span>
                  {playable ? (
                    <span className="whitespace-nowrap rounded bg-stellar-green/20 px-2 py-1 font-sans text-[11px] font-semibold text-stellar-green">
                      Play
                    </span>
                  ) : (
                    <span className="whitespace-nowrap rounded bg-brand-panel-2 px-2 py-1 font-sans text-[11px] text-brand-gold/85">
                      Coming soon
                    </span>
                  )}
                </div>
                <span className="font-read text-xl leading-tight text-brand-gold">{world.title}</span>
                <span
                  className={`font-sans text-xs leading-snug text-brand-gold/75 ${playable ? '' : 'hidden sm:block'}`}
                >
                  {world.subtitle}
                </span>
              </>
            )
            const base =
              'flex h-full flex-col gap-2 rounded-xl border bg-brand-dark-2 p-4 text-left transition'
            return (
              <li key={world.slug} className="w-[calc(50%-0.5rem)] sm:w-44">
                {playable ? (
                  <Link
                    href={`/world/${world.slug}`}
                    className={`${base} border-brand-purple/40 hover:-translate-y-0.5 hover:border-brand-purple-light`}
                  >
                    {body}
                  </Link>
                ) : (
                  <div aria-disabled="true" className={`${base} border-brand-panel-line/60 opacity-70`}>
                    {body}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
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
              <h3 className="mb-3 font-pixel text-xs text-brand-gold">{f.title}</h3>
              <p className="font-sans text-sm leading-relaxed text-brand-gold/85">{f.description}</p>
              {f.comingSoon.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Coming soon">
                  {f.comingSoon.map((item) => (
                    <li
                      key={item}
                      className="rounded border border-brand-panel-line bg-brand-panel-2 px-2 py-1 font-sans text-[11px] text-brand-gold/80"
                    >
                      Coming soon: {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto mt-24 mb-20 max-w-2xl px-6 text-center sm:mt-32 sm:px-8">
        <h2 className="mb-4 font-pixel text-lg text-brand-gold sm:text-xl">Ready, Adventurer?</h2>
        <GuestOnly>
          <p className="mb-8 font-sans text-brand-gold/85">
            Jump straight in — the first world is playable right now, with no account.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href={`/world/${FIRST_WORLD_SLUG}`} className="btn-pixel text-sm">
              Start Playing Free
            </Link>
            <Link href="/sign-up" className="btn-pixel-ghost text-sm">
              Create an Account
            </Link>
          </div>
        </GuestOnly>
        <AuthedOnly>
          <p className="mb-8 font-sans text-brand-gold/85">
            Pick up where you left off and keep building on Stellar.
          </p>
          <Link href="/dashboard" className="btn-pixel text-sm">
            Continue Your Journey
          </Link>
        </AuthedOnly>
      </section>

      <SiteFooter />
    </main>
  )
}

/** Only shipped features go in `description`; planned ones go in `comingSoon`. */
const FEATURES: { title: string; description: string; comingSoon: string[] }[] = [
  {
    title: 'Play to Learn',
    description:
      'Explore a 2D pixel-art platformer where every glowing rune is a Stellar lesson. Pass the quizzes to defeat the level boss.',
    comingSoon: ['animated boss battles', 'guided first-time tutorial'],
  },
  {
    title: 'Real Blockchain',
    description:
      'Send XLM, create trustlines, and issue assets on the Stellar testnet in coding challenges, then deploy starter Soroban contracts in the Playground.',
    comingSoon: ['write and deploy your own contracts'],
  },
  {
    title: 'Earn Rewards',
    description:
      'Earn XP and gems as you learn, then spend gems on gear for your character in the Marketplace.',
    comingSoon: ['achievement badges', 'daily streaks', 'NFT certificates'],
  },
]
