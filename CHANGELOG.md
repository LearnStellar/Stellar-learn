# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-09

### Added

- **Pixel Adventure Gameplay**: 2D exploration with character movement, shrines, and animated encounters powered by Phaser 3.
- **Typed Event Bus**: Decoupled, strongly-typed Phaser ↔ React event contracts in `@stellar-learn/game-engine` for reliable quest selection, boss resolution, and HUD synchronization.
- **Curriculum & Quests**: Complete, docs-grounded curriculum for World 1 (Origin Plains), World 2 (Wallet Kingdom), and World 3 (Asset Forge) with 15 interactive quests.
- **Guided Lesson Reader**: Step-by-step reading progression in `LessonContent` with section indicators and guided navigation.
- **Quiz Gating & Retry**: Comprehension quizzes evaluated against a 70% passing threshold with instant review and retry capabilities.
- **Monaco Testnet Challenges**: Live testnet coding sandbox in Monaco Editor with ambient TypeScript definitions for `@stellar/stellar-sdk` and automated validation against testnet faucets.
- **Boss Encounter Engine**: `BossScene` integration linking quest performance to animated boss battles, score calculation, victory fanfare, and sequential world unlocking.
- **Real-time HUD**: Synchronized game overlay tracking active XP, gem balances, quest completion count, and manual boss gauntlet triggers.
- **Marketplace & Inventory**: In-game store to purchase swords, shields, hats, and titles using earned gems, backed by database row-level locks.
- **Guest Play & Account Migration**: Offline-first guest progress in `localStorage` with automated migration to authenticated accounts upon signup.
- **Zod Schema Validation**: Declarative input validation across all API routes (`/api/progress`, `/api/gems`, `/api/profile`, `/api/marketplace`, `/api/playground`).
- **Resilient Testnet Handling**: Graceful error interception for Horizon testnet disconnects, timeouts, and HTTP 429 rate limits, ensuring private keys are never exposed in logs or UI.
- **CI & Quality Automation**: GitHub Actions CI workflow covering formatting checks, monorepo linting, typechecking, 259 passing tests, and production compilation.
- **Community Standards**: Open-source contributor guidelines (`CONTRIBUTING.md`), Contributor Covenant v2.1 (`CODE_OF_CONDUCT.md`), vulnerability disclosure policy (`SECURITY.md`), and GitHub issue / pull request templates.

### Changed

- Modernized monorepo stack to Next.js 16 (App Router), React 19, Turborepo, and Tailwind CSS.
- Standardized API route envelopes with correlation ID tracking and structured error payloads.

### Fixed

- Resolved React Hook dependency cycles and state mutations in render across UI components.
- Enforced idempotency on quest completions to prevent duplicate XP awarding.
- Protected guest storage against corruption, negative timestamps, and capacity limits.
