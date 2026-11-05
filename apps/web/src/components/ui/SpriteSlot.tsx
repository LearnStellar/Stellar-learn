/**
 * SpriteSlot — handoff-ready placeholder for a pixel-art sprite.
 * Drop a real PNG into the same box later; the tint + label keep layouts
 * reading true until then. Mirrors the `.slot` element from the design.
 */
interface SpriteSlotProps {
  /** primary label, e.g. "PLAYER" or "THE VALIDATOR" */
  label?: string
  /** secondary dim line, e.g. "char-validator_idle · 128²" */
  dim?: string
  /** color-coded inner glow (the character / world colour) */
  tint?: string
  /** big emoji silhouette shown when there is no label */
  silhouette?: string
  className?: string
  style?: React.CSSProperties
}

export function SpriteSlot({
  label,
  dim,
  tint,
  silhouette,
  className = '',
  style,
}: SpriteSlotProps) {
  return (
    <div
      className={`pixel-slot ${className}`}
      {...(tint ? { 'data-tint': '' } : {})}
      style={{ ...(tint ? { ['--tint' as string]: tint } : {}), ...style }}
    >
      {silhouette && <span className="silho">{silhouette}</span>}
      {label && (
        <div className="tag">
          {label}
          {dim && <div className="dim">{dim}</div>}
        </div>
      )}
    </div>
  )
}
