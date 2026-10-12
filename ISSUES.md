# Stellar Learn — Gameplay Loop Roadmap (Contributor Issues)

> This document tracks the work needed to turn the current prototype into the
> intended **learn-by-playing** experience. Each section below is a
> self-contained issue suitable for a contributor to pick up. They are also
> mirrored as GitHub Issues — comment on an issue to claim it.

## The Vision (what we're building)

Stellar Learn teaches Stellar blockchain development through a 2D pixel-art
adventure. The intended core loop is:

1. **Enter a level →** the player immediately meets an interactive element
   (an ancient rune / NPC) that opens the first **quest**. No aimless wandering.
2. **Each quest teaches first, then tests.** A quest opens with a short
   **lesson** (concept explained in-world), followed by **questions**
   (quiz and/or a coding challenge) that confirm understanding.
3. **Five quests per world.** Completing all five unlocks the world's finale.
4. **Boss battle.** A short animated sequence shows the character fighting the
   world boss. **Win** if the player passed the quests → advance to the
   **next world**. **Lose** if they failed → the boss defeats the character and
   the player retries the failed material.
5. **All curriculum is sourced from trusted references** — primarily
   [developers.stellar.org/docs](https://developers.stellar.org/docs) — and
   lives in `packages/content/`, never hardcoded in components.

## Where the code is today (orientation for contributors)

- **Two parallel "gameplay" surfaces exist and this is the root of the "looks
  off" problem:**
  - `/game` → [`GameShell`](apps/web/src/components/ui/GameShell.tsx) →
    [`GameplayScene.tsx`](apps/web/src/components/ui/GameplayScene.tsx) is a
    **static CSS mockup** (placeholder `PLAYER`/`ENEMY` boxes, fake
    `GABC...HASH` pillars). It is a design handoff, **not playable**. This is
    what the current screenshot shows.
  - `/world/[worldId]/level/[levelId]` →
    [`GameCanvas.tsx`](apps/web/src/components/game/GameCanvas.tsx) →
    [`LevelScene.ts`](packages/game-engine/src/scenes/LevelScene.ts) is the
    **real Phaser game**: movement, a fallback ground, and 5 quest-trigger
    zones that emit a `quest-triggered` event.
- The Phaser ↔ React bridge uses `game.events.emit()` (see CLAUDE.md rule 5).
- Curriculum types live in
  [`packages/content/src/curriculum/types.ts`](packages/content/src/curriculum/types.ts);
  `Quest.type` is `'lesson' | 'quiz' | 'challenge' | 'boss'` and `World` already
  has `bossName` / `bossDescription`.
- Character art is gated behind the `ART_ASSETS_AVAILABLE` flag in
  [`config.ts`](packages/game-engine/src/config.ts); until art lands, a
  generated placeholder box is used.

---

## Issue 1 — Auto-trigger the first quest the moment a level loads

**Labels:** `good-first-issue`, `gameplay`, `phaser`

**Problem.** A new player enters the level and sees only a "Read the ancient
rune to begin a lesson" hint — they have to discover that they must walk to a
pedestal. The product intent is that the player **immediately** interacts with
something that opens a quest.

**Goal.** On level load, guide the player straight into the first quest.

**Acceptance criteria.**
- [ ] When `LevelScene` finishes `create()`, the first quest auto-opens **or**
      the player spawns directly on the first rune with a one-key prompt that is
      impossible to miss.
- [ ] An explicit "Press **E** to interact" affordance appears when overlapping
      a rune (replace the always-on bottom banner).
- [ ] Quest triggers fire on a key press while overlapping, not merely on
      overlap, so the player keeps agency (prevents accidental re-triggers).
- [ ] Re-entering a completed rune does not reopen a finished quest.

**Pointers.** `LevelScene.createQuestTriggers()`
(`packages/game-engine/src/scenes/LevelScene.ts`) and the `onQuestTriggered`
bridge in `GameCanvas.tsx`.

---

## Issue 2 — Make `/game` render the real game (kill the static-mockup confusion)

**Labels:** `gameplay`, `architecture`, `high-priority`

**Problem.** `/game` shows the static `GameplayScene` CSS mockup with fake
`PLAYER`/`ENEMY` boxes. This is why gameplay "looks totally off." Players land on
a non-interactive design preview instead of the Phaser game.

**Goal.** A single, coherent entry point into playable gameplay.

**Acceptance criteria.**
- [ ] Decide and document the canonical play route (recommend reusing
      `/world/[worldId]/level/[levelId]` and treating `GameShell` strictly as a
      style/dev preview, or embedding `GameCanvas` inside the shell's GAMEPLAY
      tab).
- [ ] The route a normal user reaches from the dashboard mounts the real
      `GameCanvas`, not `GameplayScene`.
- [ ] The static `GameplayScene` mockup is either removed or clearly labeled
      "design preview" and moved out of the player flow.
- [ ] Navigating from dashboard → "Play" lands the user in an interactive level.

**Pointers.** `apps/web/src/app/game/page.tsx`, `GameShell.tsx`,
`GameplayScene.tsx`, `apps/web/src/app/(game)/world/[worldId]/level/[levelId]/page.tsx`.

---

## Issue 3 — Redesign QuestPanel into a gated "teach → then test" flow

**Labels:** `gameplay`, `content`, `react`, `high-priority`

**Problem.** The product is a *tutor*. A quest must **teach first**, then ask
**questions**, and only let the player proceed once they answer.

**Goal.** A quest overlay that walks: lesson content → quiz/challenge → result.

**Acceptance criteria.**
- [ ] `lesson`-type content renders its `LessonBlock[]` (text, code, callout) as
      readable, paginated teaching steps with a "Continue" control.
- [ ] `quiz`-type content renders `QuizQuestion[]` one at a time; the player must
      answer before advancing, and sees the `explanation` after answering.
- [ ] The player cannot "complete" a quest without finishing its questions.
- [ ] A pass/fail result is computed and emitted back to the game (needed by
      Issues 4, 5, 9).
- [ ] Closing the panel emits `quest-closed` so Phaser resumes (existing bridge).

**Pointers.** `apps/web/src/components/game/QuestPanel.tsx`,
`QuestModal.tsx`, curriculum types in `types.ts`.

---

## Issue 4 — Build the boss-battle sequence (win/lose animation)

**Labels:** `gameplay`, `phaser`, `animation`

**Problem.** Worlds define a `bossName` / `bossDescription` (e.g. World 1's
"The Doubt Wraith") but there is no boss encounter anywhere in the engine.

**Goal.** After the 5th quest, play a short boss sequence whose outcome reflects
the player's quest performance.

**Acceptance criteria.**
- [ ] New `BossScene` (or boss phase in `LevelScene`) in
      `packages/game-engine/src/scenes/`.
- [ ] Triggered only after all 5 quests of the world are complete.
- [ ] **Pass path:** animated sequence of the character defeating the boss.
- [ ] **Fail path:** the boss defeats the character (death/defeat animation).
- [ ] Outcome is driven by the pass/fail data from Issue 3, not random.
- [ ] Emits a `boss-resolved` event with `{ won: boolean, worldId }` for Issue 5.
- [ ] Works with placeholder art when `ART_ASSETS_AVAILABLE` is false.

**Pointers.** `World.bossName`/`bossDescription` in content;
`LevelScene.ts`/`BossScene.ts`; event bridge in `GameCanvas.tsx`.

---

## Issue 5 — World progression: advance on victory, retry on defeat

**Labels:** `gameplay`, `backend`, `state`

**Problem.** There is no logic to move the player to the next world after a
boss win, nor to send them back on a loss.

**Goal.** A complete progression loop across worlds.

**Acceptance criteria.**
- [ ] On `boss-resolved { won: true }`: mark the world complete, unlock and route
      the player to the **next world** (World 1 → 2 → 3).
- [ ] On `boss-resolved { won: false }`: keep the world locked-as-current and
      route the player to retry the failed quest(s)/boss.
- [ ] Progress persists across reloads (extend the existing progress API /
      Prisma models, guarded so it still works when auth/DB are not configured).
- [ ] The World Map (`WorldMap.tsx`) reflects locked /
      unlocked / completed states.

**Pointers.** `apps/web/src/components/ui/WorldMap.tsx`,
the progress API routes, `packages/database/`.

---

## Issue 6 — Author & verify World 1 curriculum from official Stellar docs

**Labels:** `content`, `good-first-issue`, `documentation`

**Problem.** Quest content must be accurate and sourced from trusted material.
World 1 exists but needs every lesson/quiz fact-checked against the docs.

**Goal.** Five polished, docs-accurate quests for World 1 (Origin Plains:
blockchain & Stellar fundamentals).

**Acceptance criteria.**
- [ ] Each of the 5 quests has a teaching `lesson` and a `quiz` (and a
      `challenge` where appropriate).
- [ ] Every factual claim is backed by a source under
      [developers.stellar.org/docs](https://developers.stellar.org/docs)
      (cite the page in a code comment or `description`).
- [ ] Quiz `explanation` fields teach, not just confirm.
- [ ] Reading level and tone match the existing pixel-fantasy framing.
- [ ] No curriculum text is hardcoded in React (CLAUDE.md rule 2).

**Pointers.** `packages/content/src/worlds/world-1-origin-plains.ts`.

---

## Issue 7 — Author World 2 (Wallet Kingdom) & World 3 (Asset Forge) curriculum

**Labels:** `content`, `documentation`

**Problem.** Worlds 2 and 3 scaffolds exist but need full, docs-sourced quests
covering accounts/keypairs/wallets (W2) and assets/trustlines/issuing (W3).

**Goal.** Complete, accurate 5-quest sets for Worlds 2 and 3.

**Acceptance criteria.**
- [ ] World 2 covers keypairs, accounts, funding via Friendbot, wallets
      (Freighter), and signing — sourced from the docs.
- [ ] World 3 covers assets, trustlines, issuing/distributing, and payments —
      sourced from the docs.
- [ ] Each quest cites its source page; lessons precede quizzes.
- [ ] Boss `bossName`/`bossDescription` tie thematically to the world's topic.

**Pointers.** `packages/content/src/worlds/world-2-wallet-kingdom.ts`,
`world-3-asset-forge.ts`. Follow `world-1-origin-plains.ts` as the template.

---

## Issue 8 — Replace placeholder sprites with real character & boss animations

**Labels:** `art`, `phaser`, `gameplay`

**Problem.** The player renders as a generated box and the mockup shows
`char-validator_run · 128²` / `doubter_walk · 128²` slots. Animations are gated
off because no spritesheets exist.

**Goal.** Real animated sprites for the player and at least one boss/enemy.

**Acceptance criteria.**
- [ ] Add 128×128 spritesheets under `apps/web/public/assets/sprites/...`
      (idle/run/jump/attack frames matching `createAnimations()`).
- [ ] Flip `ART_ASSETS_AVAILABLE` (or auto-detect) so real art loads without
      breaking the placeholder fallback for missing assets.
- [ ] Boss has at least idle + attack + defeat animations for Issue 4.
- [ ] Document the spritesheet frame layout in a short README for future art
      contributors.

**Pointers.** `LevelScene.preload()/createAnimations()`,
`packages/game-engine/src/config.ts` (`ART_ASSETS_AVAILABLE`, `TILE_SIZE`).

---

## Issue 9 — Quiz scoring, XP rewards & HUD wiring

**Labels:** `gameplay`, `state`, `good-first-issue`

**Problem.** The HUD shows `XP: 0`, "QUESTS 3/5" and "128 XLM" appear to be
static, and quest completion grants nothing.

**Goal.** Real, persisted scoring driven by quest outcomes.

**Acceptance criteria.**
- [ ] Completing a quest awards its `xpReward`; the React HUD updates (all HUD
      is React — Phaser draws no UI text).
- [ ] The "quests N/5" counter reflects actual completion for the current world.
- [ ] A per-world score (correct answers) is tracked and used to decide the boss
      win/lose outcome (Issue 4).
- [ ] XP/score persist via the progress API (guarded for no-auth/no-DB).

**Pointers.** level page HUD (`app/(game)/world/[worldId]/level/[levelId]/page.tsx`),
`apps/web/src/components/ui/GameHUD.tsx`, progress API.

---

## Issue 10 — Coding-challenge validation against the Stellar testnet

**Labels:** `gameplay`, `stellar`, `advanced`

**Problem.** `ChallengeSpec` + `ValidationRule` types exist (`tx_success`,
`account_created`, `asset_issued`, `balance_check`, `code_contains`) but there is
no runner that executes a player's code and validates it against testnet.

**Goal.** In-game coding challenges that verify real testnet outcomes.

**Acceptance criteria.**
- [ ] A challenge quest renders the Monaco editor with `starterCode` and `hints`.
- [ ] Submitting runs validation against each `ValidationRule`; clear pass/fail
      feedback with the rule's `errorMessage` on failure.
- [ ] Testnet operations use `@stellar-learn/stellar` and the testnet network
      only (CLAUDE.md rule 3 — never mainnet).
- [ ] At least one end-to-end example wired into World 2 or 3 (e.g. "create &
      fund a testnet account via Friendbot").

**Pointers.** `ChallengeSpec`/`ValidationRule` in `types.ts`,
`packages/stellar-sdk/`, `@monaco-editor/react`.

---

### Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). The highest-leverage starting points
are the `good-first-issue` items (1, 6, 9). Content issues (6, 7) need no game
experience — just careful reading of the Stellar docs.
