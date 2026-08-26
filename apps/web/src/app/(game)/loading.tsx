import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Route loading UI for the (game) group — shows a pixel-styled skeleton
 * layout while the game dashboard/world routes stream in their data.
 */
export default function GameLoading() {
  return (
    <div className="min-h-screen bg-brand-dark px-8 py-12">
      <div className="mx-auto max-w-5xl">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <Skeleton className="h-8 w-24" />
        </div>

        {/* Main content grid */}
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>

        {/* Bottom bar */}
        <div className="mt-10 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  )
}