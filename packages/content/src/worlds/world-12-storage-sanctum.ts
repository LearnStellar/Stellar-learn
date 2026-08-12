import type { World } from '../curriculum/types'

/**
 * World 12 — Storage Sanctum. Soroban contract storage: instance, persistent and
 * temporary data, TTL, and events.
 * Facts sourced from https://developers.stellar.org/docs/build/smart-contracts.
 */
export const world12: World = {
  id: 'world-12-storage-sanctum',
  slug: 'storage-sanctum',
  title: 'Storage Sanctum',
  subtitle: 'What a contract remembers',
  description:
    'Descend into the Storage Sanctum and learn how Soroban contracts keep state — the three storage types, why entries expire, how to extend their time-to-live, and how events broadcast what happened.',
  theme: 'dungeon',
  order: 12,
  xpReward: 600,
  bossName: 'The Reaper of TTL',
  bossDescription:
    'It archives whatever you forget to renew. Master TTL and your state survives its scythe.',
  quests: [
    {
      id: 'w12-q1-storage-types',
      worldId: 'world-12-storage-sanctum',
      slug: 'storage-types-and-ttl',
      title: 'Storage Types & TTL',
      description: 'Instance, persistent, temporary — and why entries expire.',
      type: 'lesson',
      order: 1,
      xpReward: 60,
      estimatedMinutes: 8,
      content: [
        {
          type: 'text',
          content:
            '## Three Kinds of Storage\n\n- **Instance** — small state tied to the contract instance (config, admin).\n- **Persistent** — long-lived per-key state (balances).\n- **Temporary** — cheap, short-lived state that can be safely lost.',
        },
        {
          type: 'callout',
          variant: 'info',
          content:
            'Every entry has a **TTL (time-to-live)**. Let it lapse and the entry is archived. Contracts **extend the TTL** to keep important state alive — this is how Soroban keeps rent honest.',
        },
        {
          type: 'text',
          content:
            '## Events\n\nContracts publish **events** to announce what happened (a transfer, a mint). Off-chain services subscribe to events instead of re-reading state.\n\n*Source: https://developers.stellar.org/docs/build/smart-contracts/getting-started/storing-data*',
        },
      ],
    },
  ],
}
