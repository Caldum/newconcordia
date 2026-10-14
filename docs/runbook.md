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

## Scheduled jobs

| Cron (UTC) | Job | What it does |
| --- | --- | --- |
| `0 0 * * *` | `day_change` | Opens the new game day (00:00 UTC, ADR 0014). |
| `0 * * * *` | `citizenship_timeouts` | Approves citizenship requests left unanswered for 72 hours (so up to one hour late). |
| `5 * * * *` | `elections` | Elections, motions, bills, minister rewards, and the world's hourly duties: war authorizations, battles, independence wars, the anti-abuse scan, rate-limit counters and the daily economy snapshot. |

- Every run is in `game.job_runs` (job, slot, status, attempts, duration, error). Recent failures:
  `select job, slot, attempts, error from game.job_runs where status = 'failed' order by slot desc;`
- Re-run a failed slot from the SQL editor (the same call the Worker makes):
  `select public.run_job('day_change', '2026-10-09 03:00:00+00');`. A slot that already succeeded is
  skipped, so re-running is always safe.
- Logs: Cloudflare dashboard → Workers → `concordia-clock` → Logs (JSON lines with `job`, `status`, `slot`).

## Backups and restore drill

- **Backups:** Supabase takes daily backups; with point-in-time recovery (PITR, a paid add-on) any second of
  the last days can be restored. Turning PITR on is an owner step (`docs/setup.md`).
- **Restore drill, once a month:** restore the latest backup into a new project (Dashboard → Database →
  Backups → Restore to new project), then run there:
  `select currency_code, sum(balance) from game.accounts group by 1 having sum(balance) <> 0;` (no rows),
  `select count(*) from game.citizens;` and the latest `game.job_runs` slot, and compare them with production.
  Note the date and the result in this file's log. Delete the drill project afterwards.
- **Restoring production** is the owner's decision: it loses whatever happened after the restore point.

## Money incidents: compensating entries

The ledger is never edited. To give money back after an incident, an admin opens Administration → Compensate a
transaction, checks the legs of the transaction number, writes the reason and confirms. A reverse transaction is
posted once and logged (`game.ledger_compensations`, `game.admin_log`). Only money is reversed; goods, offices or
other state are fixed separately. Transactions that touch a hold cannot be compensated: release or capture the
hold. Review open abuse signals in the same page (ADR 0037).

## Rate limit hook

PostgREST calls `public.check_request` before every request (ADR 0037). If it ever misbehaves, remove it at once
from the SQL editor: `alter role authenticator reset pgrst.db_pre_request; notify pgrst, 'reload config';`.

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

## Local web against local Supabase

```bash
pnpm db:start
pnpm exec supabase status -o env | grep -E '^(API_URL|PUBLISHABLE_KEY)='   # copy into apps/web/.env.local
pnpm --filter @concordia/web dev
```

`apps/web/.env.example` shows the public variables (Supabase, Turnstile test site key, Google switch). The build writes the Supabase origin into the CSP
(`connect-src`), so a build without `VITE_SUPABASE_URL` fails on purpose.

## Local accounts (D05)

- Auth emails do not leave the machine: open the test mailbox at http://127.0.0.1:54324 to read the
  confirmation and recovery links.
- Local Auth checks Turnstile tokens with Cloudflare's public test secret, which needs Internet access from
  the Auth container. Where the container cannot reach `challenges.cloudflare.com` (some sandboxes), start
  Supabase with CAPTCHA off and tell the journeys to skip the CAPTCHA check:

  ```bash
  SUPABASE_AUTH_CAPTCHA_ENABLED=false pnpm exec supabase start
  E2E_CAPTCHA_DISABLED=true pnpm --filter @concordia/web e2e
  ```

  CI always runs with CAPTCHA on.
- A citizen name is reserved, not owned, until the email is confirmed. An unconfirmed reservation is released
  after 24 hours, or right away when the same browser signs up again (for example to fix a mistyped email).
