import Link from 'next/link'
import { GuestOnly, AuthedOnly } from '@/components/auth/AuthGate'
import { PixelPanel, PixelStrip } from '@/components/ui/PixelPanel'
import { PixelButton } from '@/components/ui/PixelButton'
import { StarField } from '@/components/ui/StarField'

export const metadata = { title: '404 — Lost in the Stars | Stellar Learn' }

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-dark px-4 py-12">
      <StarField />

      <PixelPanel variant="purple" ornate className="relative z-10 w-full max-w-lg">
        <PixelStrip>
          <span className="font-pixel text-[10px]">SYSTEM ERROR</span>
        </PixelStrip>

        <div className="flex flex-col items-center gap-6 px-8 py-10 text-center">
          <div
            className="font-pixel text-5xl text-brand-gold-bright"
            style={{ textShadow: '4px 4px 0 #07071a, 0 0 24px rgba(255,215,0,.5)' }}
          >
            404
          </div>

          <h1 className="font-pixel text-sm text-brand-gold">Lost in the Stars</h1>

          <p className="max-w-xs font-sans text-sm text-brand-gold/60">
            This route doesn&apos;t exist anywhere in the Stellar Learn universe. Chart a course
            back before you drift further.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/">
              <PixelButton variant="gold">▶ Back to Home</PixelButton>
            </Link>
            <GuestOnly>
              <Link href="/sign-up">
                <PixelButton variant="ghost">Start Adventure</PixelButton>
              </Link>
            </GuestOnly>
            <AuthedOnly>
              <Link href="/dashboard">
                <PixelButton variant="ghost">Go to Dashboard</PixelButton>
              </Link>
            </AuthedOnly>
          </div>
        </div>
      </PixelPanel>
    </main>
  )
}
