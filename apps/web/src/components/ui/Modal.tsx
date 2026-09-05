/**
 * Modal — a reusable pixel-art confirmation dialog.
 *
 * A controlled modal with a title, body, and confirm/cancel actions.
 * Closes on backdrop click or Escape. Focus is trapped inside while open.
 *
 * Usage:
 * ```tsx
 * const [open, setOpen] = useState(false)
 * <Modal
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   title="Delete this?"
 *   body="This action cannot be undone."
 *   confirmLabel="Delete"
 *   onConfirm={() => { deleteItem(); setOpen(false) }}
 * />
 * ```
 */
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PixelPanel, PixelStrip } from './PixelPanel'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** Dialog title */
  title: React.ReactNode
  /** Dialog body text or content */
  body?: React.ReactNode
  /** Label for the confirm (destructive) button */
  confirmLabel?: string
  /** Label for the cancel button */
  cancelLabel?: string
  /** Called when the confirm button is clicked */
  onConfirm?: () => void
  /** If true, the confirm button uses the gold/CTA variant */
  dangerous?: boolean
  className?: string
}

const FIRST_FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Modal — pixel-art confirmation dialog with focus trapping,
 * backdrop-click close, and Escape-to-close.
 */
export function Modal({
  open,
  onClose,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  dangerous = false,
  className = '',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<Element | null>(null)

  // Save and restore focus around the modal
  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement
      // Move focus into the dialog on open
      const panel = panelRef.current
      if (panel) {
        const first = panel.querySelector<HTMLElement>(FIRST_FOCUSABLE)
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        first?.focus()
      }
    } else {
      // Restore focus when closing
      const prev = previousFocus.current
      if (prev instanceof HTMLElement) prev.focus()
    }
  }, [open])

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      // Focus trapping
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FIRST_FOCUSABLE),
        ).filter((el) => !el.hasAttribute('disabled'))
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first || document.activeElement === panelRef.current) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
          style={{ background: 'rgba(7,7,26,.8)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
          role="presentation"
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby={body ? 'modal-body' : undefined}
            className={['flex w-[min(480px,94vw)] flex-col', className].filter(Boolean).join(' ')}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <PixelPanel variant={dangerous ? 'soft' : undefined} className="flex flex-col overflow-hidden">
              {title && (
                <PixelStrip>
                  <span id="modal-title" className="font-pixel text-[11px] tracking-wider">
                    {title}
                  </span>
                </PixelStrip>
              )}
              <div className="flex flex-col gap-6 p-5">
                {body && (
                  <p
                    id="modal-body"
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--gold)', fontFamily: 'var(--font-inter)' }}
                  >
                    {body}
                  </p>
                )}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    className="pixel-btn pixel-btn--ghost pixel-btn--sm"
                    onClick={onClose}
                    type="button"
                  >
                    {cancelLabel}
                  </button>
                  <button
                    className={[
                      'pixel-btn pixel-btn--sm pixel-btn--block',
                      dangerous ? 'pixel-btn--gold' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      onConfirm?.()
                      onClose()
                    }}
                    type="button"
                  >
                    {confirmLabel}
                  </button>
                </div>
              </div>
            </PixelPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
