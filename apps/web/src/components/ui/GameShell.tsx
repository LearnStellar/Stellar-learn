'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { StarField } from './StarField'
import { MainMenu } from './MainMenu'
import { CharacterSelect } from './CharacterSelect'
import { WorldMap } from './WorldMap'
import { GameplayScene } from './GameplayScene'
import { GameHUD } from './GameHUD'
import { Achievements } from './Achievements'
import { QuestModal } from './QuestModal'

type Screen = 'menu' | 'chars' | 'map' | 'play' | 'ach'

const SCREENS: { id: Screen; label: string }[] = [
  { id: 'menu', label: 'MENU' },
  { id: 'chars', label: 'CHARACTERS' },
  { id: 'map', label: 'MAP' },
  { id: 'play', label: 'GAMEPLAY' },
  { id: 'ach', label: 'BADGES' },
]

/**
 * GameShell — the Stellar Learn pixel game-UI shell.
 *
 * DESIGN PREVIEW ONLY. Every screen here (including GAMEPLAY) is a static CSS
 * mockup used as a style reference — nothing is playable. The real game is
 * the Phaser canvas at /world/[worldId]/level/[levelId] (canonical entry:
 * /game). This shell is served at /design-preview.
 *
 * Unlike the original handoff prototype (a fixed 1280×720 stage scaled with
 * `transform`), this is a *fluid* responsive layout: the cosmic viewport fills
 * the screen at any size and every screen reflows — from phones to ultrawide —
 * with no letterboxing and no tiny-thumbnail scaling.
 */
export function GameShell() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [questOpen, setQuestOpen] = useState(false)
  const [boss, setBoss] = useState(false)
  const [xp, setXp] = useState(64)

  const goto = (s: Screen) => {
    setScreen(s)
    if (s !== 'play') setQuestOpen(false)
  }

  const openQuest = () => {
    setScreen('play')
    setQuestOpen(true)
  }

  const toggleBoss = () => {
    setScreen('play')
    setBoss((b) => !b)
  }

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        background:
          'radial-gradient(1200px 700px at 50% -10%, #1d1640 0%, transparent 60%),' +
          'radial-gradient(900px 600px at 80% 110%, #16243f 0%, transparent 55%), #07071a',
      }}
    >
      {/* ---- top screen-switcher nav (chrome, not part of the game) ---- */}
      <nav
        className="nav-scroll z-50 flex shrink-0 items-center gap-[6px] overflow-x-auto px-3 py-[10px] font-pixel sm:gap-2 sm:px-4"
        style={{ background: '#0a0a18', borderBottom: '1px solid #2a2a46' }}
      >
        <span
          className="shrink-0 rounded-[4px] px-[8px] py-[5px] text-[7px] tracking-[1px]"
          style={{ background: '#3a2a10', color: '#ffd700', border: '1px solid #7a5a1a' }}
        >
          DESIGN PREVIEW
        </span>
        <a
          href="/game"
          className="shrink-0 rounded-[4px] px-[8px] py-[5px] text-[7px] tracking-[1px] no-underline"
          style={{ background: '#0f2a2e', color: '#7df0ff', border: '1px solid #1a5a64' }}
        >
          PLAY THE REAL GAME
        </a>
        <span className="mx-[2px] h-[22px] w-px shrink-0 bg-[#2a2a46]" />
        <span className="hidden shrink-0 px-[6px] text-[7px] text-[#6a6a8a] sm:inline">
          SCREENS
        </span>
        {SCREENS.map((s) => (
          <ProtoBtn key={s.id} active={screen === s.id} onClick={() => goto(s.id)}>
            {s.label}
          </ProtoBtn>
        ))}
        <span className="mx-[2px] h-[22px] w-px shrink-0 bg-[#2a2a46]" />
        <ProtoBtn
          active={questOpen}
          accent
          onClick={() => (questOpen ? setQuestOpen(false) : openQuest())}
        >
          QUEST
        </ProtoBtn>
        <ProtoBtn active={boss} accent onClick={toggleBoss}>
          BOSS HUD
        </ProtoBtn>
      </nav>

      {/* ---- the fluid game viewport ---- */}
      <div className="game-viewport">
        <StarField />

        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {screen === 'menu' && (
              <MainMenu
                onNewGame={() => goto('chars')}
                onContinue={() => goto('map')}
                onAchievements={() => goto('ach')}
              />
            )}
            {screen === 'chars' && (
              <CharacterSelect onBack={() => goto('menu')} onEmbark={() => goto('map')} />
            )}
            {screen === 'map' && (
              <WorldMap onBack={() => goto('menu')} onEnterWorld={() => goto('play')} />
            )}
            {screen === 'play' && (
              <>
                <GameplayScene />
                <GameHUD xp={xp} bossMode={boss} onPrompt={openQuest} />
              </>
            )}
            {screen === 'ach' && <Achievements onBack={() => goto('menu')} />}
          </motion.div>
        </AnimatePresence>

        <QuestModal
          open={questOpen}
          onClose={() => setQuestOpen(false)}
          onComplete={() => setXp((v) => Math.min(100, v + 12))}
        />
      </div>
    </div>
  )
}

function ProtoBtn({
  children,
  active,
  accent,
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  accent?: boolean
  onClick?: () => void
}) {
  const base =
    'shrink-0 cursor-pointer rounded-[6px] px-[10px] py-2 font-pixel text-[8px] tracking-[.5px] whitespace-nowrap transition-colors'
  const style: React.CSSProperties = active
    ? accent
      ? { background: '#00bcd4', color: '#07071a', border: '1px solid #7df0ff' }
      : { background: '#7b5ea7', color: '#fff', border: '1px solid #9b7ec7' }
    : { background: '#15152a', color: '#b9b9d6', border: '1px solid #2c2c4a' }

  return (
    <button type="button" onClick={onClick} className={base} style={style}>
      {children}
    </button>
  )
}
