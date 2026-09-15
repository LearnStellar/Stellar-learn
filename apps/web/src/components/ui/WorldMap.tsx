'use client'

import { useState } from 'react'
import Link from 'next/link'
import { WORLDS, type PixelWorld } from './pixel-data'
import { PixelButton } from './PixelButton'
import { PixelPanel, PixelStrip } from './PixelPanel'

interface WorldMapProps {
  onBack?: () => void
  onEnterWorld?: (worldIndex: number) => void
}

/**
 * WorldMap — the constellation map: 6 world nodes linked by glowing dotted
 * paths, each with completed / current-pulsing / locked states.
 *
 * Responsive: desktop shows the spatial constellation + a side info panel;
 * on phones/tablets the constellation collapses into a vertical list of
 * self-contained world cards (nodes would otherwise overlap when scaled down).
 */
export function WorldMap({ onBack, onEnterWorld }: WorldMapProps) {
  const [selected, setSelected] = useState(1)
  const w = WORLDS[selected]
  if (!w) return null

  return (
    <section className="absolute inset-0 flex flex-col overflow-y-auto">
      <div className="relative z-[2] shrink-0 px-4 pb-4 pt-6 sm:px-8 lg:px-14 lg:pb-[18px] lg:pt-12">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <span className="font-pixel text-[8px] tracking-[3px] text-stellar-teal sm:text-[9px]">
              YOUR JOURNEY
            </span>
            <span
              className="disp-head font-pixel text-brand-gold-bright"
              style={{ textShadow: '3px 3px 0 #07071a, 0 0 16px rgba(255,215,0,.3)' }}
            >
              THE CONSTELLATION MAP
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/marketplace" className="pixel-btn pixel-btn--ghost pixel-btn--sm" aria-label="Marketplace">
              🛒 SHOP
            </Link>
            <PixelButton variant="ghost" sm onClick={onBack}>
              ‹ MENU
            </PixelButton>
          </div>
        </div>
      </div>

      {/* ---- desktop: spatial constellation + side info panel ---- */}
      <div className="relative z-[2] hidden min-h-[460px] flex-1 lg:block">
        <svg
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
          viewBox="0 0 1280 560"
          preserveAspectRatio="none"
        >
          {WORLDS.slice(0, -1).map((a, i) => {
            const b = WORLDS[i + 1]
            if (!b) return null
            const done = a.state === 'done'
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={done ? '#ffd700' : '#3a3a5e'}
                strokeWidth={4}
                strokeDasharray="3 12"
                strokeLinecap="round"
                opacity={done ? 0.9 : 0.6}
              />
            )
          })}
        </svg>

        {WORLDS.map((world, i) => (
          <WorldNode
            key={world.n}
            world={world}
            selected={i === selected}
            onClick={() => setSelected(i)}
          />
        ))}

        {/* info panel */}
        <PixelPanel
          ornate
          className="absolute right-[34px] top-1/2 z-[5] w-[340px] -translate-y-1/2 p-0"
        >
          <PixelStrip className="text-[13px]">
            WORLD {w.n} · {w.name}
          </PixelStrip>
          <WorldInfo world={w} onEnter={() => onEnterWorld?.(selected)} />
        </PixelPanel>
      </div>

      {/* ---- mobile / tablet: vertical world list ---- */}
      <div className="relative z-[2] flex flex-col gap-4 px-4 pb-8 sm:px-8 lg:hidden">
        {WORLDS.map((world, i) => (
          <PixelPanel key={world.n} ornate className="p-0">
            <PixelStrip className="text-[11px] sm:text-[13px]">
              <span className="flex items-center gap-3">
                <WorldOrb world={world} size={40} />
                WORLD {world.n} · {world.name}
              </span>
            </PixelStrip>
            <WorldInfo world={world} onEnter={() => onEnterWorld?.(i)} />
          </PixelPanel>
        ))}
      </div>
    </section>
  )
}

/** Shared info body — meta rows, progress, boss tag and the enter/locked CTA. */
function WorldInfo({ world, onEnter }: { world: PixelWorld; onEnter: () => void }) {
  const cleared = world.state === 'done'
  const open = world.state !== 'locked'
  return (
    <div className="flex flex-col gap-3 p-[18px]">
      <MetaRow label="THEME" value={world.theme} />
      <MetaRow label="YOU LEARN" value={world.topic} />
      <MetaRow label="QUESTS" value={world.quests} />
      <div className="pixel-progress">
        <div className="pf" style={{ width: `${world.prog}%` }} />
      </div>
      <div
        className="flex items-center gap-2 px-[10px] py-2 font-pixel text-[8px] leading-[1.6] sm:text-[9px]"
        style={{
          color: '#ff8a98',
          background: '#141436',
          border: '2px solid #07071a',
          boxShadow: '0 0 0 2px #5a1622',
        }}
      >
        ☠ BOSS · {world.boss.toUpperCase()}
      </div>
      {open ? (
        <PixelButton variant="gold" sm block onClick={onEnter}>
          {cleared ? 'REPLAY WORLD ▶' : 'ENTER WORLD ▶'}
        </PixelButton>
      ) : (
        <PixelButton sm block disabled>
          🔒 CLEAR WORLD {world.n - 1} FIRST
        </PixelButton>
      )}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 font-pixel text-[8px] leading-[1.6] text-brand-gold sm:text-[9px]">
      <span>{label}</span>
      <span className="max-w-[60%] text-right text-stellar-teal">{value}</span>
    </div>
  )
}

/** The coloured orb for a world, in its current state. */
function WorldOrb({ world, size }: { world: PixelWorld; size: number }) {
  let style: React.CSSProperties
  let cls = ''
  if (world.state === 'locked') {
    style = { background: '#2a2a3e', color: '#6a6a86', boxShadow: '0 0 0 3px #6b7280, 0 5px 0 #07071a' }
  } else if (world.state === 'unlocked') {
    cls = 'animate-nodepulse'
    style = {
      background: '#7b5ea7',
      color: '#fff',
      boxShadow: '0 0 0 3px #9b7ec7, 0 0 22px rgba(155,126,199,.7), 0 5px 0 #07071a',
    }
  } else {
    style = {
      background: '#ffd700',
      color: '#07071a',
      boxShadow: '0 0 0 3px #fff3b0, 0 0 18px rgba(255,215,0,.5), 0 5px 0 #07071a',
    }
  }
  return (
    <span
      className={`flex flex-none items-center justify-center ${cls}`}
      style={{ width: size, height: size, fontSize: size * 0.42, border: '4px solid #07071a', ...style }}
    >
      {world.state === 'locked' ? '🔒' : world.emoji}
    </span>
  )
}

function WorldNode({
  world,
  selected,
  onClick,
}: {
  world: PixelWorld
  selected: boolean
  onClick: () => void
}) {
  const pin = world.state === 'done' ? '✅' : world.state === 'locked' ? '🔒' : ''

  return (
    <div
      className="absolute z-[2] flex w-[108px] -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center gap-2"
      style={{ left: `${(world.x / 1280) * 100}%`, top: `${(world.y / 560) * 100}%` }}
      onClick={onClick}
    >
      <div className="relative" style={{ outline: selected ? '3px solid #00bcd4' : undefined, outlineOffset: selected ? 4 : undefined }}>
        <WorldOrb world={world} size={74} />
        {pin && <span className="absolute -right-[14px] -top-[14px] text-sm">{pin}</span>}
      </div>
      <div
        className="text-center font-pixel text-[8px] leading-[1.5]"
        style={{
          color: world.state === 'locked' ? '#7a7a96' : '#e8d5b7',
          textShadow: '1px 1px 0 #07071a',
        }}
      >
        {world.n}. {world.name}
      </div>
    </div>
  )
}
