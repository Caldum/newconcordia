# D01 · Repository and automated delivery

**Goal:** a minimal change passes lint, types, tests, pgTAP and build on every PR, reaches staging on its own
when merged into `develop`, and production when merged into `main` with manual approval.

**Acceptance test (GDD):** a minimal change passes the tests, reaches the staging project on its own and,
once approved, production. Deployments need the owner's accounts (`docs/setup.md`): until then CI skips
those jobs with a warning, and the test completes when the secrets exist.

## Tasks

1. Monorepo: root `package.json`, `pnpm-workspace.yaml` (engine-strict, exact versions, allow-listed install
   scripts), strict `tsconfig.base.json`, flat ESLint (`strictTypeChecked`, `react-hooks`, `jsx-a11y`,
   import order) and Prettier. Test: `pnpm lint` and `pnpm typecheck` green with zero warnings.
2. Minimal `apps/web`: Vite + React 19 + TanStack Router, the home route and the 404. Test: Vitest
   (components) and Playwright with axe (no violations).
3. i18n (ADR 0005): typed catalogs for Spanish and English, locale detection, `<html lang>`, number
   formatting. Test: Vitest for detection, formatting and catalog completeness; e2e in both languages.
4. Web on Cloudflare: `wrangler.jsonc` with assets, SPA fallback and security headers (`_headers`). Test:
   unit test that reads `_headers` and requires CSP, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
5. Supabase: `supabase/config.toml`, a baseline migration that denies by default (revokes `anon` /
   `authenticated` privileges on `public` and creates the `game` schema without direct access), pgTAP that
   proves it, and squawk on the migrations.
6. CI (`.github/workflows/ci.yml`): cached install, lint, types, unit tests, pgTAP, squawk, build, size
   budget, Playwright + axe, `pnpm audit`. CodeQL separately. Actions pinned by SHA with least privilege.
   A final `ci-passed` job that gathers everything for branch protection.
7. Delivery (`deploy.yml`): `develop` → migrations and web to staging; `main` → production with the
   `production` *environment*. If a secret is missing, the job finishes green with a warning.
8. Dependabot (npm and Actions), PR template, `docs/runbook.md`, `docs/setup.md`, `docs/glossary.md`.
