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
| 6 | Accounts: Auth settings, Turnstile, Resend, email templates | Sign-up and sign-in in the cloud |
| 7 | Google sign-in (optional) | «Continuar con Google» |
| 8 | Terms of use and privacy policy texts | Linking them from sign-up |
| 9 | Make yourself admin | The admin panel (`/admin`) |
| 10 | Local development without Docker | Running the web and the database tests on your computer |

The Sentry and backup steps are added when the module that uses them arrives.

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


## 6. Accounts (D05)

`supabase/config.toml` holds the local Auth settings only (it has Cloudflare's test CAPTCHA secret and a high
email limit for the tests), so it is **not** pushed to the hosted projects. Repeat these steps in each
Supabase project (staging and production), with each environment's own web address.

1. **Turnstile.** Cloudflare dashboard → **Turnstile → Add widget**: name `concordia-staging` (and later
   `concordia-production`), hostname the web address of that environment
   (`concordia-web-staging.<your-subdomain>.workers.dev`), mode *Managed*. Copy the two keys:
   - *Site key* → GitHub *environment* **Variable** `TURNSTILE_SITE_KEY` (public, goes into the web build).
   - *Secret key* → Supabase → **Authentication → Attack Protection (Bot and Abuse Protection) → Enable
     CAPTCHA protection**, provider *Turnstile*, paste the secret. It never goes to GitHub or the web.
2. **URLs.** Supabase → **Authentication → URL Configuration**:
   - *Site URL*: the web address of that environment, without a trailing slash.
   - *Redirect URLs*: the same address, and the same address followed by `/**`.
3. **Email sign-in rules.** **Authentication → Sign In / Providers → Email**: *Confirm email* on, *Minimum
   password length* 10, *Email OTP expiration* 1800 seconds. Under **Attack Protection**, turn on *Prevent
   use of leaked passwords* if your plan offers it.
4. **Resend (SMTP).** At https://resend.com create the account, verify your domain (or use the test domain
   meanwhile) and create an API key with *Sending access* only. Supabase → **Authentication → Emails → SMTP
   Settings**: enable custom SMTP with host `smtp.resend.com`, port `465`, user `resend`, password the API
   key, sender `no-reply@<your-domain>` and sender name `Concordia`. The key stays in Supabase.
5. **Email templates.** Supabase → **Authentication → Emails → Templates**. For *Confirm signup*, *Reset
   password* and *Change email address*, paste the subject and the HTML of `supabase/templates/
   confirmation.html`, `recovery.html` and `email_change.html` (the subjects are in `supabase/config.toml`).
   They write Spanish or English following the language chosen at sign-up, and their links go to
   `/auth/confirm`, which works on any device.
6. Check it: sign up on the staging web with a real address, open the email on your phone, and sign in.

## 7. Google sign-in (optional)

1. https://console.cloud.google.com → create a project `Concordia` → **APIs & Services → OAuth consent
   screen**: *External*, app name Concordia, your support email, scopes `email`, `profile` and `openid`.
2. **Credentials → Create credentials → OAuth client ID → Web application**. *Authorized JavaScript
   origins*: the web address of each environment. *Authorized redirect URIs*:
   `https://<project-ref>.supabase.co/auth/v1/callback` for each Supabase project.
3. Supabase → **Authentication → Sign In / Providers → Google**: enable it and paste the client ID and the
   client secret (the secret stays in Supabase).
4. GitHub *environment* **Variable** `GOOGLE_SIGN_IN` = `true`. The next deploy shows «Continuar con Google».
   Players who come in with Google choose their citizen name and country on the next screen.

## 8. Terms of use and privacy policy

The sign-up screen in the canvas asks to accept the terms of use and the privacy policy. Those texts are a
legal decision, so the form does not show the checkbox yet (ADR 0006). When you have both texts, add them to
`docs/legal/` (or send them) and they will be published as pages and linked from the sign-up form.

## 9. Make yourself admin (D07)

Nobody can become an admin through the web or the API. In each Supabase project:

1. Sign up on that environment's web with your email and confirm it.
2. Supabase → **SQL Editor** → run (with your email):

   ```sql
   insert into game.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

3. Reload the web: the bar shows **Administración**. Every action there is recorded in the action log.
   To add someone else later, run the same statement with their email.

## 10. Local development without Docker (ADR 0011)

The database tests run on PostgreSQL installed on your computer, and the web runs against a hosted
**development** project (never staging or production: you will reset it often).

1. **PostgreSQL 17.** In PowerShell: `winget install --id PostgreSQL.PostgreSQL.17 --source winget` (password
   `postgres` for the `postgres` user, port 5432). Check it with `pnpm db:test:native`: it creates a fresh
   `concordia_test` database on every run and must end with «All … files passed». To use another password
   or port, set `PGPASSWORD` or `PGPORT` before running it.
   After changing a migration, `pnpm db:types:native` regenerates `packages/db-types` from that database
   (run `pnpm db:test:native` first so it has every migration).
2. **Development project.** At https://supabase.com/dashboard create a third project, `concordia-dev`, in
   the same region. Under **Project Settings → Data API** leave only `public` exposed, as in step 2.
3. **Its Auth settings** (as in step 6, with these values):
   - *Site URL* `http://localhost:5173`; *Redirect URLs* `http://localhost:5173` and
     `http://localhost:5173/**`.
   - CAPTCHA with *Turnstile* and Cloudflare's test secret `1x0000000000000000000000000000000AA` (always
     passes; the web uses the matching test site key).
   - The built-in email sender is enough for development (it sends a few emails per hour to real
     addresses); Resend is optional here.
4. **Migrations.** In the repository: `npx supabase login`, then
   `npx supabase link --project-ref <the dev project ID>` and `npx supabase db push` (it asks for the
   database password). Repeat `db push` whenever a branch adds migrations.
5. **The web.** In `apps/web/.env.local` set `VITE_SUPABASE_URL` to `https://<project ID>.supabase.co` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` to the project's publishable key (`sb_publishable_...`; never a secret
   key). Then `pnpm --filter @concordia/web dev` and open http://localhost:5173.
6. Docker is no longer needed locally: `pnpm db:stop` and quit Docker Desktop. End-to-end journeys keep
   running in CI.
