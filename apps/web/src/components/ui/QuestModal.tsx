'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Coin } from './Coin'
import { SpriteSlot } from './SpriteSlot'
import { PixelButton } from './PixelButton'
import { PixelPanel, PixelStrip } from './PixelPanel'

export interface QuizOption {
  label: string
  text: string
  correct: boolean
}

interface QuestModalProps {
  open: boolean
  onClose: () => void
  onComplete?: () => void
  title?: string
  /** lesson body — supports a <b> highlight via the `highlight` prop */
  children?: React.ReactNode
  reward?: string
  options?: QuizOption[]
}

const DEFAULT_OPTIONS: QuizOption[] = [
  {
    label: 'A',
    text: 'You should share your secret key so friends can send you XLM',
    correct: false,
  },
  {
    label: 'B',
    text: 'The public key is your address; the secret key must stay private',
    correct: true,
  },
  { label: 'C', text: 'Keypairs are optional on Stellar', correct: false },
]

const CONFETTI_PARTICLES = Array.from({ length: 22 }, (_, i) => {
  const p1 = ((i * 37 + 13) % 100) / 100
  const p2 = ((i * 59 + 27) % 100) / 100
  const p3 = ((i * 83 + 41) % 100) / 100
  const p4 = ((i * 97 + 19) % 100) / 100
  return {
    id: i,
    gold: i % 2 === 0,
    left: p1 * 100,
    rot: p2 * 360,
    destY: 760 + p3 * 60,
    duration: 1.4 + p4 * 0.9,
  }
})

/**
 * QuestModal — the quest / lesson overlay: parchment panel with a lesson
 * illustration slot, code snippet, an interactive quiz with correct/wrong
 * feedback, and a reward footer. Completing it fires an XP float + coin
 * confetti burst before closing.
 */
export function QuestModal({
  open,
  onClose,
  onComplete,
  title = '📜 QUEST 03 · THE FIRST KEYPAIR',
  children,
  reward,
  options = DEFAULT_OPTIONS,
}: QuestModalProps) {
  const [solved, setSolved] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)
  const [confetti, setConfetti] = useState<number[]>([])
  const [showXp, setShowXp] = useState(false)

  const reset = () => {
    setSolved(false)
    setPicked(null)
    setWrongIdx(null)
    setConfetti([])
    setShowXp(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const pick = (i: number) => {
    if (solved) return
    if (options[i]?.correct) {
      setPicked(i)
      setSolved(true)
    } else {
      setWrongIdx(i)
      setTimeout(() => setWrongIdx(null), 600)
    }
  }

  const complete = () => {
    setShowXp(true)
    setConfetti(Array.from({ length: 22 }, (_, i) => i))
    setTimeout(() => {
      onComplete?.()
      handleClose()
    }, 900)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-6"
          style={{ background: 'rgba(7,7,26,.72)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex w-[min(720px,94vw)] flex-col"
            style={{ maxHeight: 'min(600px, 90%)' }}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <PixelPanel
              ornate
              className="relative flex min-h-0 flex-col p-0"
              style={{ maxHeight: 'min(600px, 90vh)' }}
            >
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close quest"
                className="absolute -right-[2px] -top-[2px] z-[6] flex h-[34px] w-[34px] items-center justify-center font-pixel text-[12px] text-brand-gold"
                style={{
                  background: '#1a1a2e',
                  border: '3px solid #07071a',
                  boxShadow: '0 0 0 2px #e8d5b7',
                }}
              >
                ✕
              </button>

              <PixelStrip>
                <span className="relative z-[1]">{title}</span>
              </PixelStrip>

              <div className="pixel-scroll flex min-h-0 flex-col gap-4 overflow-auto p-4 sm:p-[22px_24px]">
                <SpriteSlot
                  className="flex h-[110px]"
                  tint="#ffd700"
                  label="LESSON ILLUSTRATION"
                  dim="quest_keypair_art · 480×110"
                />

                {children ?? (
                  <div className="font-read text-[20px] leading-[1.35] text-brand-gold">
                    Every Stellar adventurer needs a{' '}
                    <b className="text-brand-gold-bright">keypair</b> — a public key (your address,
                    safe to share) and a secret key (guard it with your life!). Generate one to
                    create your account on the network.
                  </div>
                )}

                <div
                  className="pixel-code overflow-x-auto p-[14px] font-read text-[18px] leading-[1.3]"
                  style={{
                    background: '#0b0b1e',
                    border: '3px solid #07071a',
                    boxShadow: 'inset 0 0 0 2px #1c1c38',
                    color: '#c9d6ff',
                  }}
                >
                  <span className="c">{'// forge your keypair'}</span>
                  <br />
                  <span className="k">const</span> pair = Keypair.<span className="f">random</span>
                  ();
                  <br />
                  pair.<span className="f">publicKey</span>() <span className="c">{'// '}</span>
                  <span className="s">&quot;GABC…XYZ&quot;</span>
                  <br />
                  pair.<span className="f">secret</span>() <span className="c">{'// '}</span>
                  <span className="s">&quot;SDEF…789&quot;</span>{' '}
                  <span className="c">🔒 keep secret</span>
                </div>

                <div className="font-pixel text-[9px] tracking-[3px] text-brand-gold">
                  CHECK YOUR UNDERSTANDING
                </div>

                <div className="flex flex-col gap-[10px]">
                  {options.map((opt, i) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => pick(i)}
                      className={`pixel-qopt ${picked === i ? 'correct' : ''} ${
                        wrongIdx === i ? 'wrong' : ''
                      }`}
                    >
                      <span className="mk">{opt.label}</span> {opt.text}
                    </button>
                  ))}
                </div>
              </div>

              {/* footer */}
              <div
                className="flex shrink-0 items-center"
                style={{
                  background: '#1a1a2e',
                  borderTop: '4px solid #07071a',
                  padding: '14px 18px',
                }}
              >
                <span className="pixel-constellation" />
                <div className="flex flex-1 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-[14px]">
                  <div className="flex items-center gap-[10px] font-pixel text-[9px] leading-[1.6] text-brand-gold-bright sm:text-[10px]">
                    REWARD <Coin scale={0.7} /> {reward ?? '+50 XP · 🔑 ACCOUNT BADGE'}
                  </div>
                  <PixelButton variant="gold" sm disabled={!solved} onClick={complete}>
                    COMPLETE ✓
                  </PixelButton>
                </div>
              </div>
            </PixelPanel>
          </motion.div>

          {/* FX layer */}
          <div className="pointer-events-none absolute inset-0 z-40">
            <AnimatePresence>
              {showXp && (
                <motion.div
                  className="absolute left-1/2 top-1/2 font-pixel text-[14px] text-brand-gold-bright"
                  style={{ textShadow: '2px 2px 0 #07071a' }}
                  initial={{ y: 0, opacity: 1 }}
                  animate={{ y: -70, opacity: 0 }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                >
                  +50 XP
                </motion.div>
              )}
            </AnimatePresence>
            {confetti.length > 0 &&
              CONFETTI_PARTICLES.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute"
                  style={{ left: `${p.left}%`, top: -30 }}
                  initial={{ y: 0, opacity: 1, rotate: 0 }}
                  animate={{ y: p.destY, opacity: 0.2, rotate: p.rot }}
                  transition={{ duration: p.duration, ease: 'easeIn' }}
                >
                  {p.gold ? (
                    <span className="text-[18px] text-brand-gold-bright">★</span>
                  ) : (
                    <Coin scale={0.6} />
                  )}
                </motion.div>
              ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
