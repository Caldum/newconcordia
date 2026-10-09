# Operations runbook

## Environments

| Environment | Branch | Database | Web | Approval |
| --- | --- | --- | --- | --- |
| Local | any | `pnpm db:start` (Docker) | `pnpm --filter @concordia/web dev` | — |
| Staging | `develop` | Supabase `concordia-staging` | `concordia-web-staging` | Automatic |
| Production | `main` | Supabase `concordia-production` | `concordia-web` | Manual (`production` *environment*) |

## Deploy

1. Merge the PR into `develop`. The **Deploy** workflow applies the migrations to the staging project and
   publishes the staging web.
2. Check the staging environment.
3. Open a PR from `develop` to `main`. When it merges, **Deploy** waits for the `production` *environment*
   approval and deploys the same way as staging.

Migrations go before the web and are always compatible with the previous web version (expand, then
contract: new optional columns, new functions under new names, and the old ones are removed in a later
deployment).

## Roll back

- **Web:** `pnpm --filter @concordia/web exec wrangler rollback [--env staging]` returns to the previous
  version in seconds. Also from the dashboard: Workers → concordia-web → Deployments → Rollback.
- **Database:** an applied migration is never reverted. Write a new forward migration that undoes the
  change, following the «Rollback» note in the header of the original migration.
- **Code:** `git revert` the merge commit on `develop` and open a new PR.

## Restore a backup

Completed with D29 (encrypted daily copy in R2 and a restore tested once a month).

## Rotate secrets

1. Generate the new value at the provider (Supabase, Cloudflare, Resend, Sentry).
2. Update it in GitHub → Settings → Environments → *environment* → Secrets, or with
   `wrangler secret put NAME [--env staging]` for Worker secrets.
3. Run **Deploy** again (*Run workflow*) so it picks up the new value.
4. Revoke the old value at the provider.

## Local database

```bash
pnpm db:start      # starts Postgres, Auth and the API in Docker with every migration
pnpm db:reset      # wipes the local database and rebuilds it from the migrations
pnpm db:test       # pgTAP tests
pnpm db:lint       # squawk on the migrations
pnpm db:types      # regenerates packages/db-types
```

If Docker cannot pull images from `public.ecr.aws`, pull the same ones from Docker Hub
(`docker pull supabase/postgres:<version>`) and tag them with the name the CLI asks for.
