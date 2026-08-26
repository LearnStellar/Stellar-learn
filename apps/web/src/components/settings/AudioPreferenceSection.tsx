'use client'

import { useEffect, useState } from 'react'
import { PixelPanel } from '@/components/ui/PixelPanel'
import { readMuted, writeMuted } from './audio-preference'

/**
 * Audio/mute preference toggle. Reads/writes localStorage so the choice
 * persists across reloads.
 */
export function AudioPreferenceSection() {
  const [muted, setMuted] = useState<boolean>(false)

  // Hydrate after mount to avoid SSR/localStorage mismatches.
  useEffect(() => {
    setMuted(readMuted())
  }, [])

  const toggle = () => {
    const next = !muted
    setMuted(next)
    writeMuted(next)
  }

  return (
    <PixelPanel variant="soft">
      <h2 className="font-pixel text-sm text-brand-gold">AUDIO</h2>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-sans text-sm text-brand-gold/90">Sound effects &amp; music</p>
          <p className="mt-1 font-sans text-xs text-brand-gold/60">
            {muted ? 'Currently muted' : 'Currently on'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!muted}
          onClick={toggle}
          className={[
            'pixel-btn px-4 py-2 text-[11px]',
            muted ? 'pixel-btn--ghost' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {muted ? 'UNMUTE' : 'MUTE'}
        </button>
      </div>
    </PixelPanel>
  )
}