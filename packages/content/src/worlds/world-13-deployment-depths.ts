import type { World } from '../curriculum/types'

/**
 * World 13 — Deployment Depths. Building, optimizing and deploying a Soroban
 * contract to testnet with the Stellar CLI.
 * Facts sourced from https://developers.stellar.org/docs/build/smart-contracts.
 */
export const world13: World = {
  id: 'world-13-deployment-depths',
  slug: 'deployment-depths',
  title: 'Deployment Depths',
  subtitle: 'From source to on-chain',
  description:
    'Brave the Deployment Depths and ship a contract for real — build the WASM, optimize it, and deploy to testnet with the Stellar CLI, then read back its contract ID.',
  theme: 'mountain',
  order: 13,
  xpReward: 600,
  bossName: 'The Gas Golem',
  bossDescription:
    'Bloated and costly. Optimize your WASM and it shrinks down to size.',
  quests: [
    {
      id: 'w13-q1-deploy',
      worldId: 'world-13-deployment-depths',
      slug: 'build-and-deploy',
      title: 'Build & Deploy',
      description: 'Get a contract onto testnet with the Stellar CLI.',
      type: 'lesson',
      order: 1,
      xpReward: 60,
      estimatedMinutes: 8,
      content: [
        {
          type: 'text',
          content:
            '## From Rust to the Network\n\nThe **Stellar CLI** (`stellar`) builds your contract to WASM, uploads it, and deploys an instance you can invoke.',
        },
        {
          type: 'code',
          language: 'bash',
          content:
            'stellar contract build\nstellar contract deploy \\\n  --wasm target/wasm32-unknown-unknown/release/hello.wasm \\\n  --network testnet',
        },
        {
          type: 'callout',
          variant: 'tip',
          content:
            'Deploy returns a **contract ID** — the address you invoke. Always deploy to **testnet** first; it is funded by Friendbot and costs nothing.',
        },
      ],
    },
  ],
}
