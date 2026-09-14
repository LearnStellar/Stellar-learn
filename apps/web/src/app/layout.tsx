import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Inter, Press_Start_2P, VT323, JetBrains_Mono } from 'next/font/google'
import { clerkEnabled } from '@/lib/auth'
import './globals.css'

// Every font goes through next/font so Next self-hosts the files at build
// time. A raw <link> to fonts.googleapis.com would fetch on each render,
// skip Next's optimization, and fail the build on networks that cannot
// reach Google Fonts.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const pressStart = Press_Start_2P({ subsets: ['latin'], weight: '400', variable: '--font-pixel' })
const vt323 = VT323({ subsets: ['latin'], weight: '400', variable: '--font-read' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' })

const fontVariables = [inter, pressStart, vt323, jetbrainsMono].map((f) => f.variable).join(' ')

export const metadata: Metadata = {
  title: 'Stellar Learn — Build on Stellar Blockchain Through Adventure',
  description:
    'An open-source gamified platform that teaches Stellar blockchain development through a 2D pixel-art adventure game. Go from zero to builder.',
  keywords: ['Stellar', 'blockchain', 'learn to code', 'DeFi', 'web3', 'gamified learning'],
  openGraph: {
    title: 'Stellar Learn',
    description: 'Learn Stellar blockchain development through 2D adventure gameplay.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const html = (
    <html lang="en" className={fontVariables}>
      <body className="bg-brand-dark text-brand-gold antialiased">{children}</body>
    </html>
  )

  // Only mount ClerkProvider when auth is configured; otherwise the app still
  // renders (e.g. /game) without requiring Clerk keys or network access.
  return clerkEnabled ? <ClerkProvider>{html}</ClerkProvider> : html
}
