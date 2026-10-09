# 0001 · Ramas y ubicación del kit de traspaso

Fecha: 2026-10-09 · Estado: Aceptada

## Contexto

El brief pide un commit inicial en `main` y después un PR por módulo. El dueño pidió además que `main` quede
como rama productiva y que el trabajo diario se integre en `develop`. La tabla de la sección 1 del brief
manda los recursos de diseño a `apps/web/src/assets/` «cuando se usen», y no dice dónde guardar
`tools/flags.py`.

## Opciones

1. PR de cada módulo directo a `main`.
2. `develop` como rama de integración; `main` solo recibe versiones aprobadas por el dueño.

Para los recursos: copiarlos todos ya a `apps/web/src/assets/`, o guardarlos como referencia en `docs/` y
copiar a la app solo los que se usan.

## Decisión

- Ramas: opción 2. Cada módulo sale de `develop` en `feat/dNN-nombre` y vuelve por PR con squash.
  `main` recibe `develop` por PR cuando el dueño decide publicar; ese PR lo fusiona el dueño.
- El CI corre en PR hacia `develop` y `main`. El despliegue al entorno de pruebas sale de `develop`;
  producción sale de `main` con aprobación manual en el *environment* `production`.
- Recursos del kit: `docs/design/assets/` guarda los originales (logos, ilustraciones, siluetas, íconos);
  cada paquete copia solo lo que usa y una prueba compara la copia con el original cuando corresponde.
- `tools/flags.py` va a `docs/design/herramientas/` como referencia del componente `Bandera`.

## Consecuencias

- El brief dice «al fusionar en `main`: migraciones y despliegue al entorno de pruebas». Con esta decisión,
  eso ocurre al fusionar en `develop`, y `main` despliega a producción con aprobación. Es más seguro: nada
  llega a producción sin una fusión explícita del dueño.
- La rama `claude/*` que asigna la sesión en la nube no se usa para el trabajo; queda apuntando a `develop`.
