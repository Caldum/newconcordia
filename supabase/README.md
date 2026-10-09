# Database

- `migrations/`: versioned, forward-only changes. Each file explains in its header what it does and how to
  undo it. Squawk reviews them in CI (`pnpm db:lint`).
- `tests/database/`: pgTAP tests. `000_security_invariants` scans the catalog and fails if a table has no
  RLS, if `anon` or `authenticated` can write a table, or if an exposed function does not pin `search_path`.
- `seed.sql`: local development fixtures only. The game's reference data ships in migrations.

Access model: ADR 0002 (`docs/adr/0002-data-access.md`).
