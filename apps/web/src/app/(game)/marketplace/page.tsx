import { MarketplaceView } from '@/components/marketplace/MarketplaceView'

/** Thin route wrapper — all state/fetching lives in the client component. */
export default function MarketplacePage() {
  return <MarketplaceView />
}
