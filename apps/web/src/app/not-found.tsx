'use client'

import Link from 'next/link'

/**
 * 404 Not Found — pixel-art styled fallback for unknown routes.
 *
 * Matches the Stellar Learn cosmic aesthetic: star-field background,
 * chunky pixel typography, and a gold CTA back to safety.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand-dark px-6">
      {/* Star-field background (static CSS, no JS) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0d0d2b_100%)]" />
        <div className="stars absolute inset-0" />
      </div>

      {/* Pixel-art decorative icon */}
      <div className="relative z-10 mb-8">
        <div className="flex flex-col items-center gap-1">
          {/* Simple pixel-art "?" block built with divs */}
          <div className="grid grid-cols-5 gap-[2px]">
            {[
              [0,1,1,1,0],
              [1,0,0,0,1],
              [0,0,0,1,0],
              [0,0,1,0,0],
              [0,0,1,0,0],
              [0,0,0,0,0],
              [0,0,1,0,0],
            ].map((row, ri) => (
              <div key={ri} className="col-span-5 flex gap-[2px]">
                {row.map((cell, ci) => (
                  <div
                    key={ci}
                    className="h-3 w-3"
                    style={{
                      background: cell ? '#ffd700' : 'transparent',
                      boxShadow: cell ? '0 0 6px rgba(255,215,0,0.4)' : 'none',
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Text content */}
      <div className="relative z-10 text-center">
        <h1 className="mb-4 font-pixel text-3xl text-brand-gold md:text-4xl">
          404
        </h1>
        <p className="mb-2 font-read text-lg text-brand-gold/80">
          Lost in deep space...
        </p>
        <p className="mb-8 font-read text-sm text-brand-gold/50">
          This page has drifted beyond the event horizon.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-block rounded border-2 border-brand-gold/40 bg-brand-purple/20 px-6 py-3 font-pixel text-xs text-brand-gold transition hover:bg-brand-purple/40 hover:text-brand-gold-bright"
          >
            ← Return to Base
          </Link>
          <Link
            href="/dashboard"
            className="inline-block rounded border-2 border-brand-gold/20 px-6 py-3 font-pixel text-xs text-brand-gold/70 transition hover:border-brand-gold/40 hover:text-brand-gold"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
