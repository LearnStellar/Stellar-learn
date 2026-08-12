import type { World } from '../curriculum/types'

/**
 * World 10 — Soroban Gateway. The entrance to Stellar's smart-contract platform:
 * what Soroban is, WASM, and the contract lifecycle.
 * Facts sourced from https://developers.stellar.org/docs/build/smart-contracts.
 */
export const world10: World = {
  id: 'world-10-soroban-gateway',
  slug: 'soroban-gateway',
  title: 'Soroban Gateway',
  subtitle: 'Where code becomes law',
  description:
    'Pass through the Soroban Gateway into Stellar smart contracts. Learn what Soroban is, why it compiles to WebAssembly, and the lifecycle a contract travels from source to on-chain.',
  theme: 'citadel',
  order: 10,
  xpReward: 600,
  bossName: 'The Null Pointer',
  bossDescription:
    'A glitch-spirit of undefined behaviour. Understand the contract lifecycle and it resolves to nothing.',
  quests: [
    {
      id: 'w10-q1-what-is-soroban',
      worldId: 'world-10-soroban-gateway',
      slug: 'what-is-soroban',
      title: 'What Is Soroban?',
      description: "Stellar's smart-contract platform, in plain terms.",
      type: 'lesson',
      order: 1,
      xpReward: 60,
      estimatedMinutes: 7,
      content: [
        {
          type: 'text',
          content:
            '## Smart Contracts on Stellar\n\n**Soroban** is Stellar’s smart-contract platform. Contracts are written in **Rust**, compiled to **WebAssembly (WASM)**, and deployed to the network where anyone can invoke them.',
        },
        {
          type: 'callout',
          variant: 'info',
          content:
            'WASM is compact, fast, and sandboxed — it runs the same way on every node, which is exactly what a blockchain needs.',
        },
        {
          type: 'text',
          content:
            '## The Lifecycle\n\n1. **Write** the contract in Rust.\n2. **Build** it to a `.wasm` file.\n3. **Upload** the WASM and **deploy** an instance.\n4. **Invoke** its functions from a client or another contract.\n\n*Source: https://developers.stellar.org/docs/build/smart-contracts/getting-started*',
        },
      ],
    },
  ],
}
