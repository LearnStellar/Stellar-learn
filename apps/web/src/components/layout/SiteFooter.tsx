import Link from 'next/link'

export const REPO_URL = 'https://github.com/LearnStellar/Stellar-learn'

const LINKS = [
  { label: 'GitHub', href: REPO_URL, external: true },
  { label: 'Contribute', href: `${REPO_URL}/blob/main/CONTRIBUTING.md`, external: true },
  { label: 'Stellar Docs', href: 'https://developers.stellar.org/docs', external: true },
  { label: 'Playground', href: '/playground', external: false },
]

/** Site footer: project links, license, and the testnet disclaimer. */
export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-brand-panel-line/60 bg-brand-dark-2/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div>
          <span className="font-pixel text-xs text-brand-gold">STELLAR LEARN</span>
          <p className="mt-3 max-w-sm font-sans text-sm text-brand-gold/75">
            Free and open source. Everything runs on the Stellar testnet, so no real funds are ever
            used.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-8 gap-y-3 sm:gap-x-10">
            {LINKS.map((link) => (
              <li key={link.label}>
                {link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans text-sm text-brand-gold/85 transition hover:text-brand-gold-bright"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    href={link.href}
                    className="font-sans text-sm text-brand-gold/85 transition hover:text-brand-gold-bright"
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="border-t border-brand-panel-line/40 py-4 text-center font-sans text-xs text-brand-gold/70">
        © {new Date().getFullYear()} Stellar Learn contributors · MIT License
      </p>
    </footer>
  )
}
