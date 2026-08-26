'use client'

import { PixelButton } from '@/components/ui/PixelButton'

/**
 * Route-level error boundary (Next.js App Router `error.tsx`).
 * Renders a friendly, on-brand recovery screen when a route throws,
 * instead of a blank crash. The "Try again" action calls `reset()`.
 */
export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-dark px-6 text-center">
      <div className="font-pixel text-6xl text-brand-gold-bright" aria-hidden="true">
        !!
      </div>
      <h1 className="mt-6 font-pixel text-xl text-brand-gold">A cosmic glitch!</h1>
      <p className="mt-3 max-w-md font-sans text-sm text-brand-gold/70">
        Something went wrong while loading this page. Hit retry to jump back in.
      </p>
      <PixelButton className="mt-8" onClick={reset}>
        Try again
      </PixelButton>
    </div>
  )
}
