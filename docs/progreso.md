# Progreso

Última actualización: 2026-10-09.

Ramas: `main` (producción, solo cambia con aprobación del dueño) · `develop` (integración) ·
`feat/dNN-*` (una por módulo, PR hacia `develop`).

## Estado por módulo

| Código | Módulo | Fase | Estado | PR |
| --- | --- | --- | --- | --- |
| D01 | Repositorio y entrega automática | 0 · Base | En PR | `feat/d01-repositorio` |
| D02 | Reloj y día de juego | 0 · Base | Pendiente | — |
| — | Atlas en código (`packages/atlas`) | 0 · Base | Pendiente | — |
| D03 | Mundo: países, regiones y dueños | 1 · Mundo y cuentas | Pendiente | — |
| D04 | Mapa del juego | 1 · Mundo y cuentas | Pendiente | — |
| D05 | Cuentas | 1 · Mundo y cuentas | Pendiente | — |
| D06 | Ciudadanía | 1 · Mundo y cuentas | Pendiente | — |
| D07 | Panel de administración | 1 · Mundo y cuentas | Pendiente | — |
| D08 | Perfil y energía | 2 · Economía básica | Pendiente | — |
| D09 | Libro contable y monedas | 2 · Economía básica | Pendiente | — |
| D10 | Empresas y trabajo | 2 · Economía básica | Pendiente | — |
| D11 | Mercado | 2 · Economía básica | Pendiente | — |
| D12 | Productos y consumo | 2 · Economía básica | Pendiente | — |
| D13 | Misiones diarias | 2 · Economía básica | Pendiente | — |
| D14 | Entrenamiento | 3 · Guerra | Pendiente | — |
| D15 | Batallas y rondas | 3 · Guerra | Pendiente | — |
| D16 | Combate y daño | 3 · Guerra | Pendiente | — |
| D17 | Batalla en vivo | 3 · Guerra | Pendiente | — |
| D18 | Conquista y hospitales | 3 · Guerra | Pendiente | — |
| D19 | Partidos y elecciones | 4 · Política | Pendiente | — |
| D20 | Cargos de gobierno | 4 · Política | Pendiente | — |
| D21 | Leyes y votaciones | 4 · Política | Pendiente | — |
| D22 | Recursos y yacimientos | 5 · Economía avanzada | Pendiente | — |
| D23 | Bancos y sociedades | 5 · Economía avanzada | Pendiente | — |
| D24 | Cambio de monedas y emisión | 5 · Economía avanzada | Pendiente | — |
| D25 | Prensa y noticias | 6 · Sociedad y retención | Pendiente | — |
| D26 | Mensajes y notificaciones | 6 · Sociedad y retención | Pendiente | — |
| D27 | Tutorial y logros | 6 · Sociedad y retención | Pendiente | — |
| D28 | Juego limpio | 7 · Beta cerrada | Pendiente | — |
| D29 | Operación y monitoreo | 7 · Beta cerrada | Pendiente | — |
| D30 | Lanzamiento de la beta | 7 · Beta cerrada | Pendiente | — |

## Bitácora

- 2026-10-09 · Commit inicial en `main`: brief, GDD, voz, canvas, Atlas, recursos, mapa y skills.

- 2026-10-09 · D01: monorepo, web base, migración de seguridad, CI, CodeQL, despliegue (omitido sin credenciales).

## Siguiente paso

Terminar D01 (CI verde y fusión) y seguir con D02 en `feat/d02-reloj`.
