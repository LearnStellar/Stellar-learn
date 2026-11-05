'use client'

import { motion } from 'framer-motion'

interface MainMenuProps {
  onNewGame?: () => void
  onContinue?: () => void
  onAchievements?: () => void
}

/**
 * MainMenu — cosmic title screen with glowing logo, floating isles,
 * stone-tablet buttons, and testnet status. Fully fluid: the title and
 * layout scale smoothly from phone to desktop.
 */
export function MainMenu({ onNewGame, onContinue, onAchievements }: MainMenuProps) {
  return (
    <section className="absolute inset-0 flex flex-col overflow-y-auto">
      {/* floating island silhouettes (decorative — hidden on small screens) */}
      <div className="pointer-events-none hidden md:block">
        <Isle style={{ width: 160, height: 34, left: '9%', bottom: 150 }} />
        <Isle style={{ width: 120, height: 26, right: '12%', bottom: 230 }} />
        <Isle
          style={{ width: 220, height: 40, left: '50%', bottom: 60, transform: 'translateX(-50%)' }}
        />
      </div>

      <div className="relative z-[2] flex flex-1 flex-col items-center justify-center gap-6 px-5 py-16 text-center sm:gap-[30px]">
        <motion.div
          className="font-pixel text-[8px] tracking-[3px] text-stellar-teal sm:text-[9px]"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          ★ A QUEST TO MASTER ★
        </motion.div>

        <motion.h1
          className="disp-title animate-titlepulse font-pixel text-brand-gold"
          style={{
            textShadow:
              '4px 4px 0 #07071a, -4px 0 0 #7b5ea7, 4px 0 0 #3d5afe,' +
              '0 0 24px rgba(123,94,167,.8), 0 0 44px rgba(0,188,212,.5)',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          STELLAR
          <br />
          <span
            className="text-stellar-teal"
            style={{
              textShadow: '4px 4px 0 #07071a, -3px 0 0 #3d5afe, 0 0 24px rgba(0,188,212,.8)',
            }}
          >
            LEARN
          </span>
        </motion.h1>

        <div className="disp-sub max-w-[34ch] font-read tracking-[1px] text-brand-purple-light">
          Learn to build on Stellar — one quest at a time.
        </div>

        <motion.div
          className="flex w-full flex-col items-center gap-[14px]"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } } }}
        >
          <Tablet primary onClick={onNewGame} keyIcon="▶">
            NEW GAME
          </Tablet>
          <Tablet onClick={onContinue} keyIcon="↻">
            CONTINUE
          </Tablet>
          <Tablet onClick={onAchievements} keyIcon="★">
            ACHIEVEMENTS
          </Tablet>
        </motion.div>
      </div>

      {/* footer */}
      <div className="relative z-[3] flex shrink-0 flex-col items-center gap-3 px-5 pb-6 text-center sm:flex-row sm:justify-between sm:px-7 sm:text-left">
        <div className="flex items-center gap-2 font-pixel text-[8px] text-stellar-teal sm:text-[9px]">
          <span
            className="h-2 w-2 rounded-full bg-stellar-teal animate-twinkle"
            style={{ boxShadow: '0 0 8px 2px rgba(0,188,212,.8)' }}
          />
          CONNECTED · STELLAR TESTNET
        </div>
        <div className="flex items-center gap-[10px]">
          <span className="pixel-rune">✷</span>
          <span className="font-pixel text-[8px] tracking-[3px] text-brand-gold-bright sm:text-[9px]">
            v0.1 · POWERED BY STELLAR
          </span>
        </div>
      </div>
    </section>
  )
}

function Isle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute z-[1]"
      style={{
        background: '#171733',
        border: '4px solid #07071a',
        boxShadow: 'inset 0 4px 0 #262652, 0 0 0 2px #0a0a1c',
        ...style,
      }}
    />
  )
}

function Tablet({
  children,
  keyIcon,
  primary,
  onClick,
}: {
  children: React.ReactNode
  keyIcon: string
  primary?: boolean
  onClick?: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`pixel-tablet ${primary ? 'pixel-tablet--primary' : ''}`}
      variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
    >
      <span className="key">{keyIcon}</span> {children}
    </motion.button>
  )
}
