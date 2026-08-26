/**
 * Footer — site chrome footer with project links (repo, license),
 * matching the pixel-art / brand style.
 */
export function Footer() {
  return (
    <footer className="border-t border-brand-dark-4 bg-brand-dark-2 px-8 py-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="font-pixel text-[10px] tracking-wide text-brand-gold/70">
          STELLAR LEARN
        </p>
        <nav className="flex items-center gap-6">
          <a
            href="https://github.com/LearnStellar/Stellar-learn"
            target="_blank"
            rel="noreferrer"
            className="font-sans text-xs text-brand-gold/80 underline-offset-4 hover:text-brand-gold-bright hover:underline"
          >
            GitHub
          </a>
          <a
            href="https://github.com/LearnStellar/Stellar-learn/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer"
            className="font-sans text-xs text-brand-gold/80 underline-offset-4 hover:text-brand-gold-bright hover:underline"
          >
            License
          </a>
        </nav>
        <p className="font-sans text-[11px] text-brand-gold/50">
          Learn Stellar blockchain development through adventure
        </p>
      </div>
    </footer>
  )
}