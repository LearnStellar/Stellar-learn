import { Skeleton, SkeletonPanel } from '@/components/ui/Skeleton'

/**
 * Route-level loading UI for the game section.
 *
 * Displayed by Next.js while the parallel /game route segments
 * fetch data, giving users a pixel-styled placeholder instead
 * of a blank flash.
 */
export default function GameLoading() {
  return (
    <main className="relative min-h-screen bg-brand-dark px-4 py-8">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0d0d2b_100%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Header placeholder */}
        <div className="mb-6 flex items-center gap-4">
          <Skeleton circle width="40px" />
          <Skeleton lines={1} width="200px" height="1.5rem" />
        </div>

        {/* Grid of skeleton cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonPanel key={i} />
          ))}
        </div>
      </div>
    </main>
  )
}
