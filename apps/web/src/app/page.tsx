import Link from 'next/link'
import { GuestOnly, AuthedOnly } from '@/components/auth/AuthGate'

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-brand-dark">
      {/* Star field background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0d0d2b_100%)]" />
        {/* Stars via CSS - no JS needed for static decoration */}
        <div className="stars absolute inset-0" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <span className="font-pixel text-sm text-brand-gold">STELLAR LEARN</span>
        <div className="flex items-center gap-4">
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
            <Link href="/sign-up" className="btn-pixel">
              Start Adventure
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
      <section className="relative z-10 mx-auto mt-20 max-w-5xl px-8 text-center">
        <div className="mb-6 inline-block rounded-full border border-brand-purple/40 bg-brand-purple/10 px-4 py-2">
          <span className="font-pixel text-[10px] text-brand-purple-light">
            Open Source · Community Driven · Free Forever
          </span>
        </div>

        <h1 className="mb-6 font-pixel text-3xl leading-tight text-brand-gold md:text-4xl">
          Learn Stellar
          <br />
          <span className="text-brand-purple-light">Through Adventure</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl font-sans text-lg text-brand-gold/70">
          A gamified 2D adventure that takes you from &quot;what is blockchain?&quot; to building
          real applications on the Stellar network — no prior experience needed.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <GuestOnly>
            <Link href="/sign-up" className="btn-pixel text-sm">
              ▶ Start Your Quest
            </Link>
          </GuestOnly>
          <AuthedOnly>
            <Link href="/dashboard" className="btn-pixel text-sm">
              ▶ Continue Quest
            </Link>
          </AuthedOnly>
          <a
            href="https://github.com/noevidence1017/Stellar-learn"
            target="_blank"
            rel="noopener noreferrer"
            className="font-pixel text-xs text-brand-gold/60 underline underline-offset-4 transition hover:text-brand-gold"
          >
            ★ Star on GitHub
          </a>
        </div>
      </section>

      {/* Worlds Preview */}
      <section className="relative z-10 mx-auto mt-32 max-w-6xl px-8">
        <h2 className="mb-12 text-center font-pixel text-lg text-brand-gold">
          6 Worlds. 30+ Quests. 1 Journey.
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {WORLDS.map((world, i) => (
            <div
              key={world.slug}
              className="group flex flex-col items-center gap-3 rounded-xl border border-brand-purple/20 bg-brand-dark-2 p-4 transition hover:border-brand-purple/60"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
                style={{ background: world.color + '22' }}
              >
                {world.emoji}
              </div>
              <span className="text-center font-pixel text-[8px] leading-relaxed text-brand-gold/80">
                {i + 1}. {world.title}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto mt-32 max-w-5xl px-8">
        <h2 className="mb-12 text-center font-pixel text-lg text-brand-gold">How It Works</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-brand-purple/20 bg-brand-dark-2 p-6"
            >
              <div className="mb-4 text-3xl">{f.emoji}</div>
              <h3 className="mb-2 font-pixel text-xs text-brand-gold">{f.title}</h3>
              <p className="font-sans text-sm text-brand-gold/60">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto mt-32 mb-20 max-w-2xl px-8 text-center">
        <h2 className="mb-4 font-pixel text-xl text-brand-gold">Ready, Adventurer?</h2>
        <p className="mb-8 font-sans text-brand-gold/60">
          Join thousands of builders learning Stellar through the most unique educational experience
          in blockchain.
        </p>
        <GuestOnly>
          <Link href="/sign-up" className="btn-pixel text-sm">
            ▶ Begin Your Journey — It&apos;s Free
          </Link>
        </GuestOnly>
        <AuthedOnly>
          <Link href="/dashboard" className="btn-pixel text-sm">
            ▶ Continue Your Journey
          </Link>
        </AuthedOnly>
      </section>
    </main>
  )
}

const WORLDS = [
  { slug: 'origin-plains',   title: 'Origin Plains',   emoji: '🌲', color: '#2d5a1b' },
  { slug: 'wallet-kingdom',  title: 'Wallet Kingdom',  emoji: '🏰', color: '#7b5ea7' },
  { slug: 'asset-forge',     title: 'Asset Forge',     emoji: '⚒️', color: '#8b4513' },
  { slug: 'trading-bazaar',  title: 'Trading Bazaar',  emoji: '⛰️', color: '#4a7c9e' },
  { slug: 'payment-realm',   title: 'Payment Realm',   emoji: '💫', color: '#1a6b6b' },
  { slug: 'soroban-citadel', title: 'Soroban Citadel', emoji: '🏯', color: '#8b0000' },
]

const FEATURES = [
  {
    emoji: '🎮',
    title: 'Play to Learn',
    description:
      'Navigate a real 2D platformer. Each zone is a new Stellar concept. Defeat bosses by solving coding challenges.',
  },
  {
    emoji: '⛓️',
    title: 'Real Blockchain',
    description:
      'Send XLM, issue assets, and deploy smart contracts on the Stellar testnet — inside the game.',
  },
  {
    emoji: '🏆',
    title: 'Earn Rewards',
    description:
      'Collect XP, unlock characters, earn achievement badges, and mint NFT certificates on Stellar.',
  },
]
