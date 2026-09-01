# Migrations

Until now this project used `prisma db push`, which mutates the database to
match `schema.prisma` with no history and no review step — it will happily drop
a column that a schema edit removed. These migrations replace that for any
environment holding real data.

## One-time baseline (existing databases)

`00000000000000_baseline` describes the schema **as it already exists** in
production. It must never actually run there — the tables are already present.
Mark it as applied instead, once per existing database:

```bash
cd packages/database
npx prisma migrate resolve --applied 00000000000000_baseline
```

Then apply everything after it:

```bash
npx prisma migrate deploy
```

A brand-new/empty database needs no `resolve` step — `migrate deploy` runs the
baseline and creates the schema from scratch.

## Normal flow

- Local schema change: `npm run db:migrate` (creates a migration + applies it)
- Deploy: `npm run db:deploy`
- Check state: `npm run db:migrate:status`

Prefer these over `db:push`, which stays available only for throwaway local
databases.

## 20260901000000_gem_economy_and_marketplace

The develop merge: gem economy, cosmetics marketplace and avatar equip. Purely
additive — two tables (`gem_transactions`, `item_ownerships`), the `GemSource`
enum, and `users.gemBalance` / `users.equippedItems`, both with defaults so
existing rows backfill safely. Contains no `DROP`, so `progress.score` and all
other existing data are untouched.
