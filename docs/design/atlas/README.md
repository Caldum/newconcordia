Atlas de Concordia es el sistema visual de Concordia, un juego de estrategia en el navegador donde los jugadores trabajan, votan y combaten por regiones reales. La interfaz se dibuja como un atlas: el mar es el fondo, la tierra son los paneles y cada país tiñe lo que le pertenece.

## Principios

1. **Primero el juego, después la interfaz.** Cada pantalla abre con algo que solo existe en Concordia: una batalla en vivo, una región, un país. Nunca una ilustración genérica ni un titular de venta.
2. **Se entiende de un vistazo.** Los datos de la partida (energía, marcador, tiempo de ronda) se leen sin buscar: `marcador`, `cifra` y cifras tabulares.
3. **El color nunca informa solo.** Todo estado lleva una palabra o un ícono; cada país, su nombre. Las ganancias llevan signo +.
4. **Un solo protagonista por pantalla.** Un escenario, un marcador o un documento; el resto, en tono neutro.
5. **Accesible desde cualquier entrada.** Todo se alcanza con Tab, todo lo táctil mide al menos `toque-min` y el foco siempre se ve. No hay atajos de teclado: cada acción es un botón con su verbo.

## Voz y texto

- Español neutro con tuteo: «Elige tu país», «Entra a la batalla», «¿Ya tienes cuenta?». Sin voseo ni regionalismos: «aquí», «dinero», «combustible». Frases cortas y verbos claros.
- Mayúscula solo al principio de la oración y en nombres propios. Nunca todo en mayúsculas.
- Botones con verbo primero en infinitivo que dicen lo que pasa: «Crear mi ciudadano», «Entrar a combatir». El aviso repite el verbo en pasado: «Compraste 10 raciones».
- Los errores dicen qué pasó y cómo seguir, sin disculpas: «Falta el dominio, por ejemplo camila@gmail.com».
- Números con punto de miles y coma decimal: 38.450, 36,96, 58 %. Las monedas se llaman Oro y Crédito, con mayúscula.
- Sin emoji. Sin signos de exclamación salvo en un logro real.
- Que no suene a IA: di el dato o la acción y nada más. Sin contrastes de relleno («no es X, es Y»), sin fragmentos en fila («Gratis. Sin descargas.»), sin palabras de venta (épico, increíble, descubre, desbloquea, experiencia), sin rayas como conector, sin preguntas retóricas y sin muletillas como «¡Listo!» o «No te preocupes». Mejor «es», «tiene» o «hay» que «funciona como» o «cuenta con».

## Color

- Fondo `mar`; paneles `tierra`; texto `tinta` y `texto-suave`. `texto-tenue` solo para metadatos sobre `tierra`.
- `nacion` es el color del país del jugador (celeste para Argentina) y cambia por jugador: tiñe la barra, su territorio y la bienvenida. Sobre él, texto `sobre-nacion`.
- `guerra` es el único rojo de acción: botón de combate y En vivo. Uno por pantalla.
- `positivo`, `aviso` e `info` son estados; se usan con su `-tinte` de fondo y su `-texto`.
- Los 13 `pais-*` se usan en mapas, siluetas, leyendas y la franja de marca. Nunca como fondo de texto pequeño.
- Contraste: todo texto de interfaz cumple 4,5:1 sobre su fondo; los bordes de control (`linea-control`) y el foco, 3:1.

## Tipografía

- **Archivo** para todo lo que no es un lugar. Títulos en 800 con ancho 112 a 122 % (`font-stretch`), cifras en 800 a 124 % y tabulares, como en un marcador deportivo.
- **EB Garamond itálica** solo para nombres de lugar (países, regiones, provincias, océanos), como en un atlas. Nunca para destacar una palabra dentro de una frase.
- Escala: `portada` 76, `titulo-1` 44, `titulo-2` 23, `titulo-3` 17, `cuerpo-l` 18, `cuerpo` 16, `etiqueta` y `apoyo` 14, `chip` 13. Nada de interfaz por debajo de 14 px salvo los chips.

## Forma, espacio y profundidad

- Radios pequeños y con función: `radio-xs` pistas, `radio-s` chips y avatares, `radio-m` controles, `radio-l` paneles, `radio-xl` escenarios.
- Los paneles no tienen sombra: solo `borde-panel`. La sombra `flotante` es para lo que flota sobre el mapa y `documento` para el documento de ciudadanía.
- Espaciado de `espacio-1` (4 px) a `espacio-10` (88 px). Paneles con `espacio-6` de relleno y `espacio-5` entre sí. Contenido hasta `pagina-max`, con `espacio-7` de margen.
- Superficies según contenido: `tierra` lo cotidiano, `tinta` decisiones y marcadores, `nacion` lo propio, `mar-profundo` el mapa. Ver el componente Panel.

## Movimiento

- Lo único que se mueve solo es el punto de En vivo.
- Las respuestas a una acción duran 150 ms al entrar y hasta 300 ms al salir; nada pasa de 500 ms.
- El documento de ciudadanía entra una vez al confirmar el correo.
- Con `prefers-reduced-motion` todo queda quieto.

## Entrada y accesibilidad

- Solo escritorio adaptable: contenido hasta 1320 px que se reacomoda en columnas al reducir la ventana. Las pantallas de Entrada se dividen en escenario y formulario.
- Foco: anillo de 3 px en `info` con halo blanco (`foco`), visible sobre tierra, tinta y nación.
- Toque: 44 px mínimo, 56 px para el botón principal y Golpear.

## Iconografía

- Íconos propios de trazo, 1,8 px sobre una cuadrícula de 24, puntas y uniones redondeadas, en `tinta` o `currentColor`. Tamaños 14, 16, 18, 20 y 24.
- Siempre junto a una palabra, salvo en botones de un solo ícono, que llevan `aria-label`.
- Los íconos de Oro y energía son de color: moneda en `oro` con aro `oro-borde`, rayo en `energia`.
- Las siluetas de países y regiones (grupo Siluetas) son la imagen del juego en Entrada, Inicio y las fichas de país. Sus archivos traen el color de cada país.

## Ilustraciones

- Siete láminas planas de 16:9, una por sección: economía, mercado, bancos, guerra, política, prensa y recursos (grupo Ilustraciones). Solo van en el componente Cabecera, una por pantalla.
- Formas simples sin degradados ni texturas, sin personas y sin texto. Suelo en `tinta`, fondo en el tinte de la sección y acentos con la paleta de Atlas; el rojo `guerra` solo en la lámina de guerra.
- Cada lámina incluye algo de Concordia: un contorno de región, el toldo con los 13 colores o una línea de frente.
- Nunca reemplazan un dato: si una pantalla tiene un marcador o un mapa, no lleva lámina.

## Marca

- Marca: un círculo dividido en ocho regiones de fronteras irregulares, como un mapa político visto desde arriba. Siete regiones van en colores nacionales y una en rojo `guerra`: la región en disputa, porque en Concordia siempre hay una. Dentro del juego esa región puede tomar el color `nacion` del jugador.
- Versiones (grupo Logos): `concordia-marca` con fronteras blancas para fondos claros y `nacion`; `concordia-marca-sobre-tinta` con fronteras en `tinta`; `concordia-icono-app` sobre cuadrado `tinta` de radio 14/64 para app y favicon.
- En la barra va sobre un cuadrado blanco de 38 px. Tamaño mínimo 20 px; por debajo se usa el ícono de app.
- Logotipo: «Concordia» en Archivo 800 al 125 % de ancho, en `tinta` o en blanco sobre `tinta`, a la derecha de la marca con un espacio igual a un tercio de su ancho. No se deforma, no se recolorea región por región y no lleva sombra.
- La franja de 13 colores nacionales cierra escenarios y bandas de color.
