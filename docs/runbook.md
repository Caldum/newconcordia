# Runbook de operación

## Entornos

| Entorno | Rama | Base | Web | Aprobación |
| --- | --- | --- | --- | --- |
| Local | cualquiera | `pnpm db:start` (Docker) | `pnpm --filter @concordia/web dev` | — |
| Pruebas | `develop` | Supabase `concordia-pruebas` | `concordia-web-staging` | Automática |
| Producción | `main` | Supabase `concordia-produccion` | `concordia-web` | Manual (*environment* `production`) |

## Desplegar

1. Fusiona el PR en `develop`. El workflow **Deploy** aplica las migraciones al proyecto de pruebas y
   publica la web de pruebas.
2. Revisa el entorno de pruebas.
3. Abre un PR de `develop` a `main`. Al fusionarlo, **Deploy** espera la aprobación del *environment*
   `production` y despliega igual que en pruebas.

Las migraciones van antes que la web y siempre son compatibles con la versión anterior de la web
(expandir y después contraer: columnas nuevas opcionales, funciones nuevas con nombre nuevo, y se borra
lo viejo en un despliegue posterior).

## Revertir

- **Web:** `pnpm --filter @concordia/web exec wrangler rollback [--env staging]` vuelve a la versión
  anterior en segundos. También desde el panel: Workers → concordia-web → Deployments → Rollback.
- **Base:** no se revierte una migración aplicada. Se escribe una migración nueva hacia adelante que
  deshace el cambio, siguiendo el «Rollback» escrito en la cabecera de la migración original.
- **Código:** `git revert` del commit de fusión en `develop` y nuevo PR.

## Restaurar una copia

Se completa con D29 (copia diaria cifrada en R2 y restauración probada una vez por mes).

## Rotar secretos

1. Genera el valor nuevo en el proveedor (Supabase, Cloudflare, Resend, Sentry).
2. Actualízalo en GitHub → Settings → Environments → *environment* → Secrets, o con
   `wrangler secret put NOMBRE [--env staging]` para los secretos del Worker.
3. Vuelve a ejecutar **Deploy** (*Run workflow*) para que tome el valor nuevo.
4. Revoca el valor viejo en el proveedor.

## Base local

```bash
pnpm db:start      # levanta Postgres, Auth y la API en Docker con todas las migraciones
pnpm db:reset      # borra la base local y la recrea desde las migraciones
pnpm db:test       # pruebas pgTAP
pnpm db:lint       # squawk sobre las migraciones
pnpm db:types      # regenera packages/tipos
```

Si Docker no puede bajar imágenes de `public.ecr.aws`, baja las mismas desde Docker Hub
(`docker pull supabase/postgres:<versión>`) y etiquétalas con el nombre que pide el CLI.
