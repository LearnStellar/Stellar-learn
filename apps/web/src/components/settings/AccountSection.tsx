'use client'

import { useUser } from '@clerk/nextjs'
import { SignOutButton } from '@clerk/nextjs'
import Link from 'next/link'
import { PixelButton } from '@/components/ui/PixelButton'
import { PixelPanel } from '@/components/ui/PixelPanel'

/**
 * Account section for the Settings page. Shows the signed-in player's
 * email/username and a working sign-out. Only rendered when Clerk is enabled.
 */
export function AccountSection() {
  const { user } = useUser()

  if (!user) {
    return (
      <PixelPanel variant="soft">
        <h2 className="font-pixel text-sm text-brand-gold">ACCOUNT</h2>
        <p className="mt-4 font-sans text-sm text-brand-gold/80">
          You are not signed in.
        </p>
        <Link href="/sign-in" className="mt-4 inline-block px-4 py-2 font-sans text-xs text-brand-gold-bright underline-offset-4 hover:underline">
          Sign in
        </Link>
      </PixelPanel>
    )
  }

  return (
    <PixelPanel variant="soft">
      <h2 className="font-pixel text-sm text-brand-gold">ACCOUNT</h2>
      <div className="mt-4 space-y-2">
        <p className="font-sans text-sm text-brand-gold/90">
          <span className="text-brand-gold/60">Name:</span>{' '}
          {user.username ?? user.firstName ?? 'Adventurer'}
        </p>
        <p className="font-sans text-sm text-brand-gold/90">
          <span className="text-brand-gold/60">Email:</span>{' '}
          {(user.primaryEmailAddress?.emailAddress as string | undefined) ?? '—'}
        </p>
      </div>
      <div className="mt-6">
        <SignOutButton>
          <PixelButton variant="ghost">Sign out</PixelButton>
        </SignOutButton>
      </div>
    </PixelPanel>
  )
}