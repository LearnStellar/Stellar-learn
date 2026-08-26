interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * Skeleton — a reusable pixel-styled placeholder block with a subtle pulse,
 * used to avoid a blank flash while a route or async data is loading.
 *
 * Usage:
 *   <Skeleton className="h-10 w-64" />
 *   <Skeleton className="h-40 rounded-lg" />
 */
export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-[4px] border border-brand-dark-4 bg-brand-dark-3 ${className}`}
      style={style}
    />
  )
}