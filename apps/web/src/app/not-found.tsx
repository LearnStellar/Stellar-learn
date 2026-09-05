import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand-dark px-8">
      {/* Star field background (mirrors page.tsx) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0d0d2b_100%)]" />
        <div className="stars absolute inset-0" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Pixel-art style 404 */}
        <div className="mb-8 flex items-center justify-center">
          <span className="font-pixel text-6xl leading-none text-brand-purple md:text-8xl">4</span>
          <span className="font-pixel text-6xl leading-none text-brand-gold md:text-8xl">0</span>
          <span className="font-pixel text-6xl leading-none text-brand-purple md:text-8xl">4</span>
        </div>

        <h1 className="mb-4 font-pixel text-lg text-brand-gold md:text-xl">
          LOST IN SPACE
        </h1>

        <p className="mb-10 max-w-md font-sans text-sm text-brand-gold/60">
          This page drifted into a black hole. Head back to base before your oxygen runs out.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link href="/" className="btn-pixel text-xs">
            ◀ Return to Base
          </Link>
          <Link
            href="/dashboard"
            className="font-pixel text-xs text-brand-gold/70 underline underline-offset-4 transition hover:text-brand-gold"
          >
            Dashboard →
          </Link>
        </div>
      </div>
    </main>
  )
}
