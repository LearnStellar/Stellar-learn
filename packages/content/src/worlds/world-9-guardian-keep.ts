import type { World } from '../curriculum/types'

/**
 * World 9 — Guardian Keep. Multisignature, thresholds and account security.
 * Facts sourced from https://developers.stellar.org/docs.
 */
export const world9: World = {
  id: 'world-9-guardian-keep',
  slug: 'guardian-keep',
  title: 'Guardian Keep',
  subtitle: 'No single key to rule them all',
  description:
    'Fortify the Guardian Keep and learn to protect accounts with multiple signers, weighted thresholds, and the operations that lock a key away for good.',
  theme: 'castle',
  order: 9,
  xpReward: 500,
  bossName: 'The Skeleton Key',
  bossDescription:
    'A thief who preys on lone keys. Multisig and thresholds strip it of its power.',
  quests: [
    {
      id: 'w9-q1-multisig',
      worldId: 'world-9-guardian-keep',
      slug: 'multisig-and-thresholds',
      title: 'Multisig & Thresholds',
      description: 'Require more than one signature to move funds.',
      type: 'lesson',
      order: 1,
      xpReward: 50,
      estimatedMinutes: 7,
      content: [
        {
          type: 'text',
          content:
            '## Many Signers, One Account\n\nA Stellar account can have **multiple signers**, each with a **weight**. An operation only succeeds when the signatures on the transaction meet the account’s **threshold**.',
        },
        {
          type: 'callout',
          variant: 'info',
          content:
            'Operations are graded **low / medium / high**. Set the high threshold above any single signer’s weight to require, say, 2-of-3 approval for sensitive changes.',
        },
        {
          type: 'callout',
          variant: 'warning',
          content:
            'Stellar operations are irreversible. Multisig is your safety net against a single compromised key.',
        },
      ],
    },
  ],
}
