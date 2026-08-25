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
      id: 'w8-q1-send-testnet-payment',
      worldId: 'world-8-payment-realm',
      slug: 'send-testnet-payment',
      title: 'First Testnet Payment',
      description: 'Send 5 XLM to a fresh account on Stellar testnet.',
      type: 'challenge',
      order: 1,
      xpReward: 50,
      estimatedMinutes: 6,
      content: {
        description:
          'Fund runner-provided sender and recipient accounts, then send at least 5 native XLM. Passing is based on the recipient\'s real on-chain balance change.',
        starterCode: `// The runner keeps all temporary testnet secrets private.
await stellar.fundAccount('sender')
await stellar.fundAccount('recipient')

await stellar.sendPayment({
  from: 'sender',
  to: 'recipient',
  amount: '5',
})`,
        validationRules: [
          {
            type: 'tx_success',
            params: { transaction: 'sendPayment' },
            errorMessage: 'Send a native XLM payment with stellar.sendPayment.',
          },
          {
            type: 'balance_check',
            params: { account: 'recipient', assetCode: 'XLM', minimumDelta: '5' },
            errorMessage: 'The recipient needs at least 5 XLM more than its starting balance.',
          },
        ],
        hints: [
          'Use stellar.fundAccount first so both temporary accounts exist on testnet.',
          'Send from "sender" to the recipient label exactly as "recipient".',
          'A sendPayment call without an asset code sends native XLM; use an amount of "5" or more.',
        ],
        testnetRequired: true,
      },
    },
  ],
}
