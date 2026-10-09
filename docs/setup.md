# Owner steps

Everything that depends on the owner's accounts or credentials. The code is ready to use them: until they
exist, the CI jobs that need them finish green with a «Deployment skipped» warning and everything else keeps
working.

Golden rule: **no secret goes in the repository or in the browser**. Secrets go in GitHub
(Settings → Environments → *environment* → Secrets) or in Wrangler (`wrangler secret put`). Public values
(Supabase URL, publishable key, Turnstile site key, Sentry DSN) go in as *Variables*.

## Summary

| # | Step | Unblocks |
| --- | --- | --- |
| 1 | Create the `staging` and `production` *environments* on GitHub | Deployments |
| 2 | Two Supabase projects (staging and production) | Migrations in the cloud |
| 3 | Cloudflare account and API token | Web and clock in the cloud |
| 4 | Protect `main` and `develop` | Merges without review |
| 5 | Clock secret and failure alert | The daily job in the cloud |

The Turnstile, Resend, Google OAuth, Sentry and backup steps are added when the module that uses them arrives.

## 1. GitHub *environments*

1. GitHub → `Caldum/newconcordia` → **Settings → Environments → New environment**.
2. Create `staging`. Under *Deployment branches and tags* choose *Selected branches* and add `develop`.
3. Create `production`. Check **Required reviewers** and add yourself. Under *Deployment branches* add only `main`.

## 2. Supabase (two projects)

1. At https://supabase.com/dashboard create two projects in the region closest to the players (for example
   `sa-east-1`, São Paulo): `concordia-staging` and `concordia-production`. Keep each database password in
   your password manager.
2. In each project, **Project Settings → Data API**:
   - *Exposed schemas*: leave only `public` (remove `graphql_public`).
   - If there is an option to expose new tables automatically, turn it off.
3. Create a personal access token with limited scope: **Account → Access Tokens → Generate new token** (if
   it allows choosing a scope, limit it to the two projects). The same token serves both *environments*.
4. Copy these values into GitHub → Settings → Environments, once per *environment*:

   | Where | Name | Value (from each project) |
   | --- | --- | --- |
   | Secret | `SUPABASE_ACCESS_TOKEN` | The token from step 3 |
   | Secret | `SUPABASE_DB_PASSWORD` | The database password |
   | Variable | `SUPABASE_PROJECT_REF` | Project Settings → General → *Project ID* (for example `abcdefghijklmnop`) |
   | Variable | `SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → *Publishable key* (`sb_publishable_...`) |
   | Secret | `SUPABASE_SECRET_KEY` | Project Settings → API Keys → *Secret keys* → create one named `clock` (`sb_secret_...`) |

   The secret key never reaches the web: the deploy job uploads it only to the clock Worker (step 5).

## 3. Cloudflare

1. Create the account at https://dash.cloudflare.com (free plan). Copy the *Account ID* from the right
   column of **Workers & Pages**.
2. **My Profile → API Tokens → Create Token → Edit Cloudflare Workers** (template). Add the permission
   *Account → Workers R2 Storage → Edit* (for the D29 backups). Limit it to your account.
3. On GitHub, in both *environments*:

   | Where | Name | Value |
   | --- | --- | --- |
   | Secret | `CLOUDFLARE_API_TOKEN` | The token from step 2 |
   | Variable | `CLOUDFLARE_ACCOUNT_ID` | The *Account ID* |

4. The web will live at `concordia-web.<your-subdomain>.workers.dev` (production) and
   `concordia-web-staging.<your-subdomain>.workers.dev` (staging).

## 4. Protect the branches

1. GitHub → **Settings → Rules → Rulesets → New branch ruleset**.
2. Name `main`, target `main`: *Restrict deletions*, *Block force pushes*, *Require a pull request before
   merging* (1 approval) and *Require status checks to pass* with the **`ci-passed`** check (it appears after
   the first CI run).
3. Name `develop`, target `develop`: *Restrict deletions*, *Block force pushes*, *Require a pull request*
   (0 approvals) and the **`ci-passed`** check.
4. **Settings → General → Pull Requests**: leave only *Allow squash merging* enabled.
5. **Settings → Code security**: enable *Dependabot alerts*, *Dependabot security updates* and *Secret
   scanning* with *Push protection*.

## 5. Clock secret and failure alert

1. The deploy job uploads `SUPABASE_SECRET_KEY` (step 2) to the `concordia-clock` Worker on every deploy;
   nothing else to do for the secret.
2. Cloudflare dashboard → **Notifications → Add → Workers → Workers Weekly/Event Alerts** (the name may vary):
   create an alert for failed invocations of `concordia-clock` and `concordia-clock-staging`, sent to your
   email. A failed day change makes the invocation fail on purpose.

