'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { World, Level } from '@stellar-learn/content'
import { worldLevels } from '@stellar-learn/content'
import { PixelButton } from '@/components/ui/PixelButton'
import { PixelPanel, PixelStrip } from '@/components/ui/PixelPanel'

type LevelState = 'completed' | 'available' | 'locked'

const QUEST_ICON: Record<string, string> = {
  lesson: '📖',
  quiz: '❓',
  challenge: '⚔️',
  boss: '👹',
}

const MAP_W = 1280
const MAP_H = 700

/**
 * 12-node constellation layout (viewBox 0 0 1280 700), arranged as a reading
 * snake top-to-bottom: Stellar (top) → Rust (middle) → Soroban (bottom), so the
 * journey starts at the top like reading a page. Freeform positions, per the
 * design system's "freeform for maps" note.
 */
const LEVEL_POSITIONS: { x: number; y: number }[] = [
  { x: 120, y: 200 }, // 1
  { x: 360, y: 200 }, // 2
  { x: 600, y: 200 }, // 3
  { x: 840, y: 200 }, // 4
  { x: 840, y: 400 }, // 5
  { x: 600, y: 400 }, // 6
  { x: 360, y: 400 }, // 7
  { x: 120, y: 400 }, // 8
  { x: 120, y: 600 }, // 9
  { x: 360, y: 600 }, // 10
  { x: 600, y: 600 }, // 11
  { x: 840, y: 600 }, // 12
]

/** Horizontal act label sits just above its row (Stellar top, Soroban bottom). */
const ACT_ROWS: { labelY: number; range: [number, number]; roman: string; name: string; color: string }[] = [
  { labelY: 120, range: [0, 4], roman: 'ACT I', name: 'STELLAR', color: '#00bcd4' },
  { labelY: 320, range: [4, 8], roman: 'ACT II', name: 'RUST', color: '#ffd700' },
  { labelY: 520, range: [8, 12], roman: 'ACT III', name: 'SOROBAN', color: '#9b7ec7' },
]

function deriveState(
  level: Level,
  index: number,
  levels: Level[],
  completed: Set<string>
): LevelState {
  const done = level.quests.length > 0 && level.quests.every((q) => completed.has(q.id))
  if (done) return 'completed'
  if (index === 0) return 'available'
  const prev = levels[index - 1]
  const prevDone = prev && prev.quests.length > 0 && prev.quests.every((q) => completed.has(q.id))
  return prevDone ? 'available' : 'locked'
}

interface LevelMapProps {
  world: World
  /** Quest ids the signed-in player has completed (empty when signed out). */
  completedQuestIds?: string[]
}

/**
 * LevelMap — the in-world map (Issue #78). A data-driven constellation of a
 * world's levels: locked / available / completed rune-stone nodes connected by
 * a path, plus an info panel listing the selected level's quests. Renders from
 * `worldLevels(world)`, so adding a level is a content-only change.
 */
export function LevelMap({ world, completedQuestIds = [] }: LevelMapProps) {
  const levels = useMemo(() => worldLevels(world), [world])
  const completed = useMemo(() => new Set(completedQuestIds), [completedQuestIds])

  const states = useMemo(
    () => levels.map((level, i) => deriveState(level, i, levels, completed)),
    [levels, completed]
  )

  const firstAvailable = states.findIndex((s) => s === 'available')
  const [selected, setSelected] = useState(firstAvailable === -1 ? 0 : firstAvailable)
  const current = levels[selected]

  if (levels.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-dark">
        <div className="font-pixel text-sm text-brand-gold/60">No levels yet</div>
      </div>
    )
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-brand-dark">
      {/* Night-sky backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 600px at 50% 0%, #141436 0%, #0d0d2b 60%, #07071a 100%)',
        }}
      />

      <div className="relative z-[2] px-4 pb-8 pt-6 sm:px-8 lg:px-14 lg:pt-12">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <span className="font-pixel text-[8px] tracking-[3px] text-stellar-teal sm:text-[9px]">
              {world.title.toUpperCase()} · {levels.length} LEVELS
            </span>
            <span
              className="disp-head font-pixel text-brand-gold-bright"
              style={{ textShadow: '3px 3px 0 #07071a, 0 0 16px rgba(255,215,0,.3)' }}
            >
              CHOOSE YOUR LEVEL
            </span>
          </div>
          <Link href="/dashboard" className="pixel-btn pixel-btn--ghost pixel-btn--sm no-underline">
            ‹ WORLD MAP
          </Link>
        </div>
      </div>

      {/* ---- desktop: constellation + side info panel ---- */}
      <div className="relative z-[2] hidden min-h-[700px] lg:block">
        <svg
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          preserveAspectRatio="none"
        >
          {levels.slice(0, -1).map((_, i) => {
            const a = LEVEL_POSITIONS[i]
            const b = LEVEL_POSITIONS[i + 1]
            if (!a || !b) return null
            const done = states[i] === 'completed'
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

        {levels.map((level, i) => (
          <LevelNode
            key={level.id}
            level={level}
            index={i}
            state={states[i]!}
            selected={i === selected}
            onClick={() => setSelected(i)}
          />
        ))}

        {/* Act labels — horizontal, left-aligned with the first node's stone edge */}
        {ACT_ROWS.map((act) => (
          <div
            key={act.name}
            className="pointer-events-none absolute z-[2] flex items-baseline gap-2"
            style={{ left: `calc(${(120 / MAP_W) * 100}% - 37px)`, top: `${(act.labelY / MAP_H) * 100}%` }}
          >
            <span className="font-pixel text-[8px] tracking-[2px] text-brand-gold/50">
              {act.roman}
            </span>
            <span
              className="font-pixel text-[11px] tracking-[1px]"
              style={{ color: act.color, textShadow: '2px 2px 0 #07071a' }}
            >
              {act.name}
            </span>
          </div>
        ))}

        {/* Info panel */}
        <PixelPanel
          ornate
          className="absolute right-[34px] top-1/2 z-[5] w-[380px] -translate-y-1/2 p-0"
        >
          {current && (
            <>
              <PixelStrip className="text-[12px]">
                LEVEL {current.order} · {current.title.toUpperCase()}
              </PixelStrip>
              <LevelInfo
                world={world}
                level={current}
                state={states[selected]!}
                completed={completed}
              />
            </>
          )}
        </PixelPanel>
      </div>

      {/* ---- mobile / tablet: vertical level list ---- */}
      <div className="relative z-[2] flex flex-col gap-4 px-4 pb-10 sm:px-8 lg:hidden">
        {levels.map((level, i) => (
          <PixelPanel key={level.id} ornate className="p-0">
            <PixelStrip className="text-[11px] sm:text-[13px]">
              <span className="flex items-center gap-3">
                <LevelStone state={states[i]!} index={i} size={40} />
                LEVEL {level.order} · {level.title.toUpperCase()}
              </span>
            </PixelStrip>
            <LevelInfo world={world} level={level} state={states[i]!} completed={completed} />
          </PixelPanel>
        ))}
      </div>
    </section>
  )
}

/** Shared info body — phase, quest list, progress, and the enter/locked CTA. */
function LevelInfo({
  world,
  level,
  state,
  completed,
}: {
  world: World
  level: Level
  state: LevelState
  completed: Set<string>
}) {
  const doneCount = level.quests.filter((q) => completed.has(q.id)).length
  const prog = level.quests.length > 0 ? Math.round((doneCount / level.quests.length) * 100) : 0

  return (
    <div className="flex flex-col gap-3 p-[18px]">
      {level.phase && <MetaRow label="PHASE" value={level.phase} />}
      <MetaRow label="QUESTS" value={`${doneCount}/${level.quests.length}`} />
      <p className="font-sans text-xs leading-relaxed text-brand-gold/70">{level.description}</p>

      {/* Quest list */}
      <div className="flex flex-col gap-1.5">
        {level.quests.map((q) => {
          const done = completed.has(q.id)
          return (
            <div
              key={q.id}
              className="flex items-center gap-2 rounded border border-brand-dark-4 bg-brand-dark-3/60 px-2 py-1.5"
            >
              <span className="text-sm">{QUEST_ICON[q.type] ?? '📜'}</span>
              <span
                className={`flex-1 truncate font-pixel text-[8px] ${
                  done ? 'text-brand-gold/40 line-through' : 'text-brand-gold/90'
                }`}
              >
                {q.title}
              </span>
              <span className="font-pixel text-[8px] text-brand-gold-bright">{q.xpReward} XP</span>
              <span className="flex w-4 flex-none items-center justify-center text-xs leading-none">
                {done ? '✅' : '·'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="pixel-progress">
        <div className="pf" style={{ width: `${prog}%` }} />
      </div>

      {state === 'locked' ? (
        <PixelButton sm block disabled>
          🔒 CLEAR LEVEL {level.order - 1} FIRST
        </PixelButton>
      ) : (
        <Link
          href={`/world/${world.slug}/level/${level.slug}`}
          className="pixel-btn pixel-btn--gold pixel-btn--sm pixel-btn--block text-center no-underline"
        >
          {state === 'completed' ? 'REPLAY LEVEL ▶' : 'ENTER LEVEL ▶'}
        </Link>
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

/** The rune-stone node primitive — three states, readable against the night sky. */
function LevelStone({ state, index, size }: { state: LevelState; index: number; size: number }) {
  let style: React.CSSProperties
  let cls = ''
  if (state === 'locked') {
    style = {
      background: '#2a2a3e',
      color: '#6a6a86',
      boxShadow: '0 0 0 3px #6b7280, 0 5px 0 #07071a',
    }
  } else if (state === 'available') {
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
      className={`flex flex-none items-center justify-center rounded ${cls}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        lineHeight: 1,
        border: '4px solid #07071a',
        fontFamily: "'Press Start 2P', monospace",
        ...style,
      }}
    >
      {state === 'locked' ? '🔒' : state === 'completed' ? '✓' : index + 1}
    </span>
  )
}

function LevelNode({
  level,
  index,
  state,
  selected,
  onClick,
}: {
  level: Level
  index: number
  state: LevelState
  selected: boolean
  onClick: () => void
}) {
  const pos = LEVEL_POSITIONS[index]
  if (!pos) return null
  const clickable = state !== 'locked'

  return (
    <div
      className="absolute z-[2] flex w-[108px] -translate-x-1/2 flex-col items-center gap-2"
      style={{ left: `${(pos.x / MAP_W) * 100}%`, top: `${(pos.y / MAP_H) * 100}%`, marginTop: -37 }}
      onClick={clickable ? onClick : undefined}
    >
      <div
        className="relative"
        style={{
          outline: selected ? '3px solid #00bcd4' : undefined,
          outlineOffset: selected ? 4 : undefined,
          cursor: clickable ? 'pointer' : 'default',
        }}
      >
        <LevelStone state={state} index={index} size={74} />
        {state === 'available' && (
          <span className="absolute -top-[26px] left-1/2 -translate-x-1/2 animate-bob font-pixel text-sm text-brand-gold-bright">
            !
          </span>
        )}
      </div>
      <div
        className="text-center font-pixel text-[8px] leading-[1.5]"
        style={{ color: state === 'locked' ? '#7a7a96' : '#e8d5b7', textShadow: '1px 1px 0 #07071a' }}
      >
        {index + 1}. {level.title}
      </div>
    </div>
  )
}
