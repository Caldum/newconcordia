# D01 · Repositorio y entrega automática

**Objetivo:** que un cambio mínimo pase lint, tipos, pruebas, pgTAP y build en cada PR, llegue solo al
entorno de pruebas al fusionar en `develop` y a producción al fusionar en `main` con aprobación manual.

**Prueba de aceptación (GDD):** un cambio mínimo pasa las pruebas, llega solo al proyecto de pruebas y, al
aprobarlo, a producción. Los despliegues necesitan las cuentas del dueño (`docs/setup.md`): hasta entonces
el CI salta esos trabajos con un aviso y la prueba se completa cuando existan los secretos.

## Tareas

1. Monorepo: `package.json` raíz, `pnpm-workspace.yaml`, `.npmrc` (engine-strict, versiones exactas),
   `tsconfig.base.json` estricto, ESLint plano (`strictTypeChecked`, `react-hooks`, `jsx-a11y`, orden de
   imports) y Prettier. Prueba: `pnpm lint` y `pnpm typecheck` en verde con cero advertencias.
2. `apps/web` mínima: Vite + React 19 + TanStack Router, una ruta de salud y la 404. Prueba: Vitest
   (componente) y Playwright con axe (sin violaciones).
3. Web en Cloudflare: `wrangler.jsonc` con assets, fallback de SPA y cabeceras de seguridad (`_headers`).
   Prueba: unitaria que lee `_headers` y exige CSP, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
4. Supabase: `supabase/config.toml`, migración base que niega por defecto (revoca privilegios de
   `anon`/`authenticated` sobre `public` y crea el esquema `game` sin acceso directo), pgTAP que lo prueba
   y squawk sobre las migraciones.
5. CI (`.github/workflows/ci.yml`): instalar con caché, lint, tipos, unitarias, pgTAP, squawk, build,
   presupuesto de tamaño, Playwright + axe, `pnpm audit`. CodeQL aparte. Acciones fijadas por SHA y
   permisos mínimos. Un trabajo final `verde` que agrupa todo para la protección de ramas.
6. Entrega (`deploy.yml`): `develop` → migraciones y web al entorno de pruebas; `main` → producción con
   *environment* `production`. Si falta un secreto, el trabajo termina en verde con un aviso.
7. Dependabot (npm y Actions), plantilla de PR, `docs/runbook.md`, `docs/setup.md`, `docs/glosario.md`.
