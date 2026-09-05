'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Route-level error boundary.
 *
 * Catches runtime errors in a route segment and renders a friendly,
 * on-brand recovery screen instead of a blank crash.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to console for debugging; a real app might send to Sentry.
    console.error('Route error:', error)
  }, [error])

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand-dark px-6">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0d0d2b_100%)]" />
      </div>

      <div className="relative z-10 text-center">
        {/* Pixel-art "X" decoration */}
        <div className="mb-6 inline-grid grid-cols-5 gap-[2px]">
          {[
            [1,0,0,0,1],
            [0,1,0,1,0],
            [0,0,1,0,0],
            [0,1,0,1,0],
            [1,0,0,0,1],
          ].map((row, ri) => (
            <div key={ri} className="col-span-5 flex gap-[2px]">
              {row.map((cell, ci) => (
                <div
                  key={ci}
                  className="h-3 w-3"
                  style={{
                    background: cell ? '#d23b3b' : 'transparent',
                    boxShadow: cell ? '0 0 6px rgba(210,59,59,0.4)' : 'none',
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        <h1 className="mb-3 font-pixel text-xl text-brand-gold md:text-2xl">
          Something broke
        </h1>
        <p className="mb-2 font-read text-sm text-brand-gold/60">
          A runtime error crashed this page.
        </p>
        {error.digest && (
          <p className="mb-6 font-mono text-xs text-brand-stone">
            Digest: {error.digest}
          </p>
        )}

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-block rounded border-2 border-brand-gold/40 bg-brand-purple/20 px-6 py-3 font-pixel text-xs text-brand-gold transition hover:bg-brand-purple/40"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-block rounded border-2 border-brand-gold/20 px-6 py-3 font-pixel text-xs text-brand-gold/70 transition hover:border-brand-gold/40 hover:text-brand-gold"
          >
            ← Go Home
          </Link>
        </div>
      </div>
    </main>
  )
}
