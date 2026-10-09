# @concordia/web

SPA de React 19 con Vite: landing, juego y panel de administración. Se sirve desde Cloudflare Workers con
*static assets*, *fallback* de SPA y las cabeceras de seguridad de `public/_headers`.

```bash
pnpm dev            # servidor de desarrollo en http://localhost:5173
pnpm test           # Vitest (jsdom)
pnpm test:coverage  # con cobertura mínima del 80 %
pnpm build          # build de producción en dist/
pnpm size           # presupuesto de JavaScript inicial (170 kB brotli)
pnpm e2e            # Playwright + axe contra `wrangler dev` con el build real
```

- Rutas en `src/router.tsx` (TanStack Router definido en código, ADR 0003).
- Cada pantalla vive en `src/pages/<pantalla>/` con su `messages.ts` (textos en español neutro).
- En entornos con Chromium preinstalado: `PLAYWRIGHT_CHROMIUM_PATH=/ruta/a/chrome pnpm e2e`.
