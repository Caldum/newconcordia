# 0003 · Tool versions and routing

Date: 2026-10-09 · Status: Accepted

## Context

At the start (October 2026) the latest versions are not always compatible with each other.

## Decision

| Tool | Version | Reason |
| --- | --- | --- |
| Node | 24 LTS (`.nvmrc`, `engines`) | Active LTS |
| pnpm | 10.28 | Stable; 12 is a recent major |
| TypeScript | 6.0 | `typescript-eslint` 8 supports up to `<6.1`; not TypeScript 7 yet |
| ESLint | 9.39 | `eslint-plugin-jsx-a11y` does not declare ESLint 10 yet |
| Vitest | 4.1 | `@cloudflare/vitest-pool-workers` requires Vitest 4.1, so the Workers are tested with the same runner |
| Vite | 8 | Required by `@vitejs/plugin-react` 6 |
| Postgres | 17 | Supabase default |

Routing: TanStack Router **defined in code** (`createRoute`) instead of file-based routes. It avoids a
generated file that CI would have to regenerate and compare, and keeps full typing. Per-route code splitting
uses `lazyRouteComponent`.

## Consequences

Dependabot proposes the major upgrades; each one is taken when its dependencies allow it.
