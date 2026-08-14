# Stellar Learn

> Learn Stellar blockchain development through 2D pixel-art adventure gameplay.

[![CI](https://github.com/noevidence1017/Stellar-learn/actions/workflows/ci.yml/badge.svg)](https://github.com/noevidence1017/Stellar-learn/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-7b5ea7.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Open Source](https://img.shields.io/badge/Open%20Source-❤️-red)](https://github.com/noevidence1017/Stellar-learn)

Stellar Learn is a **free, open-source gamified platform** that takes anyone from "what is blockchain?" to building real applications on the Stellar network — through a playable 2D pixel-art adventure game.

---

## The Concept

Navigate 6 themed worlds, each teaching a new layer of the Stellar ecosystem. Complete quests (lessons, quizzes, coding challenges). Battle bosses by proving your knowledge. Interact with the **real Stellar testnet** — create accounts, send XLM, issue assets, deploy smart contracts — all inside the game.

| World | Theme | Topic |
|---|---|---|
| 1. Origin Plains | 🌲 Forest | Blockchain fundamentals, Stellar, XLM |
| 2. Wallet Kingdom | 🏰 Castle | Accounts, keypairs, balances |
| 3. Asset Forge | ⚒️ Dungeon | Issuing assets, trustlines |
| 4. Trading Bazaar | ⛰️ Mountain | SDEX, swaps, liquidity pools |
| 5. Payment Realm | 💫 Castle Dungeon | Transactions, cross-border payments |
| 6. Soroban Citadel | 🏯 Final Boss | Smart contracts with Soroban |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Game Engine | Phaser.js 3 |
| Blockchain | @stellar/stellar-sdk + Stellar Testnet |
| Auth | Clerk |
| Database | PostgreSQL + Prisma (Neon) |
| Cache / Leaderboard | Upstash Redis |
| State | Zustand + TanStack Query |
| Styling | Tailwind CSS + Framer Motion |
| Monorepo | Turborepo + npm workspaces |

---

## Getting Started (Local Dev)

```bash
# Clone
git clone https://github.com/noevidence1017/Stellar-learn.git
cd Stellar-learn

# Install (monorepo — one command)
npm install

# Configure environment
cp .env.example .env.local
# Fill in DATABASE_URL and Clerk keys

# Set up database
npm run db:generate
npm run db:push

# Start dev server
npm run dev
# → http://localhost:3000
```

### Routes

| Route | What it is |
| --- | --- |
| `/world/[worldId]/level/[levelId]` | **The canonical play route.** Mounts the real Phaser game (`GameCanvas` → `LevelScene`), e.g. `/world/origin-plains/level/1`. |
| `/game` | Convenience entry point — redirects into World 1's first level. |
| `/dashboard` | World select for signed-in players; "Enter World" links into the play route. |
| `/design-preview` | Static CSS mockup of the pixel UI (menu, map, HUD). A style reference only — **not playable**. |

---

## Contributing

**We welcome contributions of all kinds.** With 6 worlds to build, there's a task for everyone:

- 📝 **Write lesson content** — the most impactful contribution right now
- 🎮 **Build game mechanics** — Phaser scenes, animations, boss battles
- 💻 **Frontend** — React components, UI, accessibility
- ⛓️ **Stellar integration** — SDK utilities, Soroban examples
- 🐛 **Bug fixes** — always needed
- 🌍 **Translations** — make it accessible to more learners

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

### Good First Issues

Look for the `good-first-issue` label on GitHub Issues.
The quickest path to your first merged PR: pick a world and write a quest in `packages/content/src/worlds/`.

---

## Project Structure

```
stellar-learn/
├── apps/web/              # Next.js app
├── packages/
│   ├── content/           # All lesson curriculum
│   ├── game-engine/       # Phaser.js scenes & systems
│   ├── stellar-sdk/       # Stellar network utilities
│   ├── database/          # Prisma schema
│   └── config/            # Shared configs
├── .github/               # CI, issue templates, PR template
├── CLAUDE.md              # AI assistant context
└── CONTRIBUTING.md        # Contributor guide
```

---

## Roadmap

- [ ] World 1: Origin Plains (complete)
- [ ] World 2: Wallet Kingdom
- [ ] World 3: Asset Forge
- [ ] World 4: Trading Bazaar
- [ ] World 5: Payment Realm
- [ ] World 6: Soroban Citadel
- [ ] Leaderboard
- [ ] NFT achievement certificates (minted on Stellar)
- [ ] Mobile-responsive game view
- [ ] Storybook component library
- [ ] i18n (multi-language support)
- [ ] **Study Groups** — players form small groups for cooperative study:
      shared progress, group quests/challenges, and a private group leaderboard.

### Planned: Study Groups

A social layer where a player can create or join a **study group** (think a guild
or party). Planned scope:

- Create a group with an invite code / link; members join and see each other.
- A **group dashboard** showing each member's world progress and combined XP.
- **Group challenges** — quests that unlock once enough members complete them,
  encouraging members to help one another.
- A **private group leaderboard** alongside the global one (Upstash Redis sorted
  sets, same pattern as the existing leaderboard).
- Optional **co-op boss battles** where group members' combined quiz scores power
  the fight.

This is a future feature — tracked here so contributors can design data models
(extend `packages/database/`) and APIs around it early. See also
[`ASSETS.md`](ASSETS.md) for the art a group UI would need (member avatars,
group badges).

---

## License

[MIT](LICENSE) — free forever.

---



