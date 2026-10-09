# Concordia

Juego de estrategia multijugador y persistente en el navegador. Cada jugador es ciudadano de un país real:
trabaja, entrena, combate por regiones reales, vota en elecciones y gobierna.

- **Estado del desarrollo:** [`docs/progreso.md`](docs/progreso.md)
- **Brief de desarrollo:** [`docs/brief.md`](docs/brief.md) · **Diseño del juego:** [`docs/gdd.md`](docs/gdd.md)
- **Pasos pendientes del dueño (cuentas y credenciales):** [`docs/setup.md`](docs/setup.md)
- **Decisiones de arquitectura:** [`docs/adr/`](docs/adr/)
- **Guía para agentes y personas que retoman el trabajo:** [`CLAUDE.md`](CLAUDE.md)

## Estructura

| Ruta | Contenido |
| --- | --- |
| `apps/web/` | SPA de React: landing, juego y panel de administración |
| `apps/reloj/` | Worker de Cloudflare con las tareas programadas |
| `supabase/` | Migraciones, pruebas pgTAP, Edge Functions y semillas |
| `packages/atlas/` | Design system Atlas en código |
| `packages/tipos/` | Tipos generados desde la base |
| `datos/mapa/` | Scripts del mapa y TopoJSON por regiones |
| `docs/` | Brief, GDD, voz, diseño (canvas, Atlas, recursos), ADR, progreso, setup, runbook |
| `.claude/skills/` | Skills de terceros usados por el equipo (ver `docs/skills.md`) |

## Licencias de terceros

- Geometría del mapa: Natural Earth (dominio público).
- Banderas simplificadas: basadas en lipis/flag-icons (MIT).
- Skills en `.claude/skills/`: cada carpeta trae su `LICENSE` y su `SOURCE.md`.
