import type { World } from '../curriculum/types'

/**
 * World 8 — Payment Realm. Payments and path payments: moving value across
 * assets and borders in a single transaction.
 * Facts sourced from https://developers.stellar.org/docs.
 */
export const world8: World = {
  id: 'world-8-payment-realm',
  slug: 'payment-realm',
  title: 'Payment Realm',
  subtitle: 'Value that crosses any border',
  description:
    'Journey through the Payment Realm, where a single transaction can send one asset and deliver another. Master simple payments and the path payments that power cross-border settlement.',
  theme: 'castle-dungeon',
  order: 8,
  xpReward: 500,
  bossName: 'The Toll Collector',
  bossDescription:
    'It blocks every bridge with needless fees. Understand path payments and it stands aside.',
  quests: [
    {
      id: 'w8-q1-path-payments',
      worldId: 'world-8-payment-realm',
      slug: 'path-payments',
      title: 'Path Payments',
      description: 'Send one asset, deliver another — atomically.',
      type: 'lesson',
      order: 1,
      xpReward: 50,
      estimatedMinutes: 6,
      content: [
        {
          type: 'text',
          content:
            '## One Transaction, Two Assets\n\nA **path payment** lets the sender pay in one asset while the recipient receives another. The network finds a **path** through the DEX and pools to convert between them — all atomically.',
        },
        {
          type: 'callout',
          variant: 'info',
          content:
            'This is how cross-border works: send USD-anchor tokens, the recipient receives EUR-anchor tokens, conversion happens on-ledger in the same transaction.',
        },
        {
          type: 'text',
          content:
            '## Strict Send vs Strict Receive\n\n**Path Payment Strict Send** fixes the amount sent; **Strict Receive** fixes the amount delivered. You choose which side to guarantee.\n\n*Source: https://developers.stellar.org/docs/learn/encyclopedia/transactions-specialized/path-payments*',
        },
      ],
    },
  ],
}
