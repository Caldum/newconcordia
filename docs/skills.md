# Skills del proyecto

Los skills viven en `.claude/skills/<nombre>/`, cada uno con su `LICENSE` y un `SOURCE.md` con el
repositorio, la ruta y el commit de origen. Se copiaron sin cambios el 9 de octubre de 2026.

| Para qué | Skills | Origen y commit | Licencia |
| --- | --- | --- | --- |
| Forma de trabajar | `writing-plans`, `executing-plans`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `finishing-a-development-branch` | obra/superpowers @ 8ca22db | MIT |
| Postgres y Supabase | `supabase-postgres-best-practices`, `supabase` | supabase/agent-skills @ c9be0e9 | MIT |
| Cloudflare | `workers-best-practices`, `wrangler`, `cloudflare`, `turnstile-spin`, `durable-objects`, `web-perf` | cloudflare/skills @ a18ffe2 | Apache 2.0 |
| React | `react-best-practices`, `composition-patterns`, `web-design-guidelines` | vercel-labs/agent-skills @ 063bee9 | MIT (declarada en README y SKILL.md; el repo no trae archivo LICENSE, se incluye el texto MIT) |
| Calidad web | `accessibility`, `performance`, `core-web-vitals`, `best-practices`, `web-quality-audit`, `seo` | addyosmani/web-quality-skills @ afa8da9 | MIT |
| Interfaz de juego | `game-ui-design` | omer-metin/skills-for-antigravity @ e8dcf4e | Apache 2.0 |
| Diseño visual y pruebas en navegador | `frontend-design`, `webapp-testing` | anthropics/skills @ 683bc88 | Apache 2.0 (LICENSE.txt de cada skill) |
| Seguridad | `differential-review`, `sharp-edges`, `supply-chain-risk-auditor`, `semgrep` | trailofbits/skills @ 82fe822 | CC BY-SA 4.0, con atribución a Trail of Bits |
| Textos de interfaz | `humanizer` | blader/humanizer @ 225a6f3 | MIT |

Notas:

- `semgrep` viene de `plugins/static-analysis/skills/semgrep` de Trail of Bits.
- `accessibility`, `performance` y `seo` son los de addyosmani/web-quality-skills (omer-metin tiene skills
  con el mismo nombre que no se usan).
- Las reglas de Next.js de los skills de Vercel no aplican: Concordia es una SPA con Vite.
- Ningún skill se dejó fuera por licencia.

## Cuándo usar cada grupo

- Al empezar cada módulo D: `writing-plans`, y después `test-driven-development` en cada regla.
- Antes de escribir SQL: `supabase-postgres-best-practices`. Antes del Worker o Wrangler:
  `workers-best-practices` y `wrangler`.
- Antes de cada pantalla: `game-ui-design`, `react-best-practices` y `accessibility`. Al cerrarla: `web-quality-audit`.
- Antes de abrir cada PR: `verification-before-completion`, `requesting-code-review` y `differential-review`.
  Al agregar dependencias: `supply-chain-risk-auditor`.
- Ante cualquier fallo: `systematic-debugging` antes de cambiar código.
