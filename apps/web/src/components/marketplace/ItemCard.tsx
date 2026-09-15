import type { MarketplaceItem, ItemTier } from '@stellar-learn/content/marketplace'

export type PurchaseState = 'idle' | 'purchasing' | 'owned' | 'not-enough-gems'

const TIER_STYLE: Record<ItemTier, { border: string; text: string; glow: string }> = {
  rare: { border: 'border-stellar-teal/50', text: 'text-stellar-teal', glow: 'shadow-[0_0_16px_-4px_rgba(0,188,212,0.6)]' },
  epic: { border: 'border-brand-purple-light/60', text: 'text-brand-purple-light', glow: 'shadow-[0_0_16px_-4px_rgba(155,126,199,0.6)]' },
  legendary: { border: 'border-brand-gold-bright/60', text: 'text-brand-gold-bright', glow: 'shadow-[0_0_16px_-4px_rgba(255,215,0,0.6)]' },
  mythic: { border: 'border-red-400/60', text: 'text-red-400', glow: 'shadow-[0_0_18px_-4px_rgba(248,113,113,0.7)]' },
}

interface ItemCardProps {
  item: MarketplaceItem
  state: PurchaseState
  onBuy: (itemId: string) => void
}

/**
 * One catalog item, rendered generically from its data — no `if (item.id === ...)`
 * anywhere. Shield previews are .jpg and everything else is .png; the <img>
 * tag doesn't care, so there is no extension-based branching here either.
 */
export function ItemCard({ item, state, onBuy }: ItemCardProps) {
  const style = TIER_STYLE[item.tier]

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border bg-brand-dark-2/70 ${style.border} ${style.glow}`}
    >
      <div className="flex aspect-square items-center justify-center bg-brand-dark-3 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- flat catalog art, mixed png/jpg, rendered identically */}
        <img
          src={item.asset}
          alt={item.name}
          className="h-full w-full object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className={`font-pixel text-[8px] uppercase tracking-wider ${style.text}`}>{item.tier}</div>
        <div className="font-pixel text-xs text-brand-gold">{item.name}</div>
        <div className="font-sans text-[11px] capitalize text-brand-gold/50">{item.category}</div>
        {item.description && (
          <p className="font-sans text-[11px] leading-relaxed text-brand-gold/60">{item.description}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-pixel text-[10px] text-brand-gold-bright">{item.priceGems} GEMS</span>
          <BuyButton item={item} state={state} onBuy={onBuy} />
        </div>
      </div>
    </div>
  )
}

function BuyButton({ item, state, onBuy }: ItemCardProps) {
  if (state === 'owned') {
    return <span className="font-pixel text-[9px] text-stellar-green">OWNED</span>
  }
  if (state === 'purchasing') {
    return (
      <button type="button" disabled className="btn-pixel text-[9px] opacity-60">
        PURCHASING...
      </button>
    )
  }
  if (state === 'not-enough-gems') {
    return (
      <button type="button" disabled className="btn-pixel cursor-not-allowed text-[9px] opacity-40">
        NOT ENOUGH GEMS
      </button>
    )
  }
  return (
    <button type="button" onClick={() => onBuy(item.id)} className="btn-pixel text-[9px]">
      BUY {item.priceGems} GEMS
    </button>
  )
}
