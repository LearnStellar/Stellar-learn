import type { World } from '../curriculum/types'

/**
 * World 4 — Reserve Reach. Fees, base reserves, minimum balances and sequence
 * numbers: the economic rules every Stellar account lives by.
 * Full quiz banks and enemy encounters are layered in on the content days.
 * Facts sourced from https://developers.stellar.org/docs.
 */
export const world4: World = {
  id: 'world-4-reserve-reach',
  slug: 'reserve-reach',
  title: 'Reserve Reach',
  subtitle: 'The tax every account pays',
  description:
    'Cross the windswept ramparts of Reserve Reach and learn why every account must lock away a little XLM — the base reserve, the minimum balance, and the sequence numbers that keep transactions honest.',
  theme: 'castle',
  order: 4,
  xpReward: 500,
  bossName: 'The Reserve Warden',
  bossDescription:
    'A miser who hoards locked lumens. Prove you understand reserves and fees to pass its toll.',
  quests: [
    {
      id: 'w4-q1-base-reserve',
      worldId: 'world-4-reserve-reach',
      slug: 'base-reserve',
      title: 'The Base Reserve',
      description: 'Why must every account hold XLM it can never spend?',
      type: 'lesson',
      order: 1,
      xpReward: 50,
      estimatedMinutes: 6,
      content: [
        {
          type: 'text',
          content:
            "## The Reserve Tax\n\nEvery Stellar account must keep a **minimum balance** of XLM it cannot spend. It stops spammers from bloating the ledger with junk accounts. The unit is the **base reserve** — currently **0.5 XLM**.",
        },
        {
          type: 'callout',
          variant: 'info',
          content:
            'Minimum balance = **(2 + number of subentries) × base reserve**. A fresh account = 2 × 0.5 = **1 XLM**.',
        },
        {
          type: 'text',
          content:
            '## Subentries Cost Reserves\n\nEach **subentry** — a trustline, an open offer, an extra signer, a data entry — raises the minimum balance by one base reserve (0.5 XLM). Delete one and that XLM becomes spendable again.\n\n*Source: https://developers.stellar.org/docs/learn/fundamentals/lumens*',
        },
      ],
    },
  ],
}
