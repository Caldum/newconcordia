# Concordia

A persistent multiplayer strategy game in the browser. Every player is a citizen of a real country: they
work, train, fight for real regions, vote in elections and govern.

- **Development status:** [`docs/progress.md`](docs/progress.md)
- **Development brief:** [`docs/brief.md`](docs/brief.md) · **Game design:** [`docs/gdd.md`](docs/gdd.md)
- **Pending owner steps (accounts and credentials):** [`docs/setup.md`](docs/setup.md)
- **Architecture decisions:** [`docs/adr/`](docs/adr/)
- **Guide for agents and people picking up the work:** [`CLAUDE.md`](CLAUDE.md)

## Layout

| Path | Content |
| --- | --- |
| `apps/web/` | React SPA: landing, game and admin panel |
| `apps/clock/` | Cloudflare Worker with the scheduled jobs |
| `supabase/` | Migrations, pgTAP tests, Edge Functions and seeds |
| `packages/atlas/` | The Atlas design system in code |
| `packages/db-types/` | Types generated from the database |
| `data/map/` | Map scripts and the TopoJSON by region |
| `docs/` | Brief, GDD, voice, design references, ADRs, plans, progress, setup, runbook |
| `.claude/skills/` | Third-party skills used by the team (see `docs/skills.md`) |

The interface is available in Spanish (default) and English.

## Third-party licenses

- Map geometry: Natural Earth (public domain).
- Simplified flags: based on lipis/flag-icons (MIT).
- Skills in `.claude/skills/`: each folder has its own `LICENSE` and `SOURCE.md`.
