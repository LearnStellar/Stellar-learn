import type { World } from '../curriculum/types'

/**
 * World 5 — Anchor Anchorage. Anchors, SEPs and real-world assets: how fiat and
 * off-chain value bridge onto Stellar.
 * Facts sourced from https://developers.stellar.org/docs.
 */
export const world5: World = {
  id: 'world-5-anchor-anchorage',
  slug: 'anchor-anchorage',
  title: 'Anchor Anchorage',
  subtitle: 'Where the real world comes aboard',
  description:
    'Dock at Anchor Anchorage, where trusted anchors bridge banks and blockchains — issuing fiat-backed tokens and honouring deposits and withdrawals through the SEP standards.',
  theme: 'castle-dungeon',
  order: 5,
  xpReward: 500,
  bossName: 'The Custodian',
  bossDescription:
    'Keeper of the harbour vaults. It only lifts the gate for those who understand anchors and trust.',
  quests: [
    {
      id: 'w5-q1-anchors',
      worldId: 'world-5-anchor-anchorage',
      slug: 'what-is-an-anchor',
      title: 'What Is an Anchor?',
      description: 'The bridge between Stellar and traditional finance.',
      type: 'lesson',
      order: 1,
      xpReward: 50,
      estimatedMinutes: 6,
      content: [
        {
          type: 'text',
          content:
            '## Bridging Two Worlds\n\n**Anchors** are trusted entities — banks, fintechs, money-service businesses — that hold real value in reserve and issue equivalent tokens on Stellar. A fiat-backed stablecoin like USDC is issued by an anchor.',
        },
        {
          type: 'callout',
          variant: 'info',
          content:
            '**SEPs** (Stellar Ecosystem Proposals) standardise how wallets and anchors talk. **SEP-24** is the interactive deposit/withdrawal flow (with KYC); **SEP-6** is the programmatic one.',
        },
        {
          type: 'text',
          content:
            "## Trust Is the Point\n\nWhen you hold an anchor's token you trust it to keep the 1:1 backing and honour withdrawals. That trust is what gives the digital token its real-world value.\n\n*Source: https://developers.stellar.org/docs/learn/fundamentals/anchors*",
        },
      ],
    },
  ],
}
