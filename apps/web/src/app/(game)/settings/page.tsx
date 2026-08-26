'use client'

import { clerkEnabled } from '@/lib/auth'
import { PixelPanel } from '@/components/ui/PixelPanel'
import { AudioPreferenceSection } from '@/components/settings/AudioPreferenceSection'
import { AccountSection } from '@/components/settings/AccountSection'

/** Shown when Clerk isn't configured — the account bits are hidden. */
function AuthDisabledNotice() {
  return (
    <PixelPanel variant="soft">
      <h2 className="font-pixel text-sm text-brand-gold">ACCOUNT</h2>
      <p className="mt-4 font-sans text-sm text-brand-gold/70">
        Authentication is not configured on this environment, so account and
        sign-out are unavailable. Audio preference still works.
      </p>
    </PixelPanel>
  )
}

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-brand-dark px-8 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-pixel text-xl text-brand-gold">SETTINGS</h1>
        <div className="mt-10 space-y-6">
          <AudioPreferenceSection />
          {clerkEnabled ? <AccountSection /> : <AuthDisabledNotice />}
        </div>
      </div>
    </div>
  )
}