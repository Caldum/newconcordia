# Base de datos

- `migrations/`: cambios versionados, solo hacia adelante. Cada archivo explica en la cabecera qué hace y
  cómo se deshace. Squawk los revisa en el CI (`pnpm db:lint`).
- `tests/database/`: pruebas pgTAP. `000_security_invariants` recorre el catálogo y falla si una tabla no
  tiene RLS, si `anon` o `authenticated` pueden escribir una tabla, o si una función expuesta no fija
  `search_path`.
- `seed.sql`: solo datos de desarrollo local. Los datos de referencia del juego van en migraciones.

Modelo de acceso: ADR 0002 (`docs/adr/0002-acceso-a-datos.md`).
