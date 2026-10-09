# Concordia · Brief de desarrollo

Versión 1 · 8 de octubre de 2026 · Preparado para la sesión de Claude en la nube que construye el juego.

Concordia es un juego de estrategia multijugador y persistente en el navegador. Cada jugador es ciudadano de un país real: trabaja, entrena, combate por regiones reales, vota en elecciones y gobierna. El diseño del juego, la interfaz y el sistema visual ya están hechos. Tu trabajo es construirlo en el repositorio **Caldum/newconcordia** (hoy vacío, rama `main`), con el nivel de un equipo senior con más de 10 años de experiencia en desarrollo web, bases de datos e infraestructura.

---

## 1. Fuentes de verdad y orden de prioridad

Cuando dos fuentes choquen, gana la de arriba:

1. **Este brief**, sobre todo la sección 3 (decisiones posteriores al documento de diseño).
2. **Canvas de interfaz** «Concordia – Diseño de la app»: 52 pantallas de escritorio adaptable. https://claude.ai/artifact/E9HTeZ6v7FEpX6goibq1k9
3. **Design system Atlas de Concordia**: tokens, componentes, marca e ilustraciones. https://claude.ai/artifact/XPws22DAhLW4kjGiDxDvg1
4. **Documento de diseño del juego** (reglas, balance, arquitectura y plan D01–D30). https://claude.ai/artifact/8wyzu8V8avR2hxJFKtWKUr (copia en el kit: `docs/gdd.md`)
5. **Mapa de Concordia** (TopoJSON por regiones y prototipo de landing). https://claude.ai/artifact/LaFKVR97EpeqUDEjbTj9Ug

**Kit de traspaso.** Todo lo anterior, más los scripts del mapa y la guía de voz, está publicado como archivos bajo `kit/` en el artifact «Concordia · Kit de traspaso» (el enlace viene en el prompt de esta sesión). Léelo con la herramienta Artifact: primero `action: "read"` con `path: "kit/MANIFIESTO.txt"`, que lista las 198 rutas, y después una sola llamada `read` con `paths` (todas las rutas) y `out_dir` apuntando a un directorio temporal. Si no puedes leer artifacts, detente y avisa al usuario: sin el kit faltan el mapa y las pantallas.

Contenido del kit (todas las rutas cuelgan de `kit/`):

| Ruta en el kit | Qué es | Dónde va en el repo |
| --- | --- | --- |
| `BRIEF.md` | Este documento | `docs/brief.md` |
| `docs/gdd.md` | Documento de diseño completo | `docs/gdd.md` |
| `docs/voz.md` | Guía de voz y textos de interfaz | `docs/voz.md` |
| `design/canvas/*.dc.html`, `canvas.json` | Las 52 pantallas (HTML con estilos en línea y la lógica de cada estado) | `docs/design/canvas/` |
| `design/atlas/` | `tokens.json`, `README.md` (manual de marca), `components/*` y `bundle.css` | `docs/design/atlas/` |
| `design/assets/` | Logo (3 SVG), 7 ilustraciones de sección, 21 siluetas, 58 íconos | `apps/web/src/assets/` cuando se usen |
| `mapa/` | Scripts de Python que generan el TopoJSON desde Natural Earth, `regions_map.py` (países activos y regiones con código fijo) y `world-regions.json` ya generado | `datos/mapa/` |
| `tools/flags.py` | Banderas simplificadas usadas en el selector de país | Referencia para un componente `Bandera` |

Las pantallas `.dc.html` son la referencia visual y de comportamiento, no código para copiar: tienen estilos en línea por exigencias del editor. Recréalas como componentes React con los tokens de Atlas.

---

## 2. Rol y estándar

Actúa como un equipo senior: líder técnico, ingeniero de frontend, ingeniero de bases de datos, SRE y especialista en accesibilidad. Cada cambio tiene que poder defenderse en una revisión de código exigente.

- **Correcto antes que rápido.** Cada regla del juego tiene su prueba antes de su pantalla.
- **Simple y legible.** Nombres claros, funciones cortas, módulos con una sola responsabilidad, sin abstracciones especulativas. El código se lee como prosa técnica.
- **Seguro por defecto.** El servidor es la autoridad. El navegador nunca decide saldos, daño, votos ni permisos.
- **Medible.** Presupuestos de rendimiento, cobertura y accesibilidad verificados en CI, no prometidos.
- **Reversible.** Migraciones hacia adelante con plan de vuelta, despliegues con rollback, nada destructivo sin aprobación del usuario.
- **Documentado donde se usa.** ADR por decisión importante, README por paquete, comentarios solo cuando el *por qué* no es obvio.

---

## 3. Decisiones posteriores al documento de diseño (mandan sobre el GDD)

Estas reglas se fijaron al diseñar las pantallas. Cuando el GDD diga otra cosa, gana esta lista. Actualiza el GDD en `docs/gdd.md` en el mismo PR que implemente cada regla.

**Plataforma y lenguaje**
- Solo web de escritorio adaptable: el contenido llega a 1320 px y se reacomoda en columnas al reducir la ventana. No hay versión móvil propia ni app nativa. Debe seguir siendo usable a partir de 360 px, pero no se diseña para el teléfono.
- La interfaz está en **español neutro con tuteo** (nunca voseo ni regionalismos). Ver `docs/voz.md`, que incluye reglas para que los textos no suenen escritos por IA.
- **No hay atajos de teclado.** Todo se alcanza con Tab y el foco siempre se ve, pero ninguna acción tiene tecla propia.

**Registro y ciudadanía**
- La ciudadanía es inmediata al registrarse: sin aprobación ni estado de residente.
- Los primeros 7 días son de adaptación: el daño en guerra cuenta al 50 % y no se vota en elecciones. Todo lo demás se puede hacer desde el primer día.
- El registro pide correo, contraseña, nombre del ciudadano (único y no se puede cambiar) y país. Usa Turnstile y ofrece Google.
- Si el país elegido no está en juego, un segundo paso lo dice y anota al jugador en una **lista de espera** de ese país. Le avisaremos por correo cuando se habilite. Mientras tanto elige otro país para empezar y, cuando el suyo abra, puede mudarse conservando nivel, fuerza, Oro, objetos y empresas.
- El cambio de ciudadanía posterior se pide al otro país. Según sus leyes, se aprueba automáticamente o lo revisa su ministro del Interior. Si no responde en 72 horas, se aprueba solo. Al irse, el jugador pierde cargos y banca. Máximo un cambio cada 30 días.
- El selector de país es un contenedor con buscador y una cuadrícula de **banderas** con el nombre debajo.

**Política**
- Las leyes las votan **solo los 20 congresistas**, durante 24 horas. Se aprueba con más votos a favor que en contra.
- Si al cierre hay empate, la **vicepresidenta** (o el vicepresidente) tiene 12 horas para desempatar. En cuanto vota, la ley queda aprobada o rechazada. Si no vota en ese plazo, la ley **se cae**.
- **El presidente no vota nunca.**
- Proponen leyes los congresistas y los ministros, cada uno en su área. El presidente puede proponer guerra y paz.
- El presidente nombra vicepresidente, ministros y embajadores, y puede cambiarlos durante el mandato.
- Los ciudadanos votan en las elecciones (cada 15 días, alternando Congreso y presidencia; mandatos de 30 días).

**Economía**
- Fundar una empresa cuesta 20 Oro.
- Recetas: ración = 1 trigo + 2 puntos de trabajo; arma de calidad Q = Q hierro + Q puntos; combustible = 1 petróleo + 0,5 puntos.
- Rendimiento de una región sin yacimiento: 50 %. Cada nivel de yacimiento suma 15 %.
- Bancos privados por **licitación** del Banco Central: 2 licencias por ronda. Puntaje = garantía / 10 + 20 × tasa de depósito − 10 × tasa de préstamo. Cada banco puede captar hasta 5 veces su garantía y pagar como máximo 3 % por semana. Si quiebra, su garantía se reparte entre los depositantes según lo que tenía cada uno.

**Guerra**
- Daño por golpe = 50 × (1 + √fuerza / 10) × (1 + 0,03 × rango) × arma × bonificaciones (fórmula del GDD, módulo 6). Las pantallas usan como ejemplo fuerza 1.840, factor de rango 1,36, bonificación de resistencia 1,1 y arma Q3 ×1,6, que dan 633 por golpe. Usa ese caso como prueba.
- Batalla de hasta 5 rondas de 4 horas; gana quien gane 3.

**Retención**
- Cuatro misiones diarias: trabajar, entrenar, dar 5 golpes y leer un artículo (ya no «votar», porque los ciudadanos no votan leyes). Completarlas da 1 Oro; 7 días seguidos dan 3 Oro extra.

---

## 4. Arquitectura y stack

Se mantiene la arquitectura del GDD (módulo 11): **monolito modular** con Supabase para datos, cuentas y tiempo real, y Cloudflare para servir la web y disparar tareas. Presupuesto inicial de US$ 0. Estos son los ajustes de nivel senior sobre esa base:

| Capa | Elección | Notas |
| --- | --- | --- |
| Monorepo | pnpm workspaces, Node LTS fijado en `.nvmrc` y `engines` | Sin Turborepo hasta que el tiempo de CI lo justifique |
| Lenguaje | TypeScript `strict` (más `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`) y SQL | Tipos de la base generados con `supabase gen types` en `packages/tipos` |
| Web | React 19 con Vite como SPA | Rutas con TanStack Router (tipadas, con carga por ruta y división de código) |
| Datos en la web | TanStack Query sobre `supabase-js` | Sin estado global extra salvo que haga falta; la base es la fuente |
| Estilos | CSS Modules con los tokens de Atlas como variables CSS | Un script genera `tokens.css` desde `tokens.json`. Sin Tailwind ni librerías de componentes visuales |
| Componentes | Propios, siguiendo los README de Atlas | Accesibles por construcción (roles, estados ARIA, foco) |
| Validación | zod en los bordes (formularios, respuestas RPC) | Los esquemas no duplican reglas de negocio, que viven en la base |
| Mapa | SVG con d3-geo y topojson-client, en un componente aislado | El TopoJSON se sirve como archivo estático con hash y caché inmutable |
| Reglas del juego | Funciones PL/pgSQL llamadas por RPC | Una acción = una transacción. `SECURITY DEFINER` con `set search_path = ''` y nombres calificados |
| Permisos | RLS activo en todas las tablas, negar por defecto | El cliente no tiene `insert/update/delete` sobre tablas; solo `execute` sobre funciones públicas |
| Dinero | Libro contable de doble entrada | Montos en `bigint` de centésimos. Restricciones que impiden saldos negativos y asientos desbalanceados |
| Tiempo | `timestamptz` en UTC | El día de juego (GMT−3 fijo, `Etc/GMT+3`) sale de una sola función. Reloj inyectable para pruebas |
| Tiempo real | Supabase Realtime, un canal por batalla | Marcador sumado cada pocos segundos, no por golpe |
| Tareas | Cloudflare Worker `apps/reloj` con Cron Triggers | Llama a funciones idempotentes: una tabla de ejecuciones con clave única por tarea y franja |
| Cuentas | Supabase Auth con CAPTCHA de Turnstile y Google | SMTP propio con Resend para los correos de Auth |
| Correos de juego | Edge Function + Resend | Lista de espera, avisos |
| Web en producción | Cloudflare Workers con assets estáticos y fallback de SPA | Cabeceras de seguridad (CSP estricta, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) |
| Errores | Sentry en la web y en el Worker | Sin datos personales en los eventos |
| Copias | GitHub Action diaria con `pg_dump` cifrado | Guardado en Cloudflare R2; restauración probada una vez por mes |

Estructura del repositorio (del GDD, con nombres de carpetas en español como allí se definieron):

```text
apps/web/              React: landing, juego y panel de administración
apps/reloj/            Worker de Cloudflare con las tareas programadas
supabase/migrations/   tablas, funciones y permisos, en SQL
supabase/tests/        pruebas pgTAP de las reglas
supabase/functions/    Edge Functions (correos)
supabase/seed.sql      países, regiones y parámetros de balance
packages/tipos/        tipos generados desde la base
packages/atlas/        tokens y estilos base de Atlas
datos/mapa/            scripts del mapa y TopoJSON generado
docs/                  brief, GDD, voz, diseño, ADR y progreso
```

**Idioma del código.** Identificadores, nombres de tablas y columnas, commits y comentarios en inglés. Textos de interfaz en español neutro, agrupados por pantalla en archivos de mensajes (no dispersos en los componentes). Mantén en `docs/glosario.md` la correspondencia entre términos del juego y nombres del código (Oro → `gold`, Crédito → `credit`, ración → `ration`, golpe → `hit`, banca → `seat`…).

---

## 5. Estándares de ingeniería

**Código**
- ESLint (configuración plana) con `typescript-eslint` `strictTypeChecked`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y` y orden de imports. Prettier para formato. Cero advertencias en CI.
- Nada de `any`. Los errores esperables se modelan como resultados tipados, no como excepciones genéricas.
- Componentes pequeños y presentacionales; la lógica de datos en hooks por dominio (`useWork`, `useBattle`…).
- Sin código muerto, sin TODO sin issue, sin dependencias que no se usen. Cada dependencia nueva se justifica en el PR.

**Base de datos**
- Cambios solo por migraciones versionadas en el repo, revisadas con `squawk` (o equivalente) y probadas en el proyecto de pruebas antes de producción.
- Claves foráneas, `check`, `not null` y `unique` expresan las reglas que se pueden expresar. Índices para cada consulta frecuente, justificados con `explain`.
- Una tabla de parámetros de balance (GDD módulo 12); ningún número mágico en las funciones.
- Cada acción del jugador valida permisos, límites de frecuencia y estado en la misma función, y acepta una clave de idempotencia.
- Toda acción de administración se registra: quién, qué, cuándo, antes y después.
- La energía y el cambio de día se calculan al entrar el jugador; ninguna tarea recorre a todos los jugadores.
- Respeta las reglas del GDD para no exceder el plan gratuito (daño sumado por jugador y batalla, tiempo real solo en batalla).

**Seguridad**
- OWASP ASVS nivel 2 como checklist. Secretos solo en GitHub Secrets y en Wrangler; nunca en el repo ni en el navegador (la clave `service_role` jamás llega al cliente).
- Revisión de cada función `SECURITY DEFINER` y de cada política RLS con pruebas pgTAP que intentan saltárselas.
- Dependencias con Dependabot o Renovate, `pnpm audit` y CodeQL en CI. Acciones de GitHub fijadas por SHA, con permisos mínimos.

**Accesibilidad (WCAG 2.2 AA)**
- HTML semántico primero; ARIA solo donde el HTML no alcanza.
- Foco visible (anillo de 3 px `info` con halo blanco), orden lógico, áreas táctiles de 44 px como mínimo y 56 px en botones principales.
- El color nunca es la única señal. Contraste de 4,5:1 en texto y 3:1 en bordes de controles.
- `prefers-reduced-motion` respetado; ninguna animación dura más de 500 ms.
- Avisos en regiones `aria-live`, formularios con errores asociados a su campo.
- Pruebas automáticas con `@axe-core/playwright` en cada pantalla y revisión manual con teclado y lector de pantalla en los flujos críticos.

**Rendimiento**
- Presupuestos en CI: JavaScript inicial de la app ≤ 170 kB comprimido; landing con LCP < 2,5 s, INP < 200 ms y CLS < 0,1 en Lighthouse CI con perfil móvil lento.
- El mapa (0,9 MB) se carga diferido y con caché inmutable. Las fuentes se cargan con `font-display: swap` y subconjunto latino.
- Cada consulta de la web pide solo las columnas que usa y está paginada.

**Pruebas**
- pgTAP para cada función y política de la base (incluye casos de abuso).
- Vitest y Testing Library para hooks y componentes.
- Playwright para los recorridos completos de cada módulo D, más la prueba de aceptación que el GDD define para ese módulo.
- Reloj simulado para todo lo que depende del tiempo (rondas, 72 horas, recarga de energía).
- Cobertura mínima: 90 % en funciones SQL de reglas, 80 % en la web.

**CI/CD (GitHub Actions)**
- En cada PR: instalar con caché, lint, tipos, pruebas unitarias, pgTAP contra Postgres local (Supabase CLI), build, presupuestos de tamaño, Playwright con axe, revisión de migraciones y CodeQL.
- Al fusionar en `main`: migraciones y despliegue al entorno de pruebas. Producción con aprobación manual en un *environment* protegido.
- Los trabajos que necesitan secretos se saltean con un aviso claro si el secreto todavía no existe, para que el CI sea verde mientras el usuario crea las cuentas.

**Operación**
- Registro estructurado en el Worker; tabla de ejecuciones de tareas con duración y resultado; ruta de salud.
- Alertas básicas: tarea programada que falla, errores nuevos en Sentry, base cerca de los límites del plan.
- `docs/runbook.md` con cómo desplegar, revertir, restaurar una copia y rotar secretos.

---

## 6. Interfaz: implementar Atlas fielmente

- Los tokens de `docs/design/atlas/tokens.json` son la única fuente de colores, tipos, espacios, radios y sombras. Genera `packages/atlas/tokens.css` desde ese archivo con un script y una prueba que falle si se desincronizan.
- Tipografía: Archivo (títulos 800 con ancho 112 a 122 %, cifras 800 al 124 % y tabulares) y EB Garamond itálica solo para nombres de lugar.
- Superficies: `tierra` para lo cotidiano, `tinta` para decisiones y marcadores, `nacion` para lo propio, `mar-profundo` para el mapa. Paneles planos con borde interior de 1 px y sin sombra.
- Los componentes de Atlas (`Boton`, `Estado`, `Marcador`, `Silueta`, `Pista`, `Campo`, `SelectorPais`, `Opcion`, `Segmentado`, `Nota`, `Pasos`, `Panel`, `Escenario`, `BarraPais`, `Documento`, `Cabecera`) se construyen primero, con historias de ejemplo y pruebas de accesibilidad.
- Cada pantalla del canvas se recrea con esos componentes. Usa sus estados de ejemplo (las propiedades `data-props` y la lógica `renderVals`) como casos de prueba.
- Logo: mapa circular de ocho regiones con una en disputa (rojo, o el color del país del jugador dentro del juego). Las ilustraciones de sección solo van en el componente Cabecera.
- Textos: copia los del canvas, que ya están revisados. Todo texto nuevo sigue `docs/voz.md`.
- Sin modo oscuro. Sin atajos de teclado.

---

## 7. Skills que tienes que usar

Instálalos en `.claude/skills/` del repositorio (cada uno en su carpeta, con su `LICENSE` y un `SOURCE.md` con el repositorio y el commit de origen), para que también los tengan las próximas sesiones. Copia solo los que su licencia permita redistribuir; si una licencia no lo permite o no está clara, no lo copies: clónalo en un directorio temporal, léelo desde ahí y anótalo en `docs/skills.md`. Lee el `SKILL.md` correspondiente antes de cada tipo de tarea, aunque la sesión no los cargue sola.

| Para qué | Skills | Origen (commit revisado) |
| --- | --- | --- |
| Forma de trabajar: planificar, TDD, depurar, verificar antes de dar algo por terminado, revisión de código | `writing-plans`, `executing-plans`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `finishing-a-development-branch` | [obra/superpowers](https://github.com/obra/superpowers) @ 8ca22db (MIT) |
| Postgres y Supabase: esquema, RLS, índices, funciones, Auth, Realtime, Edge Functions | `supabase-postgres-best-practices`, `supabase` | [supabase/agent-skills](https://github.com/supabase/agent-skills) @ c9be0e9 (MIT) |
| Cloudflare: Workers, Wrangler, Cron, Turnstile, Durable Objects (si Realtime no alcanza), rendimiento web | `workers-best-practices`, `wrangler`, `cloudflare`, `turnstile-spin`, `durable-objects`, `web-perf` | [cloudflare/skills](https://github.com/cloudflare/skills) @ a18ffe2 |
| React: rendimiento, composición de componentes, guías de interfaz | `react-best-practices`, `composition-patterns`, `web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) @ 063bee9 (las partes de Next.js no aplican: es una SPA con Vite) |
| Calidad web: accesibilidad, Core Web Vitals, buenas prácticas, auditoría | `accessibility`, `performance`, `core-web-vitals`, `best-practices`, `web-quality-audit`, `seo` (solo landing) | [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills) @ afa8da9 (MIT) |
| Interfaz de juego y diseño visual | `game-ui-design`, `frontend-design` | [omer-metin/skills-for-antigravity](https://github.com/omer-metin/skills-for-antigravity) @ e8dcf4e (Apache 2.0) y [anthropics/skills](https://github.com/anthropics/skills) @ 683bc88 |
| Pruebas de la web en navegador | `webapp-testing` | [anthropics/skills](https://github.com/anthropics/skills) @ 683bc88 |
| Seguridad: revisión de diferencias, APIs peligrosas, cadena de suministro, análisis estático | `differential-review`, `sharp-edges`, `supply-chain-risk-auditor`, `semgrep` | [trailofbits/skills](https://github.com/trailofbits/skills) @ 82fe822 (CC BY-SA 4.0: conserva atribución y licencia) |
| Textos de interfaz | `humanizer`, junto con `docs/voz.md` | [blader/humanizer](https://github.com/blader/humanizer) @ 225a6f3 (MIT) |

Cuándo usar cada grupo:
- Al empezar cada módulo D: `writing-plans`, y después `test-driven-development` en cada regla.
- Antes de escribir SQL: `supabase-postgres-best-practices`. Antes de tocar el Worker o Wrangler: `workers-best-practices` y `wrangler`.
- Antes de cada pantalla: `game-ui-design`, `react-best-practices` y `accessibility`. Al cerrar la pantalla: `web-quality-audit`.
- Antes de abrir cada PR: `verification-before-completion`, `requesting-code-review` y `differential-review`. Al agregar dependencias: `supply-chain-risk-auditor`.
- Ante cualquier fallo: `systematic-debugging` antes de cambiar código.

---

## 8. Forma de trabajo

1. **Arranque.** Pide acceso de escritura a `Caldum/newconcordia` con `add_repo` (`access: "push"`), clónalo y llama a `register_repo_root`. Lee el kit, copia sus archivos a las rutas de la tabla de la sección 1 e instala los skills de la sección 7.
2. **Memoria del proyecto.** Crea `CLAUDE.md` en la raíz con lo esencial de este brief (prioridades, decisiones de la sección 3, stack, estándares, comandos, forma de trabajo) en menos de 200 líneas, apuntando a `docs/` para el detalle. Crea `docs/progreso.md` con la tabla D01–D30 y mantenla al día.
3. **Commit inicial** en `main` (el repositorio está vacío): documentación, kit, skills, `CLAUDE.md`, `README.md`, `.editorconfig`, `.gitignore`, `.nvmrc`. **Empújalo a GitHub en cuanto esté listo**, antes de empezar D01. Desde ahí, todo por ramas y PR.
   - **Empuja temprano y seguido.** La sesión puede cortarse en cualquier momento (por ejemplo, por límite de uso) y lo que no esté en GitHub se pierde. Empuja la rama del módulo después de cada avance con pruebas verdes y abre el PR como borrador desde el primer empuje. Actualiza `docs/progreso.md` en cada empuje para que otra sesión pueda retomar desde ahí.
   - **Al retomar**, lee primero `docs/progreso.md` y los PR abiertos, y continúa desde el último punto empujado en lugar de empezar de nuevo.
4. **Un módulo D por rama y PR**, en el orden de dependencias del GDD. Cada PR incluye: plan breve, migraciones, funciones, pruebas, pantallas, documentación actualizada y la prueba de aceptación del GDD pasando. Commits con Conventional Commits.
5. **Fusiona tú mismo** (squash) cuando el CI está verde, la revisión con los skills de la sección 7 no deja hallazgos sin resolver y la prueba de aceptación pasa. **No fusiones** y deja el PR para el usuario si incluye: borrado o reescritura de datos, cambios de permisos o RLS que abren acceso, cambios en secretos o en la infraestructura de producción, o una dependencia con licencia que no sea permisiva.
6. **ADR** en `docs/adr/` por cada decisión que cambie la arquitectura o se aparte de este brief, con contexto, opciones y consecuencias.
7. **Cuando algo depende del usuario**, no lo inventes ni lo saltees en silencio: déjalo listo hasta donde se pueda sin credenciales, anótalo en `docs/setup.md` como un paso concreto y sigue con lo que no dependa de eso.

**Lo que necesita el usuario** (escríbelo en `docs/setup.md`, con capturas de texto de qué copiar y dónde pegarlo):
- Dos proyectos de Supabase (pruebas y producción): URL, `anon key`, `service_role key`, contraseña de la base y *project ref*.
- Cuenta de Cloudflare: *account ID*, token de API con permisos de Workers y R2, *site key* y *secret* de Turnstile.
- Cuenta de Resend con un dominio verificado, o el subdominio gratuito mientras tanto.
- Proyecto de Sentry (DSN) y credenciales de Google OAuth.
- Protección de la rama `main` y el *environment* `production` con aprobación manual en GitHub.

---

## 9. Alcance de esta primera sesión

Avanza en este orden y llega tan lejos como puedas con calidad completa. Un módulo a medias no se fusiona.

1. Fase 0: **D01** (repositorio y entrega automática) y **D02** (reloj y día de juego).
2. **Atlas en código**: `packages/atlas` con tokens, estilos base y los componentes de la sección 6, con pruebas de accesibilidad.
3. Fase 1: **D03** (mundo: 13 países y 78 regiones con código fijo desde `regions_map.py`), **D04** (mapa), **D05** (cuentas, con la landing, el registro, el inicio de sesión y la recuperación de contraseña del canvas), **D06** (ciudadanía con las reglas de la sección 3, incluida la lista de espera) y **D07** (panel de administración).

Al terminar la sesión (o si te detiene algo que solo el usuario puede resolver), deja:
- `docs/progreso.md` actualizado: qué está fusionado, qué está en PR y qué sigue.
- `docs/setup.md` con los pasos pendientes del usuario.
- Un resumen final breve en español neutro con los PR abiertos o fusionados, qué se puede probar y qué falta.
