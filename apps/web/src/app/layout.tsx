import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import { clerkEnabled } from '@/lib/auth'
import { Footer } from '@/components/ui/Footer'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Stellar Learn — Build on Stellar Blockchain Through Adventure',
  description:
    'An open-source gamified platform that teaches Stellar blockchain development through a 2D pixel-art adventure game. Go from zero to builder.',
  keywords: ['Stellar', 'blockchain', 'learn to code', 'DeFi', 'web3', 'gamified learning'],
  applicationName: 'Stellar Learn',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'Stellar Learn',
    description: 'Learn Stellar blockchain development through 2D adventure gameplay.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Stellar Learn',
    images: [{ url: '/icon.svg', width: 64, height: 64, alt: 'Stellar Learn' }],
  },
  twitter: {
    card: 'summary',
    title: 'Stellar Learn',
    description: 'Learn Stellar blockchain development through 2D adventure gameplay.',
    images: ['/icon.svg'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0d0d2b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const html = (
    <html lang="en" className={inter.variable}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-brand-dark text-brand-gold antialiased">
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  )

  // Only mount ClerkProvider when auth is configured; otherwise the app still
  // renders (e.g. /game) without requiring Clerk keys or network access.
  return clerkEnabled ? <ClerkProvider>{html}</ClerkProvider> : html
}