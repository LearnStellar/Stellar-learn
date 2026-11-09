# Contributing to Stellar Learn

Thank you for wanting to help build the open-source blockchain learning adventure!
This guide will get you from zero to your first merged pull request.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Project Architecture](#project-architecture)
- [Local Development Setup](#local-development-setup)
- [Development Workflow](#development-workflow)
- [Authoring Curriculum Content](#authoring-curriculum-content)
- [Game Engine & Phaser Integration](#game-engine--phaser-integration)
- [Coding Standards & Verification](#coding-standards--verification)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Security Disclosures](#security-disclosures)

---

## Code of Conduct

All contributors and participants are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any violations to `noevidence1017@gmail.com`.

---

## Ways to Contribute

You don't need to be a blockchain core developer to make a high-impact contribution:

| Domain                 | What You Can Work On                                                 | Primary Workspace                             |
| ---------------------- | -------------------------------------------------------------------- | --------------------------------------------- |
| 📝 **Curriculum**      | Author lessons, quizzes, and testnet challenges for Worlds 4–6       | `packages/content/`                           |
| 🎮 **Game Engine**     | Phaser scenes, boss mechanics, character animations, tilemap systems | `packages/game-engine/`                       |
| 💻 **Web Application** | React 19 UI, Monaco editor integration, accessibility, HUD state     | `apps/web/`                                   |
| ⛓️ **Stellar SDK**     | Soroban contract templates, transaction helpers, testnet faucets     | `packages/stellar-sdk/`                       |
| 🗄️ **Database & API**  | Prisma schemas, transaction idempotency, leaderboard caches          | `packages/database/`, `apps/web/src/app/api/` |
| 🎨 **Art & Audio**     | Pixel art sprites, tilesets, sound effects (MIT compatible)          | `apps/web/public/assets/`                     |

---

## Project Architecture

Stellar Learn is organized as a Turborepo monorepo with strict package boundaries:

```
stellar-learn/
├── apps/
│   └── web/                    # Next.js 16 (React 19, Tailwind, App Router)
│       └── src/
│           ├── app/            # API routes and application pages
│           ├── components/     # UI and game canvas wrappers
│           └── lib/            # Schemas, client state, and API utilities
├── packages/
│   ├── content/                # Declarative curriculum, quests, and worlds
│   │   └── src/worlds/         # Individual world definitions (Worlds 1–6)
│   ├── game-engine/            # Phaser 3 scenes, systems, and typed event bus
│   ├── stellar-sdk/            # Stellar Horizon & Soroban integration utilities
│   ├── database/               # Prisma ORM schema and database client
│   └── config/                 # Shared TypeScript configurations
└── docs/                       # Architectural specifications and standards
```

---

## Local Development Setup

### Prerequisites

- **Node.js**: `>= 22.12.0` (`.nvmrc` is included)
- **npm**: `>= 10.0.0`
- **Git**

### Step-by-Step

```bash
# 1. Clone the repository
git clone https://github.com/noevidence1017/Stellar-learn.git
cd Stellar-learn

# 2. Install workspace dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Set DATABASE_URL and test keys if running database/auth locally

# 4. Generate Prisma client
npm run db:generate

# 5. Start development server
npm run dev
# Open http://localhost:3000
```

---

## Development Workflow

Before submitting changes, ensure your branch passes all monorepo checks:

```bash
# Format check
npm run format:check

# Format files automatically
npm run format

# Run linter across all packages
npm run lint

# Run typecheck across all packages
npm run typecheck

# Run test suites across all workspaces
npm run test

# Verify production build
npm run build
```

---

## Authoring Curriculum Content

Curriculum content lives in `packages/content/src/worlds/`.

### Quest Types

1. **`LESSON`**: Conceptual reading broken down into guided step-by-step reading sections with markdown support.
2. **`QUIZ`**: Multiple-choice comprehension questions evaluated against a 70% passing threshold.
3. **`CHALLENGE`**: Testnet interactive code execution inside Monaco Editor.

### Adding or Expanding a World

1. Define your world in `packages/content/src/worlds/world-<number>-<slug>.ts` conforming to the `World` interface.
2. Register the world in `packages/content/src/worlds/index.ts`.
3. Add verification tests in `packages/content/src/worlds/registry.test.ts`.

---

## Game Engine & Phaser Integration

The game engine (`packages/game-engine`) renders game worlds using Phaser 3 while delegating application state and UI to React:

- **Decoupled Architecture**: Never directly access React DOM from inside Phaser scenes.
- **Typed Event Bus**: Use the typed event dispatcher from `packages/game-engine/src/events.ts` to communicate between scenes and React containers:
  - `questSelected`
  - `bossResolved`
  - `statsUpdated`
- **Asset Registration**: New sprites and tilesets must be declared in `ART_MANIFEST` in `packages/game-engine/src/config.ts`.

---

## Coding Standards & Verification

- **TypeScript**: Strict mode is enabled monorepo-wide. Avoid `any`; use strongly-typed models and Zod schemas.
- **Input Validation**: All API routes must validate request payloads using Zod schemas (`apps/web/src/lib/schemas.ts`).
- **Error Handling**: Use the unified response envelope (`apps/web/src/lib/api.ts`) with correlation IDs.
- **Transactions**: State mutations involving currency (gems) or ownership (items) must execute within database transactions with concurrency guards.

---

## Pull Request Guidelines

1. **Focused Scope**: Keep PRs focused on a single feature, world, or fix.
2. **Descriptive Commits**: Use Conventional Commits format (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `ci:`).
3. **All Gates Green**: Ensure `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm run test` pass.
4. **Issue Linkage**: Reference any related issue (e.g., `Closes #42`).

---

## Security Disclosures

If you discover a security vulnerability, please refer to our [Security Policy](SECURITY.md) and report it privately to `noevidence1017@gmail.com`.
