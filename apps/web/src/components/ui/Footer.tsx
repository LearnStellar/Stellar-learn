import { PixelStrip } from './PixelPanel'

/**
 * Footer — site chrome with project links.
 * Pixel-art styled to match the app's design system.
 */
export function Footer() {
  return (
    <footer className="mt-auto w-full">
      <PixelStrip className="!py-2">
        <div className="flex w-full items-center justify-between px-4 py-2">
          <span className="font-pixel text-[8px] tracking-[2px] text-brand-gold">
            STELLAR LEARN
          </span>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/LearnStellar/Stellar-learn"
              target="_blank"
              rel="noopener noreferrer"
              className="font-pixel text-[8px] tracking-[1px] text-brand-gold/70 transition-colors hover:text-brand-gold-bright"
            >
              REPO
            </a>
            <a
              href="https://github.com/LearnStellar/Stellar-learn/blob/develop/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="font-pixel text-[8px] tracking-[1px] text-brand-gold/70 transition-colors hover:text-brand-gold-bright"
            >
              LICENSE
            </a>
          </div>
        </div>
      </PixelStrip>
    </footer>
  )
}
