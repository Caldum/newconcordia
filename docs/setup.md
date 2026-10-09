# Pasos del dueño del proyecto

Todo lo que depende de cuentas o credenciales del dueño. El código ya está listo para usarlas: mientras no
existan, los trabajos de CI que las necesitan terminan en verde con un aviso «Despliegue omitido» y el resto
sigue funcionando.

Regla de oro: **ningún secreto va en el repositorio ni en el navegador**. Los secretos van en GitHub
(Settings → Environments → *environment* → Secrets) o en Wrangler (`wrangler secret put`). Los valores
públicos (URL de Supabase, clave publicable, *site key* de Turnstile, DSN de Sentry) van como *Variables*.

## Resumen

| # | Paso | Desbloquea |
| --- | --- | --- |
| 1 | Crear los *environments* `staging` y `production` en GitHub | Despliegues |
| 2 | Dos proyectos de Supabase (pruebas y producción) | Migraciones en la nube |
| 3 | Cuenta de Cloudflare y token de API | Web y reloj en la nube |
| 4 | Proteger `main` y `develop` | Fusiones sin revisión |

Los pasos de Turnstile, Resend, Google OAuth, Sentry y copias de seguridad se agregan cuando llega el
módulo que los usa.

## 1. *Environments* de GitHub

1. GitHub → repositorio `Caldum/newconcordia` → **Settings → Environments → New environment**.
2. Crea `staging`. En *Deployment branches and tags* elige *Selected branches* y agrega `develop`.
3. Crea `production`. Marca **Required reviewers** y agrégate. En *Deployment branches* agrega solo `main`.

## 2. Supabase (dos proyectos)

1. En https://supabase.com/dashboard crea dos proyectos en la región más cercana a los jugadores
   (por ejemplo `sa-east-1`, São Paulo): `concordia-pruebas` y `concordia-produccion`.
   Guarda la contraseña de la base de cada uno en tu gestor de contraseñas.
2. En cada proyecto: **Project Settings → Data API**:
   - *Exposed schemas*: deja solo `public` (quita `graphql_public`).
   - Si existe la opción de exponer tablas nuevas automáticamente, desactívala.
3. Crea un token de acceso personal con alcance limitado: **Account → Access Tokens → Generate new token**
   (si permite elegir alcance, limítalo a los dos proyectos). Es el mismo para los dos *environments*.
4. Copia estos valores en GitHub → Settings → Environments:

   | Dónde | Nombre | Valor (de cada proyecto) |
   | --- | --- | --- |
   | Secret | `SUPABASE_ACCESS_TOKEN` | El token del paso 3 |
   | Secret | `SUPABASE_DB_PASSWORD` | La contraseña de la base |
   | Variable | `SUPABASE_PROJECT_REF` | Project Settings → General → *Project ID* (por ejemplo `abcdefghijklmnop`) |
   | Variable | `SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → *Publishable key* (`sb_publishable_...`) |

   La clave `service_role` / *secret key* **no** va en GitHub ni en la web: solo la usará el Worker del reloj
   como secreto de Wrangler (paso que llega con D02).

## 3. Cloudflare

1. Crea la cuenta en https://dash.cloudflare.com (plan gratuito). Copia el *Account ID* de la columna
   derecha de **Workers & Pages**.
2. **My Profile → API Tokens → Create Token → Edit Cloudflare Workers** (plantilla). Agrega el permiso
   *Account → Workers R2 Storage → Edit* (para las copias de seguridad de D29). Limítalo a tu cuenta.
3. En GitHub, en los dos *environments*:

   | Dónde | Nombre | Valor |
   | --- | --- | --- |
   | Secret | `CLOUDFLARE_API_TOKEN` | El token del paso 2 |
   | Variable | `CLOUDFLARE_ACCOUNT_ID` | El *Account ID* |

4. La web queda en `concordia-web.<tu-subdominio>.workers.dev` (producción) y
   `concordia-web-staging.<tu-subdominio>.workers.dev` (pruebas).

## 4. Proteger las ramas

1. GitHub → **Settings → Rules → Rulesets → New branch ruleset**.
2. Nombre `main`, objetivo `main`: *Restrict deletions*, *Block force pushes*, *Require a pull request
   before merging* (1 aprobación) y *Require status checks to pass* con el check **`verde`** (aparece tras
   la primera ejecución del CI).
3. Nombre `develop`, objetivo `develop`: *Restrict deletions*, *Block force pushes*, *Require a pull request*
   (0 aprobaciones) y el check **`verde`**.
4. **Settings → General → Pull Requests**: deja activo solo *Allow squash merging*.
5. **Settings → Code security**: activa *Dependabot alerts*, *Dependabot security updates* y
   *Secret scanning* con *Push protection*.
