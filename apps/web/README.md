# @concordia/web

React 19 SPA built with Vite: landing, game and admin panel. Served by Cloudflare Workers static assets,
with SPA fallback and the security headers in `public/_headers`.

```bash
pnpm dev            # dev server on http://localhost:5173
pnpm test           # Vitest (jsdom)
pnpm test:coverage  # with the 80 % coverage floor
pnpm build          # production build in dist/
pnpm size           # initial JavaScript budget (170 kB brotli)
pnpm e2e            # Playwright + axe against `wrangler dev` with the real build
```

- Routes live in `src/router.tsx` (TanStack Router defined in code, ADR 0003). URL paths are English.
- Each screen lives in `src/pages/<screen>/` with its `messages.ts`: Spanish (source) and English copy,
  declared with `defineMessages` so a missing translation is a type error (ADR 0005).
- `src/i18n/`: locale detection (saved choice, browser languages, Spanish), the provider that keeps
  `<html lang>` in sync, and `Intl` formatting helpers.
- Where Chromium is preinstalled: `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome pnpm e2e`.
