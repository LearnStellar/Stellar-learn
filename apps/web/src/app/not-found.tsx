import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 — Lost in Space | Stellar Learn',
  description: 'This page drifted off into the Stellar void. Head back to the adventure.',
}

/**
 * /404 — on-brand pixel-art Not Found page.
 * Matches the Stellar Learn pixel style, palette (#7b5ea7 / #e8d5b7 / #1a1a2e),
 * and the "Press Start 2P" font. Renders a pixel-art astronaut + rocket to
 * reinforce the "lost in space" theme.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand-dark px-6 py-16">
      {/* Star field background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0d0d2b_100%)]" />
        {/* Decorative twinkling stars */}
        <div className="absolute left-[10%] top-[18%] h-1 w-1 bg-brand-gold/70" />
        <div className="absolute left-[22%] top-[64%] h-1.5 w-1.5 bg-brand-purple-light/70" />
        <div className="absolute left-[38%] top-[12%] h-1 w-1 bg-brand-gold-bright/60" />
        <div className="absolute left-[55%] top-[72%] h-1 w-1 bg-brand-gold/60" />
        <div className="absolute left-[70%] top-[20%] h-1.5 w-1.5 bg-brand-purple-light/50" />
        <div className="absolute left-[82%] top-[58%] h-1 w-1 bg-brand-gold/50" />
        <div className="absolute left-[90%] top-[30%] h-1 w-1 bg-brand-gold-bright/40" />
        <div className="absolute left-[8%] top-[40%] h-1 w-1 bg-brand-gold/40" />
        <div className="absolute left-[64%] top-[40%] h-1 w-1 bg-brand-gold/50" />
      </div>

      {/* Pixel-art astronaut + rocket scene */}
      <div className="relative z-10 mb-8" aria-hidden>
        <pre className="font-pixel text-[10px] leading-tight text-brand-gold sm:text-xs md:text-sm">
{`   ____
  / ___\\
 | (o)  |
 |  \\   |
 |  ___ |
  \\_____/      +----+
               /      \\
        +----/   /\\    \\
       /         \\/     \\
      |   ____   _______ |
      |  /   \\  |       ||
      | |  *  | |   O   ||
      |  \\___/  |  ___  ||
      |          \\___/  ||
       \\________________/
`}
        </pre>
      </div>

      {/* Message */}
      <div className="relative z-10 text-center">
        <p className="mb-3 font-pixel text-[10px] tracking-widest text-brand-purple-light">
          SECTOR NOT FOUND
        </p>
        <h1 className="mb-5 font-pixel text-4xl text-brand-gold-bright sm:text-5xl md:text-6xl">
          404
        </h1>
        <p className="mx-auto mb-8 max-w-md font-sans text-lg text-brand-gold/70">
          This page drifted off into the Stellar void. Nothing was destroyed —
          you just took a wrong turn on the adventure map.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/" className="btn-pixel text-sm">
            ◀ Back to Home
          </Link>
          <Link
            href="/dashboard"
            className="font-pixel text-xs text-brand-gold/70 transition hover:text-brand-gold"
          >
            Continue Journey →
          </Link>
        </div>
      </div>
    </main>
  )
}
