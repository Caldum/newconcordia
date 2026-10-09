# SelectorPais

Elección del país al registrarse o al cambiar de ciudadanía. Es un contenedor `tierra-suave` con borde de panel que agrupa un buscador y una cuadrícula de banderas con el nombre debajo. Es un `radiogroup`: se recorre con Tab y flechas, y se elige con Enter o espacio.

- Cada opción lleva la bandera del país a 52 × 39 px, con un borde fino para que el blanco no se pierda sobre `tierra`.
- Seleccionado: borde de 2 px en `tinta` y fondo `tierra-suave`.
- El buscador filtra por nombre; hace falta cuando haya más países en juego.
- Al final, «Otro país» muestra los países que todavía no están en juego y lleva al paso «Dónde empezar».
- Al elegir, el escenario de la izquierda se actualiza con el país elegido.
- En listas de una sola columna (por ejemplo, «Dónde empezar»), la bandera va a 48 × 36 px a la izquierda del nombre.
