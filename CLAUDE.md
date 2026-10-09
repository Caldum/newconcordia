# Concordia · memoria del proyecto

Juego de estrategia multijugador y persistente en el navegador. Cada jugador es ciudadano de un país real:
trabaja, entrena, combate por regiones reales, vota y gobierna. Este archivo resume lo esencial; el detalle
vive en `docs/`.

## Al empezar una sesión

1. Lee `docs/progreso.md` y los PR abiertos. Continúa desde el último punto empujado.
2. Si la tarea toca reglas o pantallas, lee la fuente de verdad correspondiente (abajo).
3. Lee el `SKILL.md` que corresponda en `.claude/skills/` antes de cada tipo de tarea (ver «Skills»).

## Fuentes de verdad (gana la de arriba)

1. `docs/brief.md`, sobre todo la sección 3 (decisiones posteriores al GDD).
2. Canvas de pantallas: `docs/design/canvas/*.dc.html` (referencia visual y de comportamiento, no código).
3. Design system Atlas: `docs/design/atlas/` (`tokens.json`, `README.md`, `components/*`).
4. Documento de diseño: `docs/gdd.md` (reglas, balance, plan D01–D30).
5. Mapa: `datos/mapa/` (`regions_map.py`, `world-regions.json`).

Textos de interfaz: `docs/voz.md`. Términos juego ↔ código: `docs/glosario.md`. Decisiones: `docs/adr/`.

## Decisiones vigentes que mandan sobre el GDD

- Solo web de escritorio adaptable (hasta 1320 px, usable desde 360 px). Sin app móvil.
- Español neutro con tuteo; nunca voseo. Sin atajos de teclado. Sin modo oscuro. WCAG 2.2 AA.
- Ciudadanía inmediata al registrarse. 7 días de adaptación: daño al 50 % y sin voto en elecciones.
- Registro: correo, contraseña, nombre de ciudadano (único, inmutable) y país. Turnstile y Google.
- País fuera de juego: lista de espera por país + elegir otro para empezar; al abrir puede mudarse
  conservando nivel, fuerza, Oro, objetos y empresas.
- Cambio de ciudadanía: lo pide al otro país; automático o revisión del ministro del Interior según su ley;
  sin respuesta en 72 h se aprueba solo. Pierde cargos y banca. Máximo uno cada 30 días.
- Leyes: votan solo los 20 congresistas durante 24 h; gana más a favor que en contra. Empate: la
  vicepresidenta tiene 12 h y su voto define en el momento; si no vota, la ley se cae. El presidente no vota.
- Elecciones ciudadanas cada 15 días alternando Congreso y presidencia; mandatos de 30 días.
- Economía: fundar empresa 20 Oro. Ración = 1 trigo + 2 puntos; arma Q = Q hierro + Q puntos;
  combustible = 1 petróleo + 0,5 puntos. Región sin yacimiento 50 %, +15 % por nivel.
- Bancos por licitación (2 licencias por ronda). Puntaje = garantía/10 + 20 × tasa depósito − 10 × tasa préstamo.
- Daño = 50 × (1 + √fuerza/10) × (1 + 0,03 × rango) × arma × bonificaciones. Caso de prueba: 633 por golpe.
- Batalla de hasta 5 rondas de 4 h; gana quien gane 3.
- Misiones diarias: trabajar, entrenar, 5 golpes, leer un artículo. 1 Oro; 7 días seguidos, 3 Oro extra.

## Reglas de ingeniería que no se negocian

- **La base es la autoridad.** Reglas en funciones PL/pgSQL (`security definer`, `set search_path = ''`,
  nombres calificados). RLS activo en todas las tablas, negar por defecto. El cliente no tiene
  `insert/update/delete` sobre tablas: solo `execute` sobre funciones públicas. El navegador nunca decide
  saldos, daño, votos ni permisos.
- Una acción = una transacción, con validación de permisos, frecuencia y estado, y clave de idempotencia.
- Dinero en libro de doble entrada, `bigint` de centésimos, sin saldos negativos.
- Tiempo en `timestamptz` UTC. El día de juego (GMT−3 fijo) sale solo de `game.game_day()`.
  El reloj es inyectable para pruebas (`game.now()`).
- Ningún número mágico: parámetros de balance en la tabla `game.balance_params`.
- Toda acción de administración queda auditada (quién, qué, cuándo, antes y después).
- Secretos solo en GitHub Secrets o Wrangler. La `service_role` nunca llega al cliente.
- Migraciones hacia adelante, revisadas con squawk, con plan de vuelta escrito en la cabecera.

## Stack

pnpm workspaces · Node 24 LTS (`.nvmrc`) · TypeScript 6 estricto (`noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`) · React 19 + Vite (SPA) · TanStack Router y Query · CSS Modules con tokens
de Atlas · zod en los bordes · d3-geo + topojson-client · Supabase (Postgres, Auth, Realtime, Edge
Functions) · Cloudflare Workers (web con assets y `apps/reloj` con Cron) · Resend · Sentry.

```text
apps/web/              React: landing, juego y panel de administración
apps/reloj/            Worker de Cloudflare con las tareas programadas
supabase/migrations/   tablas, funciones y permisos, en SQL
supabase/tests/        pruebas pgTAP
supabase/functions/    Edge Functions (correos)
supabase/seed.sql      datos de desarrollo local
packages/tipos/        tipos generados desde la base
packages/atlas/        tokens, estilos base y componentes de Atlas
datos/mapa/            scripts del mapa y TopoJSON
docs/                  brief, GDD, voz, diseño, ADR, progreso, setup, runbook
```

## Idioma

Código, tablas, columnas, commits (Conventional Commits) y comentarios en inglés. Textos de interfaz en
español neutro, agrupados por pantalla en archivos `messages.ts`, nunca dispersos en los componentes.

## Comandos

```bash
pnpm install                 # dependencias (Node 24, pnpm 10)
pnpm lint                    # ESLint + Prettier, cero advertencias
pnpm typecheck               # tsc en todos los paquetes
pnpm test                    # Vitest en todos los paquetes
pnpm build                   # build de producción
pnpm db:start                # Supabase local (Docker)
pnpm db:test                 # pgTAP: supabase test db
pnpm db:lint                 # squawk sobre las migraciones
pnpm db:types                # regenera packages/tipos desde la base local
pnpm --filter @concordia/web e2e   # Playwright + axe
```

## Forma de trabajo

- Ramas: `main` es producción (no se toca). `develop` es la rama de integración. Cada módulo D en su
  rama `feat/dNN-nombre` desde `develop`, con PR hacia `develop` y squash al fusionar.
- Empuja temprano y seguido; PR en borrador desde el primer empuje; `docs/progreso.md` al día en cada empuje.
- Cada regla del juego tiene su prueba antes que su pantalla (TDD). Cada PR: plan breve, migraciones,
  funciones, pruebas, pantallas, docs y la prueba de aceptación del GDD.
- Se fusiona solo con CI verde y revisión sin hallazgos. No se fusionan cambios destructivos de datos,
  permisos que abran acceso, secretos o infraestructura de producción: quedan en PR para el usuario.
- Decisión ambigua: la opción más razonable, registrada en un ADR (`docs/adr/NNNN-titulo.md`).
- Lo que dependa de cuentas del usuario va como paso concreto en `docs/setup.md`.

## Skills (`.claude/skills/`, origen en cada `SOURCE.md`, índice en `docs/skills.md`)

- Al empezar cada módulo: `writing-plans`; en cada regla: `test-driven-development`.
- Antes de SQL: `supabase-postgres-best-practices` y `supabase`.
- Antes del Worker o Wrangler: `workers-best-practices`, `wrangler`, `cloudflare`.
- Antes de cada pantalla: `game-ui-design`, `react-best-practices`, `composition-patterns`, `accessibility`.
  Al cerrarla: `web-quality-audit`. Landing: `seo`, `core-web-vitals`.
- Antes de cada PR: `verification-before-completion`, `requesting-code-review`, `differential-review`.
  Al agregar dependencias: `supply-chain-risk-auditor`.
- Ante cualquier fallo: `systematic-debugging` antes de cambiar código.
- Textos: `humanizer` junto con `docs/voz.md`.
