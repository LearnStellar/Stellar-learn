# Stellar Learn

> Learn Stellar blockchain development through an open-source 2D pixel-art adventure game.

[![CI](https://github.com/noevidence1017/Stellar-learn/actions/workflows/ci.yml/badge.svg)](https://github.com/noevidence1017/Stellar-learn/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-7b5ea7.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](packages/config/typescript/)
[![Stellar: Testnet](https://img.shields.io/badge/Stellar-Testnet-08B5E5.svg)](https://developers.stellar.org)

Stellar Learn is a **free, open-source gamified platform** that takes developers from blockchain fundamentals to building real applications on the Stellar network. Players explore retro pixel worlds, complete interactive lessons, test their knowledge with comprehension quizzes, solve live testnet challenges in an integrated Monaco code editor, and face boss encounters that unlock subsequent worlds.

---

## Gameplay Loop

```
  ┌─────────────────────────────────────────────────────────┐
  │                   1. World Exploration                  │
  │      Move across pixel maps, discover quest shrines     │
  └────────────────────────────┬────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │                   2. Teach-Then-Test                    │
  │  • Step-by-step reading with progress indicators        │
  │  • 70% passing threshold quizzes with instant retry     │
  │  • Monaco sandbox with live Stellar testnet validation  │
  └────────────────────────────┬────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │                   3. Boss Encounter                     │
  │  Face the World Boss: score ratio triggers victory,     │
  │  awards gems, and unlocks the next world in sequence    │
  └────────────────────────────┬────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │               4. Marketplace & Progression              │
  │  Equip earned swords, shields, hats, and titles;        │
  │  guest progress migrates seamlessly upon account signup │
  └─────────────────────────────────────────────────────────┘
```

---

## Curriculum & World Status

| World                        | Environment | Stellar Concepts                                                                 | Status                         |
| ---------------------------- | ----------- | -------------------------------------------------------------------------------- | ------------------------------ |
| **World 1: Origin Plains**   | 🌲 Forest   | Distributed ledgers, consensus, Lumens (XLM), Horizon API                        | **Complete** (5 Quests + Boss) |
| **World 2: Wallet Kingdom**  | 🏰 Castle   | Ed25519 keypairs, account funding, Friendbot, Freighter wallet, Multi-sig        | **Complete** (5 Quests + Boss) |
| **World 3: Asset Forge**     | ⚒️ Dungeon  | Custom asset codes, trustline authorization, asset minting, CAP-0035 clawback    | **Complete** (5 Quests + Boss) |
| **World 4: Trading Bazaar**  | ⛰️ Mountain | Stellar Decentralized Exchange (SDEX), order books, path payments, AMM liquidity | In Progress                    |
| **World 5: Payment Realm**   | 💫 Citadel  | Cross-border payments, SEP-0024 anchors, compliance flags, fee optimization      | In Progress                    |
| **World 6: Soroban Citadel** | 🏯 Sanctum  | Rust smart contracts, Soroban environment, token contract deployment             | In Progress                    |

---

## Monorepo Architecture

Stellar Learn uses **Turborepo** and **npm workspaces** to decouple the game engine, blockchain logic, curriculum, and web application:

```
stellar-learn/
├── apps/
│   └── web/                   # Next.js 16 (React 19, Tailwind CSS, App Router)
│       └── src/
│           ├── app/           # Game routes, API endpoints, and auth flows
│           ├── components/    # GameCanvas, QuestPanel, HUD, MarketplaceView
│           └── lib/           # Zod schemas, testnet runners, local progress
├── packages/
│   ├── content/               # Declarative curriculum, quests, and world progression
│   ├── game-engine/           # Phaser 3 scenes, render systems, and typed event bus
│   ├── stellar-sdk/           # @stellar/stellar-sdk helpers, item minting, contracts
│   ├── database/              # Prisma schema, migrations, and seed scripts
│   └── config/                # Shared TypeScript configuration
├── .github/                   # CI workflow, issue templates, PR template
├── CONTRIBUTING.md            # Contributor onboarding and authoring guidelines
├── CODE_OF_CONDUCT.md         # Contributor Covenant v2.1
├── SECURITY.md                # Responsible vulnerability disclosure policy
└── LICENSE                    # MIT License
```

---

## Getting Started

### Prerequisites

- **Node.js**: `>= 22.12.0` (Use `nvm use` to select from `.nvmrc`)
- **npm**: `>= 10.0.0`
- **Git**

### Installation

```bash
# 1. Clone repository
git clone https://github.com/noevidence1017/Stellar-learn.git
cd Stellar-learn

# 2. Install monorepo dependencies
npm install

# 3. Configure local environment variables
cp .env.example .env.local

# 4. Generate Prisma client
npm run db:generate

# 5. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to start playing immediately. Guests can explore and complete quests without authentication; progress is stored locally and migrated automatically upon signing up.

---

## Environment Variables

Copy `.env.example` to `.env.local` to configure your environment:

| Variable                            | Description                          | Default / Example                                     |
| ----------------------------------- | ------------------------------------ | ----------------------------------------------------- |
| `DATABASE_URL`                      | PostgreSQL connection string         | `postgresql://user:pass@localhost:5432/stellar_learn` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk authentication publishable key | `pk_test_...`                                         |
| `CLERK_SECRET_KEY`                  | Clerk backend secret key             | `sk_test_...`                                         |
| `NEXT_PUBLIC_STELLAR_NETWORK`       | Stellar network environment          | `testnet`                                             |
| `NEXT_PUBLIC_STELLAR_HORIZON_URL`   | Horizon API endpoint                 | `https://horizon-testnet.stellar.org`                 |
| `NEXT_PUBLIC_APP_URL`               | Public application URL               | `http://localhost:3000`                               |
| `UPSTASH_REDIS_REST_URL`            | Redis URL for leaderboard caching    | `https://...upstash.io`                               |
| `UPSTASH_REDIS_REST_TOKEN`          | Redis authorization token            | `...`                                                 |

---

## Application Routes

| Route                              | Description                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/world/[worldId]/level/[levelId]` | **Primary Game Route**: Mounts Phaser `GameCanvas`, interactive `QuestPanel`, and real-time HUD. |
| `/dashboard`                       | World navigation dashboard with progression badges, XP summary, and unlock statuses.             |
| `/marketplace`                     | In-game item shop to buy and equip hats, armor, swords, and titles using earned gems.            |
| `/playground`                      | Standalone Soroban Rust smart contract playground with compiler feedback.                        |
| `/avatar`                          | Character customization and equipment inventory view.                                            |
| `/game`                            | Entry redirect taking new or returning players directly to their latest unlocked level.          |

---

## Development Verification

Run the full verification suite before committing:

```bash
# Verify code formatting
npm run format:check

# Format files automatically
npm run format

# Run ESLint across all workspaces
npm run lint

# Run TypeScript compiler checks
npm run typecheck

# Run Vitest test suites (259 passing tests)
npm run test

# Build production Next.js application
npm run build
```

---

## Contributing

We welcome contributions across curriculum authoring, game mechanics, frontend UI, and Stellar integrations.
Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting a pull request.

---

## License

This project is licensed under the [MIT License](LICENSE).
