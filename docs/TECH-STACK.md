# Tech Stack & Conventions

> **This file is the source of truth for what we use.** If a tutorial, AI tool, or
> old PR says otherwise, this file wins. Last reviewed: October 2026.

## Approved stack

| Layer | Use | Version |
|---|---|---|
| Runtime | Node.js | **22.12+** (see `.nvmrc`) |
| Framework | Next.js App Router + TypeScript | **Next 16**, React 19, TS 5 |
| Bundler | Turbopack (Next 16 default) | — |
| Game engine | Phaser | 3.x |
| Blockchain | `@stellar/stellar-sdk` (testnet by default) | **17.x** |
| Auth | Clerk (`@clerk/nextjs`) | **7.x (Core 3)** |
| Database | PostgreSQL + Prisma (Neon in prod) | Prisma 5 |
| Leaderboard | Upstash Redis | 1.x |
| Styling | Tailwind CSS + Framer Motion | Tailwind 3, Framer Motion 14 |
| Icons | `lucide-react` | 1.x |
| Code editor | `@monaco-editor/react` | 4.7 |
| Lint | ESLint 9 flat config (`apps/web/eslint.config.mjs`) | — |
| Tests | Vitest | 1.x |
| Monorepo | Turborepo + npm workspaces | — |

Exact versions live in `package-lock.json`. Use `npm` only, not pnpm, yarn or bun.

## Rules that changed in the October 2026 upgrade

Old tutorials (and AI assistants) still produce the patterns on the left. Don't
use them.

| ❌ Outdated | ✅ Use instead |
|---|---|
| `src/middleware.ts` | `src/proxy.ts` (Next 16 renamed middleware → proxy) |
| `params.worldId` in pages | `const { worldId } = await params` (server) / `use(params)` (client) — `params` is a Promise |
| `const { userId } = auth()` | `const { userId } = await auth()` |
| `<SignedIn>` / `<SignedOut>` / `<Protect>` | `<Show when="signed-in">` / `<Show when="signed-out">` (old ones **throw** in Clerk Core 3). Prefer our `AuthedOnly` / `GuestOnly` wrappers in `components/auth/AuthGate.tsx` |
| `next lint`, `.eslintrc.js` | `npm run lint` (ESLint CLI + `eslint.config.mjs`) |
| `webpack:` block in `next.config.mjs` | Turbopack config (`turbopack:`) if you really need one |
| `import Phaser from 'phaser'` | `import * as Phaser from 'phaser'` (no default export under Turbopack) |
| `uuid` package | `crypto.randomUUID()` |
| Node 20 | Node 22.12+ |

## Architecture rules

1. **Phaser draws the game world only** (map, player, runes, enemies, bosses, effects).
   **All UI is React**: HUD, XP, quest counter, menus, modals, world map, buttons.
   Don't add `this.add.text(...)` UI in a scene; emit an event and render it in React.
2. **Phaser is never imported on the server.** Load it with `await import('phaser')`
   inside `useEffect` (see `GameCanvas.tsx`).
3. **Game ↔ React talk only through `game.events`.** Phaser → React: `this.game.events.emit()`.
   React → Phaser: methods on `GameCanvasHandle`.
4. **Curriculum lives in `packages/content/`.** Never hardcode lesson text in components.
5. **Stellar code lives in `packages/stellar-sdk/`** and runs on **testnet** unless a mainnet
   guard is explicit.
6. **State:** React `useState`/`useReducer` + context, and plain `fetch` to our API routes.
   We don't use a state library or a query cache yet. Propose one in an issue before adding it.

## Not in the stack (don't add without an approved issue)

- Zustand, Redux, Jotai, TanStack Query (removed; unused)
- `@stellar/freighter-api` (removed; re-add only with the wallet-connect feature)
- `clsx`, `tailwind-merge`, `uuid` (removed; unused or replaced)
- NextAuth, Firebase, Supabase auth (we use Clerk)
- CSS-in-JS libraries, other UI kits (we use Tailwind)

## Known pending upgrades (do NOT do these inside a feature PR)

These majors exist but are intentionally not adopted yet, because each needs its own
migration PR:

- Phaser 4, Tailwind 4, Prisma 7, Vitest 5, ESLint 10, TypeScript 7
- React Compiler lint rules `react-hooks/purity` and `react-hooks/set-state-in-effect` are
  **warnings** for now. Don't add new violations, and fix old ones when you touch that code.
- Soroban playground is template-only (see `components/playground/SANDBOXING.md`).
  Free-form contract compiling needs a separate sandboxed build service.

## Adding or upgrading a dependency

1. Open an issue first saying why it's needed and what it replaces.
2. One dependency change per PR, with `package-lock.json` committed.
3. `npm run typecheck && npm run lint && npm run test && npm run build` must pass.
4. Update this file in the same PR.
