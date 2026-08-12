# Stellar Learn — 10-Day Build Plan

> Goal: grow from a 6-world prototype into a **20-world**, deeply-quizzed,
> testnet-hands-on curriculum that takes a player from *"what is blockchain?"* to
> **shipping Soroban smart contracts** — plus the polish to get accepted into the
> wave program. Day 1 = today.

## Daily ritual (applies to EVERY day — non-negotiable)

Before writing any code each day, in the VS Code terminal:

```powershell
C:\Users\USER\gh-accounts\noevidence1017.ps1   # pins gh + git identity for this window
```

- **Active gh account:** `noevidence1017` (the script sets `GH_TOKEN`, so it can't drift).
- **Commit identity:** `noevidence1017 <noevidence1017@gmail.com>`.
- **≥ 10 commits per day, in small bits** — one logical change per commit (a world file, a schema field, a component, a test…), not one big dump.
- **No Claude / Co-Authored-By attribution** on any commit or PR. Ever.
- Branch per day (`feat/dayN-…`), keep CI green, push, open a PR when the day's slice is coherent.

## The expanded world map (6 → 20)

| # | World | Theme | Learns |
|---|---|---|---|
| **Act I — Foundations** ||||
| 1 | Origin Plains | forest | What is blockchain, ledgers, XLM |
| 2 | Ledger Lands | forest | Consensus & the Stellar Consensus Protocol (SCP) |
| 3 | Wallet Kingdom | castle | Accounts, keypairs, Friendbot |
| 4 | Reserve Reach | castle | Fees, base reserves, sequence numbers |
| **Act II — Assets** ||||
| 5 | Asset Forge | dungeon | Assets & trustlines |
| 6 | Issuance Isle | dungeon | Issuing & distributing custom assets |
| 7 | Anchor Anchorage | castle-dungeon | Anchors, SEPs, real-world assets |
| **Act III — Markets & Payments** ||||
| 8 | Trading Bazaar | mountain | SDEX, offers, the order book |
| 9 | Liquidity Lagoon | mountain | Liquidity pools & AMMs |
| 10 | Payment Realm | castle-dungeon | Payments & path payments |
| **Act IV — Security & Soroban Core** ||||
| 11 | Guardian Keep | castle | Multisig, thresholds, account security |
| 12 | Soroban Gateway | citadel | Smart-contract fundamentals, WASM |
| 13 | Contract Forge | citadel | First Rust contract, functions, types |
| 14 | Storage Sanctum | dungeon | Storage types, TTL, events |
| 15 | Deployment Depths | mountain | Build, optimise, deploy via Stellar CLI |
| 16 | Invocation Isle | forest | Invoking contracts, cross-contract calls |
| **Act V — Advanced & Dev Career** ||||
| 17 | Authorization Keep | castle | Soroban auth framework, `require_auth` |
| 18 | Token Temple | castle-dungeon | Token interface, SAC, SEP-41 |
| 19 | DeFi Dominion | mountain | AMMs, oracles & price feeds on Soroban |
| 20 | Soroban Citadel | citadel | Security/auditing + frontend integration + **capstone build** |

*(Extensible further later — the engine renders any N worlds after Day 1.)*

## The deeper-quiz / enemy mechanic

- Each world has **3–5 enemies**, not one. Defeating an enemy requires clearing a
  **themed mini-quiz of 3–5 questions** tied to that stretch of the lesson.
- The world **boss** is a cumulative gauntlet drawing from every enemy's topic.
- Lessons are split into **more, smaller teaching steps** (one concept per step)
  with a comprehension check after each — teach a little, test a little, repeat.
- Result: each world goes from ~1 quiz to **15–25 questions** + challenges.

---

## Day 1 — Unify the foundation & open the curriculum to 20 worlds
The in-review PRs (#67–71) overlap; land them cleanly so the platform can scale.
1. Reconcile progression into a single source (merge #67 + #71 logic).
2. Merge the QuestPanel teach-then-test shell (#70) as the base.
3. Fold the challenge runner (#69) in as the challenge "test" phase.
4. Fold quiz scoring/XP/HUD (#68) into the unified panel.
5. Add `WorldTheme` values already used; verify map renders N worlds (#67).
6. Register 20 world *scaffolds* in `packages/content/src/worlds/index.ts`.
7. Schema: ensure `WorldProgress` + `Progress.score` migrations (`db push`).
8. Enemy data model: add `enemies: EnemyEncounter[]` to the `World`/level type.
9. `EnemyEncounter` type: id, name, sprite, `questions: QuizQuestion[]`.
10. Update `worldMapLayout` sanity test for 20 nodes.
11. CI green + deploy check.
12. PR `feat/day1-foundation-unify`.

## Day 2 — Enemy encounters with multi-question mini-quizzes
1. `LevelScene`: spawn multiple enemies per level from data.
2. Enemy overlap → open a mini-quiz panel (reuse QuestPanel test phase).
3. Gate enemy defeat behind clearing its question set.
4. HUD: `ENEMIES n/m` counter + per-enemy progress.
5. Wrong answer → enemy "attacks" (lose a heart); add health HUD.
6. Persist per-enemy results into the score/progress refs.
7. Boss gauntlet pulls from all enemy topics in the world.
8. Difficulty scaling (later enemies = more/harder questions).
9. Unit tests for enemy-scoring + gauntlet assembly.
10. Balance pass + SFX hooks (correct/wrong).
11. CI green, deploy check.
12. PR `feat/day2-enemy-quizzes`.

## Day 3 — Elaborate Act I content (Worlds 1–4, Foundations)
1. World 1 Origin Plains: split into 5–6 teaching steps + per-step checks.
2. World 1: 3 enemies × mini-quizzes + boss gauntlet.
3. World 2 Ledger Lands (SCP): author lessons (sourced/cited from docs).
4. World 2: enemies + quiz bank.
5. World 3 Wallet Kingdom: expand keypairs/accounts/Friendbot lessons.
6. World 3: testnet challenge — create & fund an account.
7. World 4 Reserve Reach: fees/reserves/sequence lessons + worked examples.
8. World 4: enemies + quiz bank.
9. Fact-check pass against developers.stellar.org, add citations.
10. Register + verify all four in-game.
11. CI green, deploy check.
12. PR `feat/day3-act1-content`.

## Day 4 — Act II content (Worlds 5–7, Assets)
1. World 5 Asset Forge: assets & trustlines, elaborated steps.
2. World 5: testnet challenge — create a trustline.
3. World 6 Issuance Isle: issue + distribute custom asset lessons.
4. World 6: challenge — issue an asset and send it (testnet validated).
5. World 7 Anchor Anchorage: anchors/SEP-6/SEP-24/RWA (build on merged #61).
6. Enemies + quiz banks for 5–7.
7. Boss gauntlets for 5–7.
8. Lesson illustration hooks for asset concepts.
9. Citations + fact-check.
10. Register + verify.
11. CI green, deploy check.
12. PR `feat/day4-act2-assets`.

## Day 5 — Act III content (Worlds 8–10, Markets & Payments)
1. World 8 Trading Bazaar: SDEX, offers, order book.
2. World 9 Liquidity Lagoon: liquidity pools & AMMs.
3. World 10 Payment Realm: payments & path payments.
4. Challenge — place an offer on testnet SDEX.
5. Challenge — send a path payment.
6. Enemies + quiz banks (8–10).
7. Boss gauntlets (8–10).
8. Citations + fact-check.
9. Register + verify.
10. Balance/difficulty pass across Acts I–III.
11. CI green, deploy check.
12. PR `feat/day5-act3-markets`.

## Day 6 — Security + Soroban intro (Worlds 11–13)
1. World 11 Guardian Keep: multisig, thresholds, security.
2. World 11: challenge — configure a 2-of-3 multisig on testnet.
3. World 12 Soroban Gateway: what Soroban is, WASM, lifecycle.
4. World 13 Contract Forge: first Rust contract (functions, types, macros).
5. Add a `soroban`/Rust code display mode to the challenge/brief renderer.
6. Enemies + quiz banks (11–13).
7. Boss gauntlets (11–13).
8. Citations from docs/build/smart-contracts.
9. Register + verify.
10. CI green, deploy check.
11. Extra small commits: copy edits, callouts.
12. PR `feat/day6-security-soroban-intro`.

## Day 7 — Soroban core (Worlds 14–16)
1. World 14 Storage Sanctum: storage types, TTL, events.
2. World 15 Deployment Depths: build/optimise/deploy via Stellar CLI.
3. World 16 Invocation Isle: invoking contracts, cross-contract calls.
4. Challenge — deploy a hello/counter contract (guided).
5. Challenge — invoke a deployed contract.
6. Enemies + quiz banks (14–16).
7. Boss gauntlets (14–16).
8. Citations + fact-check.
9. Register + verify.
10. CI green, deploy check.
11. Copy/callout polish commits.
12. PR `feat/day7-soroban-core`.

## Day 8 — Soroban advanced (Worlds 17–19)
1. World 17 Authorization Keep: auth framework, `require_auth`.
2. World 18 Token Temple: token interface, SAC, SEP-41.
3. World 19 DeFi Dominion: AMMs, oracles, price feeds on Soroban.
4. Challenge — a minimal token interaction.
5. Enemies + quiz banks (17–19).
6. Boss gauntlets (17–19).
7. Citations + fact-check.
8. Register + verify.
9. Cross-world difficulty ramp review.
10. CI green, deploy check.
11. Copy polish commits.
12. PR `feat/day8-soroban-advanced`.

## Day 9 — Capstone world + progression/boss polish (World 20)
1. World 20 Soroban Citadel: security/auditing lessons.
2. World 20: frontend-integration lessons (JS SDK + Freighter + contract).
3. World 20: **capstone challenge** — tie multiple skills together.
4. Final-boss gauntlet drawing from the whole curriculum.
5. Boss-battle animation/cutscene polish (win/lose).
6. World progression end-to-end: unlock chain across all 20, retry on loss.
7. Badges for milestones (world cleared, contract deployed, etc.).
8. Dashboard reflects all 20 worlds + progress.
9. Tests for full-curriculum progression.
10. CI green, deploy check.
11. Copy/UX polish commits.
12. PR `feat/day9-capstone-progression`.

## Day 10 — Audio, QA, polish, deploy & wave-program readiness
1. Wire audio: BGM per theme + SFX (jump, coin, correct/wrong, boss, victory).
2. Full playthrough QA — fix blockers (small commits per fix).
3. Accessibility + mobile responsiveness pass on the game view.
4. Performance: lazy-load per-world content, trim bundle.
5. Leaderboard polish + XP economy balance across 20 worlds.
6. README + screenshots refreshed to reflect 20 worlds.
7. CONTRIBUTING + issues updated to the new scope.
8. Final `db push` + production redeploy on Vercel.
9. Smoke-test the live deployment end to end.
10. Update the wave-program appeal with concrete evidence (commits/PRs/live URL).
11. Tag a release.
12. PR `feat/day10-polish-launch`.

---

### Notes / reality check
- The daily commit count (≥10) is met naturally by the atomic task lists above —
  each numbered item is roughly one commit.
- Content days (3–8) are the heaviest and may spill; if a day runs long we carry
  the remainder into the next day's first commits rather than dumping big commits.
- Every world's factual content must cite `developers.stellar.org` (or another
  trusted source) in a comment or the quest `description`.
