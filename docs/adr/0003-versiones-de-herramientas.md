# 0003 · Versiones de herramientas y enrutado

Fecha: 2026-10-09 · Estado: Aceptada

## Contexto

Al empezar (octubre de 2026) las últimas versiones no siempre son compatibles entre sí.

## Decisión

| Herramienta | Versión | Motivo |
| --- | --- | --- |
| Node | 24 LTS (`.nvmrc`, `engines`) | LTS activa |
| pnpm | 10.28 | Estable; la 12 es mayor y reciente |
| TypeScript | 6.0 | `typescript-eslint` 8 admite hasta `<6.1`; TypeScript 7 todavía no |
| ESLint | 9.39 | `eslint-plugin-jsx-a11y` todavía no declara ESLint 10 |
| Vitest | 4.1 | `@cloudflare/vitest-pool-workers` exige Vitest 4.1 para probar los Workers con el mismo runner |
| Vite | 8 | Requerido por `@vitejs/plugin-react` 6 |
| Postgres | 17 | Versión por defecto de Supabase |

Enrutado: TanStack Router **definido en código** (`createRoute`) en lugar de rutas por archivos. Se evita un
archivo generado que el CI tendría que regenerar y comparar, y se mantiene el tipado completo. La división
de código por ruta se hace con `lazyRouteComponent`.

## Consecuencias

Dependabot propone las subidas mayores; cada una se acepta cuando sus dependencias lo permitan.
