# 0001 · Branches and location of the handoff kit

Date: 2026-10-09 · Status: Accepted (paths updated by ADR 0004)

## Context

The brief asks for an initial commit on `main` and then one PR per module. The owner also asked for `main`
to be the production branch and for daily work to be integrated in `develop`. The brief sends the design
assets to `apps/web/src/assets/` "when they are used", and does not say where to keep `tools/flags.py`.

## Options

1. Each module's PR goes straight to `main`.
2. `develop` as the integration branch; `main` only receives versions the owner approves.

For the assets: copy them all to `apps/web/src/assets/` now, or keep them as a reference in `docs/` and copy
into the app only those that are used.

## Decision

- Branches: option 2. Each module branches from `develop` as `feat/dNN-name` and returns through a squash
  PR. `main` receives `develop` through a PR when the owner decides to publish; the owner merges that PR.
- CI runs on PRs into `develop` and `main`. Deployment to staging comes from `develop`; production comes
  from `main` with manual approval on the `production` *environment*.
- Kit assets: `docs/design/assets/` keeps the originals (logos, illustrations, silhouettes, icons); each
  package copies only what it uses.
- `tools/flags.py` goes to `docs/design/tools/` as the reference for the `Flag` component.

## Consequences

- The brief says "on merge to `main`: migrations and deployment to staging". With this decision that happens
  on merge to `develop`, and `main` deploys to production with approval. It is safer: nothing reaches
  production without an explicit merge by the owner.
- The `claude/*` branch assigned by the cloud session is not used for the work.
