'use client'

/**
 * Root-level fallback error boundary (Next.js App Router `global-error.tsx`).
 * Unlike `error.tsx`, this one replaces the root layout, so it must render
 * its own `<html>` and `<body>`.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="bg-brand-dark">
        <div className="flex min-h-screen flex-col items-center justify-center bg-brand-dark px-6 text-center">
          <div className="font-pixel text-6xl text-brand-gold-bright" aria-hidden="true">
            !!
          </div>
          <h1 className="mt-6 font-pixel text-xl text-brand-gold">Critical system failure</h1>
          <p className="mt-3 max-w-md font-sans text-sm text-brand-gold/70">
            The whole app hit an unexpected error. Try again to resume your adventure.
          </p>
          <button type="button" onClick={reset} className="pixel-btn mt-8">
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
