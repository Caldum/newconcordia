# @concordia/clock

Cloudflare Worker that triggers the game's scheduled jobs. It holds no game logic: each Cron Trigger maps
to a database job (`src/jobs.ts`) and calls `public.run_job`, which is idempotent per slot (D02, ADR 0002).

| Cron (UTC) | Job | What it does |
| --- | --- | --- |
| `0 3 * * *` | `day_change` | Opens the new game day (00:00 GMT−3) |

- `GET /health` answers `{"status":"ok"}` for uptime checks.
- A failed job makes the invocation fail, so Cloudflare's Worker alerts catch it (`docs/setup.md`).
- Logs are JSON lines (Workers Logs and traces are enabled in `wrangler.jsonc`). They carry job names,
  slots and durations, never personal data.

```bash
pnpm dev            # wrangler dev --test-scheduled (needs .dev.vars, see .dev.vars.example)
pnpm test           # Vitest inside the Workers runtime (@cloudflare/vitest-plugin)
pnpm types          # regenerates worker-configuration.d.ts after changing wrangler.jsonc
```

Trigger a run locally against `pnpm db:start`:

```bash
curl "http://localhost:8787/cdn-cgi/handler/scheduled?cron=0+3+*+*+*&time=1791514800000"
```
