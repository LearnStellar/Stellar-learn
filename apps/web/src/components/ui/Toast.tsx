'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PixelPanel } from './PixelPanel'

type ToastVariant = 'success' | 'info' | 'error'

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VARIANT_CONFIG: Record<ToastVariant, { label: string; color: string }> = {
  success: { label: '\u2713', color: '#4caf50' },
  info:    { label: 'i',     color: '#00bcd4' },
  error:   { label: '\u2717', color: '#e53935' },
}

let toastId = 0

/**
 * ToastProvider — wraps the app and renders transient toast notifications.
 *
 * @example
 * // In layout or a top-level component:
 * <ToastProvider>{children}</ToastProvider>
 *
 * // Anywhere inside:
 * const { showToast } = useToast()
 * showToast('Quest completed!', 'success')
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, variant }])
    window.setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(t => {
            const cfg = VARIANT_CONFIG[t.variant]
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 80, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <PixelPanel variant="purple" className="!min-w-[260px] !max-w-[360px] !p-0">
                  <div className="flex items-center gap-3 p-3">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center font-pixel text-[12px]"
                      style={{ color: cfg.color, textShadow: `1px 1px 0 #07071a` }}
                    >
                      {cfg.label}
                    </span>
                    <span className="flex-1 font-read text-[15px] leading-[1.4] text-brand-gold/90">
                      {t.message}
                    </span>
                    <button
                      type="button"
                      onClick={() => dismiss(t.id)}
                      className="shrink-0 font-pixel text-[9px] text-brand-gold/50 transition-colors hover:text-brand-gold-bright"
                      aria-label="Dismiss notification"
                    >
                      {'\u2715'}
                    </button>
                  </div>
                </PixelPanel>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}
