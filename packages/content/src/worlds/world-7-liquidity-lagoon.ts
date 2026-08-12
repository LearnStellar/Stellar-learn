import type { World } from '../curriculum/types'

/**
 * World 7 — Liquidity Lagoon. Liquidity pools and automated market making on
 * Stellar.
 * Facts sourced from https://developers.stellar.org/docs.
 */
export const world7: World = {
  id: 'world-7-liquidity-lagoon',
  slug: 'liquidity-lagoon',
  title: 'Liquidity Lagoon',
  subtitle: 'Pools that trade themselves',
  description:
    'Wade into the Liquidity Lagoon, where pooled assets trade automatically. Learn how liquidity pools price swaps, where the fees go, and what impermanent loss really means.',
  theme: 'mountain',
  order: 7,
  xpReward: 500,
  bossName: 'The Slippage Serpent',
  bossDescription:
    'It grows fat on bad trades. Grasp how pools price swaps and it loses its bite.',
  quests: [
    {
      id: 'w7-q1-pools',
      worldId: 'world-7-liquidity-lagoon',
      slug: 'liquidity-pools',
      title: 'Liquidity Pools',
      description: 'How a pool of two assets becomes an automatic market.',
      type: 'lesson',
      order: 1,
      xpReward: 50,
      estimatedMinutes: 6,
      content: [
        {
          type: 'text',
          content:
            '## Automated Market Making\n\nA **liquidity pool** holds a reserve of two assets. Instead of matching buyers and sellers, it prices swaps from the **ratio** of what it holds — an automated market maker (AMM).',
        },
        {
          type: 'callout',
          variant: 'info',
          content:
            'Providers deposit both assets and earn a share of the **swap fees**. In return they take on **impermanent loss** when prices move.',
        },
        {
          type: 'text',
          content:
            '## Pools Complement the Order Book\n\nStellar routes trades across both the order book and pools to find the best price, so pools deepen liquidity for everyone.\n\n*Source: https://developers.stellar.org/docs/learn/encyclopedia/sdex/liquidity-on-stellar-sdex-liquidity-pools*',
        },
      ],
    },
  ],
}
