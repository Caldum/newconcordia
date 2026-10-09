# Project skills

Skills live in `.claude/skills/<name>/`, each with its `LICENSE` and a `SOURCE.md` with the source
repository, path and commit. They were copied unchanged on October 9, 2026.

| For | Skills | Source and commit | License |
| --- | --- | --- | --- |
| Way of working | `writing-plans`, `executing-plans`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `finishing-a-development-branch` | obra/superpowers @ 8ca22db | MIT |
| Postgres and Supabase | `supabase-postgres-best-practices`, `supabase` | supabase/agent-skills @ c9be0e9 | MIT |
| Cloudflare | `workers-best-practices`, `wrangler`, `cloudflare`, `turnstile-spin`, `durable-objects`, `web-perf` | cloudflare/skills @ a18ffe2 | Apache 2.0 |
| React | `react-best-practices`, `composition-patterns`, `web-design-guidelines` | vercel-labs/agent-skills @ 063bee9 | MIT (declared in the README and SKILL.md; the repo ships no LICENSE file, so the MIT text is included) |
| Web quality | `accessibility`, `performance`, `core-web-vitals`, `best-practices`, `web-quality-audit`, `seo` | addyosmani/web-quality-skills @ afa8da9 | MIT |
| Game interface | `game-ui-design` | omer-metin/skills-for-antigravity @ e8dcf4e | Apache 2.0 |
| Visual design and browser testing | `frontend-design`, `webapp-testing` | anthropics/skills @ 683bc88 | Apache 2.0 (each skill's LICENSE.txt) |
| Security | `differential-review`, `sharp-edges`, `supply-chain-risk-auditor`, `semgrep` | trailofbits/skills @ 82fe822 | CC BY-SA 4.0, attributed to Trail of Bits |
| Interface copy | `humanizer` | blader/humanizer @ 225a6f3 | MIT |

Notes:

- `semgrep` comes from Trail of Bits' `plugins/static-analysis/skills/semgrep`.
- `accessibility`, `performance` and `seo` are the addyosmani/web-quality-skills ones (omer-metin has skills
  with the same names that are not used).
- The Next.js rules in the Vercel skills do not apply: Concordia is a Vite SPA.
- No skill was left out for licensing reasons.

## When to use each group

- Starting each D module: `writing-plans`, then `test-driven-development` for each rule.
- Before writing SQL: `supabase-postgres-best-practices`. Before the Worker or Wrangler:
  `workers-best-practices` and `wrangler`.
- Before each screen: `game-ui-design`, `react-best-practices` and `accessibility`. When closing it:
  `web-quality-audit`.
- Before opening each PR: `verification-before-completion`, `requesting-code-review` and
  `differential-review`. When adding dependencies: `supply-chain-risk-auditor`.
- On any failure: `systematic-debugging` before changing code.
