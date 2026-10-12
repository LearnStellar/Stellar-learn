# Contributing to Stellar Learn

Thank you for wanting to help build the best blockchain learning platform in the world!
This guide will get you from zero to first pull request in under 30 minutes.

## Table of Contents
- [Ways to Contribute](#ways-to-contribute)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Development Workflow](#development-workflow)
- [Contribution Areas](#contribution-areas)
- [Code Style](#code-style)
- [PR Guidelines](#pr-guidelines)
- [Community](#community)

---

## Ways to Contribute

You don't need to be a developer to contribute:

| Type | Examples |
|---|---|
| 📝 **Content** | Write lessons, quiz questions, challenge specs for Worlds 2–6 |
| 🎮 **Game** | Build Phaser scenes, player mechanics, boss animations |
| 💻 **Frontend** | React components, UI improvements, accessibility |
| ⛓️ **Stellar** | Stellar SDK utilities, Soroban contract examples, testnet tools |
| 🐛 **Bugs** | Fix issues, improve error messages |
| 📖 **Docs** | Improve this file, write architecture docs |
| 🌍 **Translation** | Translate lesson content to other languages |
| 🎨 **Art** | Pixel art sprites, tilesets, UI assets |

---

## Project Structure

```
stellar-learn/
├── apps/
│   └── web/                    # Next.js app (main website)
│       └── src/
│           ├── app/            # Routes (App Router)
│           ├── components/
│           │   ├── game/       # Phaser integration, quest panels
│           │   └── ui/         # Reusable UI components
│           └── lib/            # Helpers (auth, progress, leaderboard)
│
├── packages/
│   ├── content/                # ⭐ ALL lesson content lives here
│   │   └── src/worlds/         # One file per world
│   ├── game-engine/            # Phaser scenes & game systems
│   ├── stellar-sdk/            # Stellar network utilities
│   ├── database/               # Prisma schema
│   └── config/                 # Shared TypeScript config
│
└── docs/                       # Architecture & design docs
```

### Most Wanted Contributions

The highest-impact area right now is **content**. We need:

- `packages/content/src/worlds/world-2-wallet-kingdom.ts`
- `packages/content/src/worlds/world-3-asset-forge.ts`
- `packages/content/src/worlds/world-4-trading-bazaar.ts`
- `packages/content/src/worlds/world-5-payment-realm.ts`
- `packages/content/src/worlds/world-6-soroban-citadel.ts`

Each world needs **5 lesson quests + 1 quiz quest**.
See `world-1-origin-plains.ts` as the template. It's the most impactful single file you can contribute.

---

## Setup

### Prerequisites
- Node.js 22.12+ (`nvm use` reads `.nvmrc`)
- npm 10+
- Git

### Steps

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/Stellar-learn.git
cd Stellar-learn

# 2. Install all dependencies (monorepo — one command installs everything)
npm install

# 3. Copy environment variables
cp .env.example .env.local
# Fill in at minimum: DATABASE_URL, CLERK keys

# 4. Generate the Prisma client
npm run db:generate

# 5. Push the schema to your database
npm run db:push

# 6. Start the dev server
npm run dev
# → App at http://localhost:3000
```

---

## Development Workflow

```bash
# Run everything
npm run dev

# Run only the web app
cd apps/web && npm run dev

# Type check everything
npm run typecheck

# Lint everything
npm run lint

# Run tests
npm run test
```

### Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/short-description` | `feat/world-2-content` |
| Bug fix | `fix/short-description` | `fix/quiz-answer-state` |
| Content | `content/world-N-slug` | `content/world-3-asset-forge` |
| Docs | `docs/short-description` | `docs/game-engine-readme` |

---

## Contribution Areas

### Adding a New World (Content)

1. Copy `packages/content/src/worlds/world-1-origin-plains.ts`
2. Rename it to your world (e.g., `world-2-wallet-kingdom.ts`)
3. Update all the content — follow the `World` type in `packages/content/src/curriculum/types.ts`
4. Register it in `packages/content/src/worlds/index.ts`
5. Submit a PR

**Resources for content:**
- https://developers.stellar.org/docs/learn/
- https://developers.stellar.org/docs/build/
- https://stellar.org/blog

### Contributing Art & Audio

All required assets — sprites, tilesets, maps, UI, effects, audio — are spec'd
with exact sizes, frame layouts, file paths and naming in
[`ASSETS.md`](ASSETS.md) and
[`apps/web/public/assets/sprites/README.md`](apps/web/public/assets/sprites/README.md).
Drop finished files into `apps/web/public/assets/...` and list new
character/enemy/boss ids in `ART_MANIFEST` in
`packages/game-engine/src/config.ts` so the engine loads them. The current
sprites are procedurally generated — `npm run sprites:generate` rebuilds them,
and hand-drawn replacements matching the same frame layouts are very welcome.
**Only commit assets we may redistribute under MIT**, or link the source
instead.

### Adding a Game Scene

1. Create your scene in `packages/game-engine/src/scenes/`
2. Extend `Phaser.Scene`
3. Export it from `packages/game-engine/src/index.ts`
4. Use `this.game.events.emit('event-name', data)` to communicate with React

### Adding a UI Component

1. Add it to `packages/ui/src/components/`
2. Export from `packages/ui/src/index.ts`
3. Write a Storybook story in `packages/ui/src/stories/`

---

## Code Style

> **Read [`docs/TECH-STACK.md`](docs/TECH-STACK.md) first.** It is the source of truth for approved libraries/versions and lists outdated patterns (e.g. `middleware.ts`, sync `auth()`, `<SignedIn>`) that will fail review.

- TypeScript strict mode — no `any`, no `!` unless unavoidable
- No comments unless the WHY is non-obvious
- No default exports except for Next.js page files
- Tailwind over custom CSS
- Functional components with hooks — no class components

Run `npm run lint` and `npm run typecheck` before every PR.

---

## PR Guidelines

- **One concern per PR.** Don't mix content + code + refactors.
- **Keep PRs small.** A single world's content is the ideal PR size.
- **Write a clear description.** Explain what you changed and why.
- **Link the relevant issue** if one exists.
- **Screenshots for UI changes.**

---

## Community

- **GitHub Discussions** — questions, ideas, RFCs
- **GitHub Issues** — bug reports, content requests
- Label your issues: `good-first-issue`, `content`, `game`, `stellar`, `frontend`

We're friendly here. Every contribution matters — even fixing a typo.

**Welcome to the quest.** 🗡️
