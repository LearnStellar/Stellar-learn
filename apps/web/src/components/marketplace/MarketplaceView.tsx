'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ItemTier, MarketplaceItem } from '@stellar-learn/content/marketplace'
import { ItemCard, type PurchaseState } from './ItemCard'

interface MarketplaceData {
  tiers: { tier: ItemTier; items: MarketplaceItem[] }[]
  ownedItemIds: string[]
  gemBalance: number
}

interface PurchaseResult {
  item: MarketplaceItem
  gemBalance: number
  txHash: string
  network: string
}

/**
 * MarketplaceView — the in-game shop. Loads the catalog + ownership + gem
 * balance from ONE endpoint (GET /api/marketplace, no per-item requests),
 * renders items grouped by tier in rare -> epic -> legendary -> mythic
 * order, and drives purchases through POST /api/marketplace with only
 * `{ itemId }` — the server resolves the real price, this component never
 * sends one.
 */
export function MarketplaceView() {
  const [data, setData] = useState<MarketplaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchasingId, setPurchasingId] = useState<string | null>(null)
  const [lastPurchase, setLastPurchase] = useState<PurchaseResult | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/marketplace')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load failed'))))
      .then((d: MarketplaceData) => {
        setData(d)
        setError(null)
      })
      .catch(() => setError('Could not load the marketplace. Sign in and try again.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const buy = async (itemId: string) => {
    setError(null)
    setPurchasingId(itemId)
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Purchase failed')
        return
      }
      setLastPurchase(body)
      setData((prev) =>
        prev
          ? { ...prev, gemBalance: body.gemBalance, ownedItemIds: [...prev.ownedItemIds, body.item.id] }
          : prev
      )
    } catch {
      setError('Purchase failed. Try again.')
    } finally {
      setPurchasingId(null)
    }
  }

  const stateFor = (item: MarketplaceItem): PurchaseState => {
    if (data?.ownedItemIds.includes(item.id)) return 'owned'
    if (purchasingId === item.id) return 'purchasing'
    if (data && data.gemBalance < item.priceGems) return 'not-enough-gems'
    return 'idle'
  }

  return (
    <div className="min-h-screen bg-brand-dark px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-pixel text-lg text-brand-gold">Marketplace</h1>
            <p className="mt-2 font-sans text-sm text-brand-gold/60">
              Spend gems on cosmetic gear, minted as NFTs on the Stellar testnet.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-lg border border-brand-dark-4 bg-brand-dark-2 px-4 py-2 font-pixel text-xs text-brand-gold-bright">
              {data ? `${data.gemBalance} GEMS` : '...'}
            </div>
            <Link href="/dashboard" className="font-pixel text-[10px] text-brand-gold/50 hover:text-brand-gold">
              ‹ Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-sans text-xs text-red-300">
            {error}
          </div>
        )}

        {lastPurchase && (
          <PurchaseSuccessBanner result={lastPurchase} onDismiss={() => setLastPurchase(null)} />
        )}

        {loading && (
          <div className="py-20 text-center font-pixel text-xs text-brand-gold/50 animate-pulse">
            Loading the marketplace...
          </div>
        )}

        {!loading && data && (
          <div className="space-y-10">
            {data.tiers.map(({ tier, items }) => (
              <section key={tier}>
                <h2 className="mb-4 font-pixel text-xs uppercase tracking-wider text-brand-gold/70">{tier}</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {items.map((item) => (
                    <ItemCard key={item.id} item={item} state={stateFor(item)} onBuy={buy} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PurchaseSuccessBanner({ result, onDismiss }: { result: PurchaseResult; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false)

  const copyTxHash = async () => {
    try {
      await navigator.clipboard.writeText(result.txHash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable — the hash is still visible to copy manually */
    }
  }

  return (
    <div className="mb-8 flex flex-col gap-3 rounded-xl border border-stellar-green/40 bg-stellar-green/10 p-5">
      <div className="flex items-center justify-between">
        <span className="font-pixel text-xs text-stellar-green">NFT MINTED</span>
        <button
          type="button"
          onClick={onDismiss}
          className="font-pixel text-[10px] text-brand-gold/40 hover:text-brand-gold"
        >
          ✕
        </button>
      </div>
      <p className="font-sans text-sm text-brand-gold/80">
        You bought <strong className="text-brand-gold">{result.item.name}</strong> for {result.item.priceGems} gems.
      </p>
      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-brand-gold/60">
        <span className="rounded border border-stellar-teal/40 px-2 py-0.5 font-pixel text-[8px] uppercase text-stellar-teal">
          Testnet
        </span>
        <span className="truncate">{result.txHash}</span>
        <button
          type="button"
          onClick={() => void copyTxHash()}
          className="font-pixel text-[9px] text-brand-purple-light hover:text-brand-gold"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
