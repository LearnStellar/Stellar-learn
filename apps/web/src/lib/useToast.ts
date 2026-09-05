'use client'

import { useContext } from 'react'
import { ToastContext, type ToastVariant } from '@/components/ui/Toast'

/**
 * useToast — hook to trigger transient toast notifications.
 *
 * Must be used inside a <ToastProvider>.
 *
 * @example
 * const { showToast } = useToast()
 * showToast('Settings saved', 'success')
 * showToast('Invalid address', 'error')
 * showToast('Loading...', 'info')
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>')
  }
  return ctx
}

export type { ToastVariant }
