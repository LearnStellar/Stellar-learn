# Stellar Learn Engineering Roadmap

This document outlines the product and engineering roadmap taking Stellar Learn from the current v0.1.0 milestone to full production readiness.

---

## Milestone 1: Core Fundamentals & Play Loop (v0.1.0) — CURRENT

- [x] **Monorepo Architecture**: Decoupled packages for game engine, curriculum content, stellar SDK integration, database, and Next.js web application.
- [x] **World 1 (Origin Plains)**: 5 interactive quests teaching blockchain basics, distributed ledgers, consensus, Lumens (XLM), and the Horizon API.
- [x] **World 2 (Wallet Kingdom)**: 5 interactive quests covering Ed25519 keypairs, account creation, Friendbot testnet funding, Freighter wallet connection, and multi-sig authorization.
- [x] **World 3 (Asset Forge)**: 5 interactive quests covering custom asset codes, trustline authorization, asset minting, CAP-0035 clawback, and issuer revocation flags.
- [x] **Monaco Testnet Sandbox**: In-browser coding challenges with ambient TypeScript definitions (`stellar.*`) executing directly against the Stellar testnet.
- [x] **Boss Encounter Engine**: Phaser 3 boss arena with animated victory/defeat sequences, scoring ratio calculations, and sequential world unlocking.
- [x] **Progression & Inventory**: In-game HUD tracking XP and gems; Marketplace for purchasing pixel equipment; seamless guest progress migration upon account signup.
- [x] **Hardening & Security**: Zod input validation schemas across all API endpoints, testnet timeout resilience, local storage bounds, and CI automation.

---

## Milestone 2: Decentralized Exchange & Liquidity (v0.2.0)

**Focus: World 4 — Trading Bazaar**

- [ ] **Curriculum Expansion**:
  - Quest 1: Order books and SDEX market mechanics.
  - Quest 2: Manage buy and sell offers (`ManageBuyOffer`, `ManageSellOffer`).
  - Quest 3: Path payments (finding payment paths across asset pairs with strict send/receive limits).
  - Quest 4: Automated Market Makers (AMM) and constant-product liquidity pools.
  - Quest 5: Slippage tolerance and price impact calculation.
- [ ] **Interactive Testnet Challenges**:
  - Live order placement on SDEX testnet.
  - Path payment execution between testnet custom tokens.
- [ ] **Boss Encounter**: "The Bazaar Titan" — tests trading routing and offer cancellation under time constraints.

---

## Milestone 3: Anchors & Cross-Border Payments (v0.3.0)

**Focus: World 5 — Payment Realm**

- [ ] **Curriculum Expansion**:
  - Quest 1: Stellar Ecosystem Proposals (SEPs) overview and standards compliance.
  - Quest 2: SEP-0024 hosted interactive deposit and withdrawal flows.
  - Quest 3: SEP-0010 Web Authentication (challenge transactions and JWT issuance).
  - Quest 4: Memo handling, multiplexed accounts (M-addresses / SEP-0023), and travel rule compliance.
  - Quest 5: Cross-border settlement speed and fee optimization.
- [ ] **Mock Anchor Environment**:
  - Embedded sandbox anchor simulating fiat-to-token on-ramps and off-ramps in development.
- [ ] **Boss Encounter**: "The Guardian of Settlement" — multi-stage transaction verification.

---

## Milestone 4: Soroban Smart Contracts (v0.4.0)

**Focus: World 6 — Soroban Citadel**

- [ ] **Curriculum Expansion**:
  - Quest 1: Soroban architecture, WASM bytecode, and environment primitives.
  - Quest 2: Authoring smart contracts in Rust using `soroban-sdk`.
  - Quest 3: Contract storage types (Instance, Persistent, Temporary) and TTL management.
  - Quest 4: Auth framework, invoking contract functions with simulated authorizations.
  - Quest 5: Deploying and interacting with custom token contracts on Futurenet/Testnet.
- [ ] **WASM Simulation in Playground**:
  - Client-side or containerized Soroban contract compilation and simulation.
- [ ] **Final Boss Encounter**: "Soroban Overlord" — deploy and exploit/fix a smart contract to clear the citadel.

---

## Milestone 5: Cooperative Study Groups & Social Guilds (v0.5.0)

- [ ] **Study Group Creation**: Players form groups with unique invite links and shared progress dashboards.
- [ ] **Cooperative Challenges**: Group quests unlocking rewards once a quorum of members complete prerequisite lessons.
- [ ] **Group Leaderboards**: Redis sorted-set leaderboards aggregating group XP.
- [ ] **Co-op Boss Raids**: Combined quiz scores and simultaneous challenge solving to defeat raid bosses.

---

## Milestone 6: Production Polish & On-Chain Credentials (v1.0.0)

- [ ] **On-Chain Certificates**: Mint verifiable completion NFT certificates directly on Stellar mainnet upon finishing the curriculum.
- [ ] **Mobile Touch Controls**: Responsive virtual D-pad and portrait-friendly quest panels for iOS and Android web browsers.
- [ ] **Internationalization (i18n)**: Multilingual support for lesson content starting with Spanish, Portuguese, and Mandarin.
- [ ] **Storybook Component Library**: Isolated component documentation for all UI elements.
