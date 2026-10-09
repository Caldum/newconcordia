# 0002 · Acceso a datos: esquema privado y solo funciones expuestas

Fecha: 2026-10-09 · Estado: Aceptada

## Contexto

El brief exige que la base sea la autoridad, RLS que niega por defecto y que el cliente no tenga
`insert/update/delete` sobre tablas, solo `execute` sobre funciones públicas. Supabase, por defecto, da a
`anon` y `authenticated` todos los privilegios sobre cada tabla, secuencia y función nueva en `public`, y la
API de datos expone `public` y `graphql_public`.

## Opciones

1. Tablas en `public` con RLS y políticas de lectura; escritura solo por funciones.
2. Tablas en un esquema privado `game` que la API no expone; `public` contiene solo funciones (RPC) que
   leen y escriben, cada una con su `grant execute` explícito.

## Decisión

Opción 2.

- `game`: tablas y funciones internas. Sin `usage` para `anon` ni `authenticated`. RLS activo igualmente en
  cada tabla, sin políticas salvo que una función `security invoker` lo necesite (defensa en profundidad).
- `public`: solo funciones. Las de escritura son `security definer` con `set search_path = ''`, nombres
  calificados y validación de identidad (`auth.uid()`), permisos, frecuencia, estado e idempotencia.
  Las de lectura devuelven solo las columnas que la pantalla usa y están paginadas.
- Privilegios por defecto revocados para todo objeto nuevo (`supabase/migrations/*_security_baseline.sql`).
- Pruebas pgTAP de invariantes (`supabase/tests/database/000_security_invariants.test.sql`) recorren el
  catálogo en cada ejecución: toda tabla con RLS, ninguna escritura directa, ningún acceso a `game` y toda
  función llamable con `search_path` fijo.
- La API expone solo `public` (sin GraphQL).
- Tiempo real (D17): canales de *Broadcast* con autorización, no `postgres_changes` sobre tablas.

## Consecuencias

- Cada lectura nueva necesita una función. Es más código que una política, pero el contrato con la web
  queda explícito y tipado (`packages/tipos`), y nunca se filtra una columna por olvido.
- Si una pantalla necesita filtros muy flexibles, se evalúa una vista `security_invoker` en `public` con
  `select` explícito; se documenta en un ADR nuevo.
