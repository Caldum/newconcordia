# 0004 · The whole repository is in English

Date: 2026-10-09 · Status: Accepted

## Context

The brief kept Spanish folder names from the GDD (`apps/reloj`, `packages/tipos`, `datos/mapa`) and Spanish
documentation. On October 9 the owner asked for the whole repository to be in English: files, folders, code
naming, READMEs and documentation.

## Decision

- Folders: `apps/clock`, `packages/db-types`, `data/map`, `docs/plans`, `docs/design/tools`,
  `docs/design/assets/{icons,illustrations,logos,silhouettes}`.
- Documents: `docs/brief.md`, `docs/gdd.md`, `docs/voice.md`, `docs/progress.md`, `docs/setup.md`,
  `docs/runbook.md`, `docs/glossary.md`, the ADRs and every README are written in English. The brief and
  the GDD are faithful translations of the Spanish originals (the originals stay in the first commit on
  `main` and in the handoff kit artifact).
- Atlas: tokens, CSS classes and components use English names, with identical values. Mapping:

  | Spanish | English | Spanish | English |
  | --- | --- | --- | --- |
  | `mar`, `mar-profundo` | `sea`, `sea-deep` | `tierra`, `tierra-suave` | `land`, `land-soft` |
  | `tinta` | `ink` | `texto-suave`, `texto-tenue` | `text-muted`, `text-faint` |
  | `linea`, `linea-control` | `line`, `line-control` | `sobre-tinta(-suave)` | `on-ink(-muted)` |
  | `nacion(-profunda/-tinte/-texto)` | `nation(-deep/-tint/-text)` | `sobre-nacion` | `on-nation` |
  | `guerra(-texto/-tinte)` | `war(-text/-tint)` | `positivo`, `aviso` | `positive`, `warning` |
  | `energia(-pista)` | `energy(-track)` | `oro(-borde)` | `gold(-border)` |
  | `pais-xxx`, `pais-fuera` | `country-xxx`, `country-inactive` | `espacio-N`, `radio-*` | `space-N`, `radius-*` |
  | `portada`, `titulo-N` | `display`, `title-N` | `marcador(-xl)`, `cifra` | `score(-xl)`, `figure` |
  | `cuerpo(-l)`, `etiqueta`, `apoyo` | `body(-l)`, `label`, `support` | `topo(-xl/-s)` | `place(-xl/-s)` |
  | `borde-panel`, `flotante`, `foco` | `panel-border`, `floating`, `focus` | `toque-min`, `toque-principal` | `touch-min`, `touch-primary` |
  | `barra-alto`, `pagina-max` | `bar-height`, `page-max` | | |

  Components: Boton → `Button`, Estado → `Status`, Marcador → `Scoreboard`, Silueta → `Silhouette`,
  Pista → `Track`, Campo → `Field`, SelectorPais → `CountryPicker`, Opcion → `Option`,
  Segmentado → `Segmented`, Nota → `Note`, Pasos → `Steps`, Escenario → `Stage`, BarraPais → `CountryBar`,
  Documento → `Document`, Cabecera → `SectionHeader`.
- Canvas screens get English file names; `docs/design/README.md` lists the original names.
- The TopoJSON objects are `regions` and `countries` (they were `regiones` and `paises`).
- Kept as they are: interface copy (Spanish is the source language of the game), region names (proper
  names), and the internal helper markup of the exported `*.dc.html` files.
- Obsolete map scripts from the kit (`build_topo.py`, `preview*.py`, `build_page.py`, an empty
  `package.json`) were removed: they were earlier versions and preview helpers with no use in the project.

## Consequences

- Searching the code for a Spanish game term needs `docs/glossary.md`.
- Branch names already pushed (`feat/d01-repositorio`) keep their name until their PR closes.
