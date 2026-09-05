'use client'

import { useCallback, useEffect, useId, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PixelButton } from './PixelButton'
import { PixelPanel, PixelStrip } from './PixelPanel'

/**
 * Modal — reusable confirmation dialog for destructive or important actions.
 *
 * @example
 * <Modal
 *   open={show}
 *   title="Delete Quest?"
 *   confirmLabel="Delete"
 *   cancelLabel="Cancel"
 *   onClose={() => setShow(false)}
 *   onConfirm={() => { deleteQuest(); setShow(false) }}
 * >
 *   This action cannot be undone. The quest and its progress will be lost.
 * </Modal>
 */
interface ModalProps {
  open: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  children: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** PixelButton variant for the confirm action */
  confirmVariant?: 'purple' | 'gold' | 'ghost'
  /** Disable the confirm button (e.g. while an async action is running) */
  confirmDisabled?: boolean
  /** Hide the cancel button entirely */
  hideCancel?: boolean
}

const FOCUSABLE =
  'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function Modal({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'gold',
  confirmDisabled = false,
  hideCancel = false,
}: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const prevFocus = useRef<HTMLElement | null>(null)

  // Close on Escape + trap focus
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        if (nodes.length === 0) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        const active = document.activeElement as HTMLElement
        if (e.shiftKey && active === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (!open) return
    prevFocus.current = document.activeElement as HTMLElement

    // Move focus into the dialog
    const t = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      first?.focus()
    }, 30)

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      prevFocus.current?.focus()
    }
  }, [open, handleKeyDown])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* dialog panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-md px-6"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <PixelPanel variant="purple" ornate>
              {/* header */}
              <PixelStrip className="!p-3">
                <h2
                  id={titleId}
                  className="font-pixel text-[11px] tracking-[2px] text-brand-gold-bright"
                  style={{ textShadow: '2px 2px 0 #07071a' }}
                >
                  {title}
                </h2>
              </PixelStrip>

              {/* body */}
              <div className="p-5">
                <div className="font-read text-[16px] leading-[1.6] text-brand-gold/90">
                  {children}
                </div>
              </div>

              {/* footer */}
              <div
                className="flex shrink-0 items-center justify-end gap-3 p-4"
                style={{ background: '#1a1a2e', borderTop: '4px solid #07071a' }}
              >
                {!hideCancel && (
                  <PixelButton
                    variant="ghost"
                    sm
                    onClick={onClose}
                    aria-label={cancelLabel}
                  >
                    {cancelLabel}
                  </PixelButton>
                )}
                {onConfirm && (
                  <PixelButton
                    variant={confirmVariant}
                    sm
                    disabled={confirmDisabled}
                    onClick={onConfirm}
                    aria-label={confirmLabel}
                  >
                    {confirmLabel}
                  </PixelButton>
                )}
              </div>
            </PixelPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
