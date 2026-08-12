import type { World } from '../curriculum/types'

/**
 * World 11 — Contract Forge. Writing your first Soroban contract in Rust:
 * functions, types and the #[contract] macro.
 * Facts sourced from https://developers.stellar.org/docs/build/smart-contracts.
 */
export const world11: World = {
  id: 'world-11-contract-forge',
  slug: 'contract-forge',
  title: 'Contract Forge',
  subtitle: 'Hammer out your first contract',
  description:
    'At the Contract Forge you write real Soroban code. Learn the anatomy of a Rust contract — the contract macro, entry-point functions, and the types Soroban understands.',
  theme: 'citadel',
  order: 11,
  xpReward: 600,
  bossName: 'The Borrow Checker',
  bossDescription:
    'A stern gatekeeper of ownership. Write correct Rust and it grants you passage.',
  quests: [
    {
      id: 'w11-q1-first-contract',
      worldId: 'world-11-contract-forge',
      slug: 'your-first-contract',
      title: 'Your First Contract',
      description: 'The anatomy of a minimal Soroban contract.',
      type: 'lesson',
      order: 1,
      xpReward: 60,
      estimatedMinutes: 8,
      content: [
        {
          type: 'text',
          content:
            '## The Shape of a Contract\n\nA Soroban contract is a Rust struct marked with `#[contract]`, with its callable functions in an `impl` block marked `#[contractimpl]`. Each function takes an `Env` as its first argument.',
        },
        {
          type: 'code',
          language: 'rust',
          content:
            '#[contract]\npub struct HelloContract;\n\n#[contractimpl]\nimpl HelloContract {\n    pub fn hello(env: Env, to: Symbol) -> Symbol {\n        to\n    }\n}',
        },
        {
          type: 'callout',
          variant: 'tip',
          content:
            'Soroban has its own value types (`Symbol`, `Bytes`, `Vec`, `Map`) tuned for on-chain storage and cost — you don’t use arbitrary std types.',
        },
      ],
    },
  ],
}
