/**
 * PixelPanel — chunky 9-slice-style framed panel with optional ornate gold
 * corner studs and a constellation header strip. Mirrors `.panel` / `.strip`
 * from the design system.
 */

interface PixelPanelProps {
  variant?: 'gold' | 'purple' | 'soft'
  ornate?: boolean
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

const VARIANT_CLASS = {
  gold: '',
  purple: 'pixel-panel--purple',
  soft: 'pixel-panel--soft',
} as const

export function PixelPanel({
  variant = 'gold',
  ornate = false,
  className = '',
  style,
  children,
}: PixelPanelProps) {
  return (
    <div
      className={[
        'pixel-panel',
        VARIANT_CLASS[variant],
        ornate ? 'pixel-panel--ornate' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {ornate && (
        <>
          <span className="pixel-corner tr" />
          <span className="pixel-corner bl" />
        </>
      )}
      {children}
    </div>
  )
}

/** Purple header strip with the constellation dot pattern. */
export function PixelStrip({
  className = '',
  style,
  children,
}: {
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div className={`pixel-strip ${className}`} style={style}>
      <span className="pixel-constellation" />
      {children}
    </div>
  )
}
