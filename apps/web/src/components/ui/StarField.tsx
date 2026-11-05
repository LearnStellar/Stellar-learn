'use client'

import { useMemo } from 'react'

interface Star {
  left: number
  top: number
  big: boolean
  color: '' | 'gold' | 'teal'
  dur: number
  del: number
}

interface Drifter {
  left: number
  top: number
  dur: number
  del: number
}

function prng(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => {
    const s1 = prng(i * 12.9898 + 1)
    const s2 = prng(i * 78.233 + 2)
    const s3 = prng(i * 43.123 + 3)
    const s4 = prng(i * 91.567 + 4)
    const s5 = prng(i * 37.891 + 5)
    return {
      left: s1 * 1280,
      top: s2 * 720,
      big: s3 > 0.8,
      color: s4 > 0.82 ? (s5 > 0.5 ? 'gold' : 'teal') : '',
      dur: 1.5 + s3 * 3,
      del: s5 * 3,
    }
  })
}

function generateDrifters(drifters: number): Drifter[] {
  return Array.from({ length: drifters }, (_, i) => {
    const d1 = prng(i * 53.123 + 10)
    const d2 = prng(i * 29.456 + 20)
    const d3 = prng(i * 87.789 + 30)
    const d4 = prng(i * 61.234 + 40)
    return {
      left: d1 * 1280,
      top: 720 + d2 * 200,
      dur: 8 + d3 * 7,
      del: d4 * 8,
    }
  })
}

/**
 * StarField — the shared cosmic backdrop: twinkling pixel stars plus a few
 * gold particles drifting upward. Recreated from the prototype's stars() IIFE.
 * Rendered once on mount; positions are stable across re-renders.
 */
export function StarField({ count = 90, drifters = 14 }: { count?: number; drifters?: number }) {
  const stars = useMemo<Star[]>(() => generateStars(count), [count])
  const drift = useMemo<Drifter[]>(() => generateDrifters(drifters), [drifters])

  const colorHex = (c: Star['color']) =>
    c === 'gold' ? '#ffd700' : c === 'teal' ? '#00bcd4' : '#fff'

  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      {/* nebula glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 30%, rgba(123,94,167,0.12) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(38,166,154,0.08) 0%, transparent 50%)',
        }}
      />

      {/* stars */}
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute block rounded-none"
          style={{
            left: `${s.left}px`,
            top: `${s.top}px`,
            width: s.big ? '3px' : '2px',
            height: s.big ? '3px' : '2px',
            background: colorHex(s.color),
            boxShadow: s.big ? `0 0 6px ${colorHex(s.color)}` : 'none',
            animation: `twinkle ${s.dur}s ease-in-out ${s.del}s infinite`,
          }}
        />
      ))}

      {/* upward drift particles */}
      {drift.map((d, i) => (
        <span
          key={`d-${i}`}
          className="absolute block h-[3px] w-[3px] rounded-none bg-brand-gold"
          style={{
            left: `${d.left}px`,
            top: `${d.top}px`,
            boxShadow: '0 0 4px #ffd700',
            animation: `driftUp ${d.dur}s linear ${d.del}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
