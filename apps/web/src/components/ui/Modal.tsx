'use client'

import { useCallback, useEffect, useRef } from 'react'
import { PixelButton } from '@/components/ui/PixelButton'

/**
 * ConfirmModal — a controlled, accessible confirmation modal for destructive
 * or important actions.
 *
 * Usage:
 *   const [open, setOpen] = useState(false)
 *   <ConfirmModal
 *     open={open}
 *     title="Delete offer?"
 *     message="This action cannot be undone."
 *     confirmLabel="Delete"
 *     cancelLabel="Cancel"
 *     onConfirm={handleDelete}
 *     onClose={() => setOpen(false)}
 *   />
 */
interface ConfirmModalProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onClose: () => void
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  // Save the previously-focused element and focus the dialog when it opens.
  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
  }, [open])

  // Restore focus when the modal unmounts.
  useEffect(() => {
    if (open) return
    previouslyFocused.current?.focus()
    previouslyFocused.current = null
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // Focus trap: keep Tab/Shift+Tab cycling within the dialog.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      )
      if (focusables.length === 0) return
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    },
    []
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby={message ? 'confirm-modal-message' : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="pixel-panel w-full max-w-md p-6 outline-none"
      >
        <h2 id="confirm-modal-title" className="font-pixel text-lg text-brand-gold">
          {title}
        </h2>
        {message && (
          <p
            id="confirm-modal-message"
            className="mt-3 font-sans text-sm leading-relaxed text-brand-gold/80"
          >
            {message}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <PixelButton variant="ghost" onClick={onClose}>
            {cancelLabel}
          </PixelButton>
          <PixelButton variant="purple" onClick={onConfirm}>
            {confirmLabel}
          </PixelButton>
        </div>
      </div>
    </div>
  )
}