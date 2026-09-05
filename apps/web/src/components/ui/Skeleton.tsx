/**
 * Skeleton — pixel-styled loading placeholder.
 *
 * A reusable block that mimics the game's panel aesthetic while content
 * loads, avoiding the blank-flash UX described in #93.
 */

interface SkeletonProps {
  /** Number of placeholder lines (default 1) */
  lines?: number
  /** Show as a rounded avatar/circle placeholder */
  circle?: boolean
  /** Width class or explicit value */
  width?: string
  /** Height class or explicit value */
  height?: string
  className?: string
}

export function Skeleton({
  lines = 1,
  circle = false,
  width = '100%',
  height,
  className = '',
}: SkeletonProps) {
  if (circle) {
    return (
      <div
        className={`animate-pulse rounded-full bg-brand-dark-2 ${className}`}
        style={{ width, height: height || width }}
      />
    )
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded bg-brand-dark-2"
          style={{
            width: typeof width === 'string' && width.endsWith('%') ? width : width,
            height: height || '1rem',
            opacity: 0.6 + (i % 3) * 0.15,
          }}
        />
      ))}
    </div>
  )
}

/** Skeleton panel — a full card-shaped placeholder. */
export function SkeletonPanel({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded border-2 border-brand-panel-line bg-brand-dark-2 p-4 ${className}`}
    >
      <Skeleton circle width="48px" className="mb-3" />
      <Skeleton lines={3} />
    </div>
  )
}
