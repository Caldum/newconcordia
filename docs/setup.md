# Pasos del dueño del proyecto

Todo lo que depende de cuentas o credenciales del dueño. El código ya está listo para usarlas: mientras no
existan, los trabajos de CI que las necesitan se saltean con un aviso y el resto sigue en verde.

Este archivo se completa a medida que cada módulo necesita algo nuevo.

## Resumen

| # | Paso | Bloquea |
| --- | --- | --- |
| 1 | Proteger `main` y `develop` en GitHub | Fusiones sin revisión |

## 1. Proteger las ramas en GitHub

1. En GitHub: **Settings → Branches → Add branch ruleset**.
2. Nombre `main`, objetivo `main`. Marca: *Restrict deletions*, *Require a pull request before merging*
   (1 aprobación), *Require status checks to pass* (agrega `CI / verde` cuando aparezca tras el primer PR),
   *Block force pushes*.
3. Repite con `develop`, sin exigir aprobación (solo los checks y *Block force pushes*).
