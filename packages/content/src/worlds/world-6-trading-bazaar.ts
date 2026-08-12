import type { World } from '../curriculum/types'

/**
 * World 6 — Trading Bazaar. The Stellar DEX: offers, the order book and how
 * assets change hands on-ledger.
 * Facts sourced from https://developers.stellar.org/docs.
 */
export const world6: World = {
  id: 'world-6-trading-bazaar',
  slug: 'trading-bazaar',
  title: 'Trading Bazaar',
  subtitle: 'Where offers meet on the ledger',
  description:
    'Haggle through the Trading Bazaar and learn the built-in Stellar decentralized exchange — placing offers, reading the order book, and letting the ledger match buyers to sellers.',
  theme: 'mountain',
  order: 6,
  xpReward: 500,
  bossName: 'The Spread Stalker',
  bossDescription:
    'A trickster who profits from confusion. Understand offers and the order book to see through it.',
  quests: [
    {
      id: 'w6-q1-sdex',
      worldId: 'world-6-trading-bazaar',
      slug: 'the-stellar-dex',
      title: 'The Stellar DEX',
      description: 'A decentralized exchange built into the protocol itself.',
      type: 'lesson',
      order: 1,
      xpReward: 50,
      estimatedMinutes: 6,
      content: [
        {
          type: 'text',
          content:
            '## Trading Without a Middleman\n\nStellar has a **decentralized exchange (SDEX)** built directly into the ledger. Anyone can post an **offer** to buy or sell one asset for another, and the network matches offers automatically.',
        },
        {
          type: 'callout',
          variant: 'info',
          content:
            'An **offer** says: "I will give up to X of asset A for asset B at price P." Offers rest in the **order book** until matched or cancelled.',
        },
        {
          type: 'text',
          content:
            '## The Order Book\n\nEach asset pair has an order book of resting offers, sorted by price. A new offer that crosses the spread executes immediately; otherwise it waits.\n\n*Source: https://developers.stellar.org/docs/learn/fundamentals/stellar-net#decentralized-exchange*',
        },
      ],
    },
  ],
}
