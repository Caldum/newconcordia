# Concordia · Documento de diseño del juego

Oct 7, 2026 · @Nacho

## Cómo usar este documento

Concordia se documenta en 12 módulos que completamos de a uno. Cada módulo responde una pregunta, recoge lo ya propuesto en los bocetos y deja a la vista lo que falta decidir.

| Módulo | Pregunta que responde | Estado |
| --- | --- | --- |
| 1 · Visión del juego | ¿Qué juego es, para quién y qué lo hace distinto? | Por empezar |
| 2 · Mundo y tiempo | ¿Dónde ocurre todo y cómo pasa el tiempo? | En borrador |
| 3 · Ciudadano y progresión | ¿Quién es el jugador y cómo crece? | Por empezar |
| 4 · Economía | ¿Cómo se produce, se gana y se gasta? | Por empezar |
| 5 · Política | ¿Quién decide las reglas de cada país? | Por empezar |
| 6 · Guerra y conquista | ¿Cómo cambia de dueño una región? | Por empezar |
| 7 · Sociedad y prensa | ¿Cómo se comunican y organizan los jugadores? | Por empezar |
| 8 · Ciclo diario y retención | ¿Por qué vuelve el jugador mañana? | Por empezar |
| 9 · Monetización | ¿Cómo se sostiene el juego sin que pagar sea ganar? | Por empezar |
| 10 · Interfaz y experiencia | ¿Cómo ve y opera todo esto el jugador? | En borrador |
| 11 · Tecnología y juego limpio | ¿Cómo corre, escala y se protege de trampas? | Por empezar |
| 12 · Balance, métricas y glosario | ¿Qué números ajustamos y cómo sabemos si funciona? | Por empezar |

Orden sugerido: 1, 2, 3 y 4 primero, porque fijan las reglas que usan todos los demás. Después 6 y 5, que dependen de la economía. El 9 y el 12 se cierran al final, cuando hay números para balancear.

## 1 · Visión del juego

Concordia es un juego de estrategia por navegador, multijugador y persistente, donde los ciudadanos de países reales trabajan, votan y combaten por el territorio. Es el módulo que define el tono de todos los demás.

**Incluye**

- Concepto en una frase y propuesta de valor
- Pilares de diseño: las 3 o 4 ideas que deciden cuando hay dudas
- Público objetivo y tiempo de juego por día
- Plataformas: web de escritorio y móvil
- Referencias (eRepublik y otros) y en qué nos diferenciamos

**Ya propuesto**

- Mundo con países y regiones reales; cada país tiene un color y las regiones conquistadas toman el del conquistador.
- Tres esferas de juego: economía, política y guerra.

**Por decidir**

- [ ] ¿Los países son reales con nombre real, o ficticios sobre el mapa real?
- [ ] ¿Cuánto dura una sesión típica: 10 minutos al día o más?
- [ ] ¿Hay temporadas con reinicio del mundo o un solo mundo permanente?
- [ ] Pilares de diseño

## 2 · Mundo y tiempo

El mundo es un planisferio de 250 países y 4.594 regiones, y cada región tiene un dueño que puede cambiar. Este módulo fija qué vale cada región y cómo avanza el reloj del juego.

**Incluye**

- Países: cuáles son jugables, capital, color, población inicial
- Regiones: límites, vecinos, recursos y qué aporta controlarlas
- Fronteras y adyacencia: qué regiones se pueden atacar desde dónde
- El día de juego: hora de corte, recarga de energía, cierre de mercados y elecciones
- Qué pasa con un país que pierde todas sus regiones

**Ya propuesto**

- Límites de Natural Earth (dominio público), con colores que no se repiten entre vecinos.
- Argentina celeste y España roja; una región conquistada toma el color del conquistador.
- Mapa interactivo en la landing, con búsqueda y zoom.
- Países participantes: desde el panel de administración se elige qué países forman parte del mundo. Los demás se ven en gris en el mapa, bloqueados y sin interacción.
- Territorios en disputa (por ejemplo, Malvinas): deshabilitados por defecto, en gris como los países que no participan. El panel puede habilitarlos.
- Territorios iniciales de cada país: se definen más adelante.
- Horario del juego: GMT−3 para todos. El día de juego cambia a las 00:00 GMT−3.

**Regionalización**

Todos los países usan el mismo nivel de región: una región es un grupo de provincias o estados vecinos completos, y ningún país juega con sus provincias sueltas. Con este criterio el mundo pasa de 4.594 provincias a unas 820 regiones.

- La cantidad de regiones de cada país sale de la misma fórmula para todos, con un mínimo de 3 y un máximo de 12:

```latex
\text{Regiones} = \operatorname{redondeo}\left(\frac{\sqrt{\text{Superficie en km}^2}}{500} + \frac{\sqrt{\text{Población en millones}}}{2{,}5}\right)
```

- Si el país tiene una regionalización oficial con una cantidad parecida (hasta 3 regiones de diferencia), se usa esa. Es el mismo principio de las regiones NUTS de la Unión Europea: partir de divisiones administrativas existentes y buscar regiones de tamaño comparable ([Eurostat](https://ec.europa.eu/eurostat/web/nuts/principles)).
- Si no la tiene, se agrupan provincias vecinas buscando regiones de población y superficie parecidas.
- Un país con menos provincias que el mínimo conserva las que tiene; son casi todos microestados o islas.
- El equipo revisa y puede corregir cada agrupación en el panel de administración antes de habilitar el país.

Cada región lleva un nombre geográfico o histórico propio, nunca solo un punto cardinal: «Grão-Pará» en lugar de «Norte», «Mezzogiorno» en lugar de «Sur».

Regiones de los 13 países que participan hoy (78 en total):

| País | Provincias o estados | Según la fórmula | Regiones en el mapa | Agrupación usada |
| --- | --- | --- | --- | --- |
| Brasil | 27 | 12 | 12 | Estados vecinos dentro de las 5 grandes regiones del IBGE |
| Estados Unidos | 51 | 12 | 9 | Las 9 divisiones del censo |
| México | 33 | 7 | 7 | Estados vecinos |
| España | 52 | 4 | 7 | NUTS 1 |
| Argentina | 24 | 6 | 6 | Regiones interprovinciales, con el Norte Grande dividido en dos |
| Canadá | 13 | 9 | 6 | Agrupación habitual de provincias y territorios |
| Francia | 101 | 5 | 6 | Regiones administrativas vecinas, más Ultramar |
| Chile | 16 | 3 | 5 | Macrozonas |
| Italia | 110 | 4 | 5 | NUTS 1 |
| Alemania | 16 | 5 | 5 | Estados federados vecinos |
| Reino Unido | 232 | 4 | 4 | Sus cuatro naciones |
| Paraguay | 18 | 3 | 3 | Chaco y Región Oriental dividida en dos |
| Portugal | 20 | 3 | 3 | NUTS 1 |

| País | Nombres de las regiones |
| --- | --- |
| Argentina | Buenos Aires · Córdoba y el Litoral · Norte Andino · Gran Chaco y Misiones · Cuyo · Patagonia |
| Brasil | Alto Amazonas · Grão-Pará · Acre y Rondônia · Meio-Norte · Ceará y Borborema · Pernambuco y São Francisco · Bahía · Planalto Central y Pantanal · Minas Gerais · São Paulo · Rio de Janeiro y Espírito Santo · Pampa Gaúcha y Paraná |
| Chile | Norte Grande · Norte Chico · Valle Central · Biobío y Los Lagos · Patagonia Chilena |
| Paraguay | Chaco Paraguayo · Alto Paraná y Amambay · Asunción e Itapúa |
| México | Sonora y las Californias · Chihuahua y Durango · Sierra Madre Oriental · Jalisco y Michoacán · Valle de México y el Bajío · Oaxaca y Chiapas · Yucatán y el Golfo |
| Estados Unidos | Nueva Inglaterra · Atlántico Medio · Grandes Lagos · Grandes Llanuras · Carolinas y Florida · Tennessee y Misisipi · Texas y Luisiana · Montañas Rocosas · Pacífico y Alaska |
| Canadá | Provincias Atlánticas · Quebec · Ontario · Praderas · Columbia Británica · Yukón y el Ártico |
| España | Galicia y el Cantábrico · País Vasco y el Ebro · Madrid · Castillas y Extremadura · Cataluña y Levante · Andalucía y Murcia · Canarias |
| Italia | Lombardía y Piamonte · Véneto y Emilia · Toscana y Lacio · Mezzogiorno · Sicilia y Cerdeña |
| Portugal | Portugal Continental · Azores · Madeira |
| Alemania | Mar del Norte y Báltico · Renania del Norte-Westfalia · Valle del Rin · Berlín y Sajonia · Baviera |
| Francia | París y el Canal · Bretaña y Loira · Alsacia y Borgoña · Aquitania y Occitania · Ródano y Provenza · Francia de Ultramar |
| Reino Unido | Inglaterra · Escocia · Gales · Irlanda del Norte |

Mendoza queda dentro de Cuyo, así que el ejemplo de la landing es «España conquista Cuyo».

**Por decidir**

- [x] ¿Todas las 4.594 regiones son jugables, o agrupamos las de países con muchas (Reino Unido tiene 232)? Se compactan en regiones, con el mismo criterio para todos los países.
- [x] ¿Las islas y regiones sin frontera terrestre se atacan por mar? Sí, por aire o por mar (ver módulo 6).
- [x] Territorios en disputa (por ejemplo, Malvinas): ¿de quién son al empezar? Quedan deshabilitados por defecto.
- [x] Recursos por región y su distribución: cada región tiene sus recursos reales (ver módulo 4)
- [x] Hora de corte del día de juego y zona horaria: GMT−3 para todo el juego

* [ ] Territorios iniciales de cada país
* [ ] Revisar la agrupación de regiones de cada país habilitado

## 3 · Ciudadano y progresión

El jugador es un ciudadano de un país, y la energía es el recurso que limita todo lo que hace cada día. Este módulo define sus atributos y cómo suben.

**Incluye**

- Alta: elegir nombre y ciudadanía
- Atributos: nivel, experiencia, energía, bienestar, fuerza, rango, influencia
- Recarga de energía y cómo se recupera más rápido
- Curva de niveles y qué desbloquea cada uno
- Cambio de ciudadanía y migración entre países
- Inventario personal

**Ya propuesto (valores de ejemplo de los bocetos)**

| Atributo | Valor de ejemplo |
| --- | --- |
| Energía | 84 de 100; cada acción cuesta 10 |
| Experiencia | 6.420 de 8.000 para el nivel 28 |
| Nivel | 27 · rango Capitana |
| Fuerza | 1.840 |
| Bienestar | 92 de 100 |
| Influencia | 340 |

**Ciudadanía**

Toda ciudadanía la aprueba el ministro del Interior o el presidente del país, y cada país fija por ley los criterios de admisión.

- La solicitud se responde en 72 horas. Si nadie responde, la primera ciudadanía de un jugador nuevo se aprueba sola, para que un gobierno inactivo no frene a quien recién llega. Un cambio de ciudadanía sin respuesta se rechaza.
- Mientras espera, el jugador es residente: puede trabajar y entrenar, pero no puede votar, postularse ni ocupar cargos. En las batallas solo puede sumarse como voluntario.
- Un jugador puede cambiar de ciudadanía como máximo una vez cada 30 días. Al cambiar pierde sus cargos y su afiliación a un partido.

Criterios que cada país fija por ley:

| Criterio | Opciones | Valor inicial |
| --- | --- | --- |
| Modo de admisión | Revisión por el ministro · Automática · Cerrada | Revisión por el ministro |
| Nivel mínimo del solicitante | 0 a 30 | 0 |
| Antigüedad mínima de la cuenta | 0 a 60 días | 0 |
| Ciudadanos de países en guerra con el nuestro | Se admiten · No se admiten | No se admiten |
| Cupo de nuevas ciudadanías por día | Sin cupo, o de 1 a 500 | Sin cupo |
| Tasa de naturalización (va al tesoro) | 0 a 500 Crédito | 0 |
| Espera para votar y postularse | 0 a 30 días | 7 días |

La espera para votar y el cupo diario protegen al país de una toma política: que jugadores de otro país se naturalicen en masa para ganar una elección.

**Por decidir**

- [x] Ritmo de recarga de energía: 10 por hora, máximo 100 (ver módulo 6)
- [ ] ¿Qué hace el bienestar? ¿Afecta la energía o la productividad?
- [ ] Diferencia entre nivel y rango militar
- [x] Reglas y costo de cambiar de ciudadanía: ver Ciudadanía

## 4 · Economía

La economía la hacen los jugadores: producen en empresas, venden en el mercado y pagan impuestos a su país. Es el módulo más difícil de balancear y conviene cerrarlo antes que la guerra.

**Incluye**

- Monedas: Oro (común a todo el mundo) y Crédito (moneda de cada país, o una sola)
- Trabajo y salario
- Empresas: tipos, creación, empleados, producción
- Materias primas y productos: trigo, hierro, petróleo y lo que se fabrica con ellos
- Mercado: compra, venta, precios y cambio de moneda
- Impuestos y tesoro nacional
- De dónde sale el dinero y por dónde se va (fuentes y sumideros)

**Ya propuesto (valores de ejemplo de los bocetos)**

- Trabajar cuesta 10 de energía; el salario de referencia es 42 Crédito.
- Impuesto al trabajo del 12 %.
- Precios de ejemplo: trigo 4,20 · hierro 7,85 · petróleo 12,10.
- Cada país tiene un banco central que maneja el ministro de Finanzas. Solo puede transferir entre cuentas oficiales.
- El Congreso puede abrir licitaciones para bancos privados. Los gestionan jugadores que dejan suficientes recursos en garantía.
- Un banco privado otorga préstamos a los jugadores y paga rendimientos por sus depósitos.
- Los jugadores pueden formar sociedades entre ellos.

### Balance propuesto: economía

Todo el valor sale del trabajo: una jornada vale 10 puntos de producción, y los precios de lanzamiento se derivan de un salario de referencia de 42 Crédito.

**Monedas**

- El Oro es la única moneda global y la única que crea el juego. Se gana con misiones, niveles y medallas, y se compra con dinero real.
- Cada país tiene su moneda local (Crédito, con el código del país). Solo la crea la ley de emisión: el Congreso aprueba un monto y el tesoro paga 1 Oro por cada 100 Crédito emitidos.
- El Oro y las monedas locales se cambian en un mercado entre jugadores, con precio libre. El banco central no participa.
- Un ciudadano nuevo recibe 5 Oro y 50 Crédito de su país.

**Trabajo**

- Cada jugador trabaja una vez por día: cuesta 10 de energía y aporta 10 puntos de producción a la empresa.
- El salario lo fija el dueño de la empresa. El Congreso puede fijar un salario mínimo por ley.
- Quien trabaja en su propia empresa no cobra salario: la producción queda para él.

**Productos**

| Producto | Insumos por unidad | Unidades por jornada | Para qué sirve | Precio de lanzamiento (Crédito) |
| --- | --- | --- | --- | --- |
| Trigo | — | 10 | Raciones | 4,20 |
| Hierro | — | 5 | Armas | 8,40 |
| Petróleo | — | 4 | Combustible | 10,50 |
| Ración | 2 trigo + 1 punto de producción | 10 | +10 de energía | 12,60 |
| Arma Q1 a Q5 | Q hierro + Q puntos de producción | 10 ÷ Q | Daño ×(1 + 0,2 × Q) en un golpe | 12,60 × Q |
| Combustible | 1 petróleo + 0,5 puntos de producción | 20 | Abrir batallas (módulo 6) | 12,60 |

El precio de lanzamiento es el costo de los insumos al salario de referencia; después lo mueve el mercado. Todas las calidades de arma cuestan lo mismo por cada punto de daño extra, pero una Q5 rinde más por energía, que es lo escaso.

**Recursos por región**

Cada región tiene los recursos que tiene en la realidad, y un país solo los aprovecha si invierte en explorarlos y mantenerlos.

- Los tres recursos del juego agrupan a los reales: trigo reúne los cereales (trigo, maíz, arroz, soja), hierro los minerales metálicos y petróleo el petróleo y el gas.
- Cada región tiene un yacimiento de nivel 0 a 3 por recurso, según su producción real frente al resto del mundo: 0 no tiene y 3 está entre los mayores productores. Se calcula una vez, al armar el mapa.
- Un yacimiento pasa por tres estados: sin explorar, en exploración y en explotación.
- Explorar lo ordena el presidente o el ministro de Finanzas, solo en regiones propias. Cuesta 2.000 Crédito del tesoro por nivel del yacimiento, tarda 3 días y ese dinero sale del juego.
- Mantener un yacimiento en explotación cuesta 50 Crédito por nivel y por día. Si el tesoro no paga, el yacimiento queda en pausa.
- La producción de cada materia prima en todo el país es 50 % más 15 % por cada nivel en explotación, hasta 150 %. Un yacimiento de nivel 2 la lleva al 80 %; dos de nivel 3, al 140 %.
- Si se conquista una región, sus yacimientos pasan al conquistador en pausa, y reactivarlos cuesta la mitad de la exploración.
- Compra y venta entre países: un país puede ceder a otro un yacimiento en explotación por un precio diario. Mientras dura el contrato, ese nivel cuenta para el comprador y no para el vendedor. Lo firman el presidente o el ministro de Finanzas de cada país; si dura más de 30 días, también lo aprueba cada Congreso. El pago sale cada día del tesoro del comprador, y si no hay fondos el contrato se suspende.
- Las materias primas en sí se siguen comprando y vendiendo entre jugadores en el mercado, con aranceles.

Fuentes de datos a evaluar para los niveles (falta revisar licencia, cobertura y fecha de cada una): cultivos de [MapSPAM, de IFPRI](https://www.ifpri.org/blog/webinar-launching-spam2020-latest-innovation-global-crop-mapping/), petróleo y gas del [rastreador de extracción de Global Energy Monitor](https://www.gem.wiki/Global_Gas_and_Oil_Extraction_Tracker_Methodology) y minerales del [sistema MRDS del USGS](https://www.usgs.gov/publications/mineral-resources-data-system-mrds).

**Empresas**

| Acción | Costo (Oro) |
| --- | --- |
| Crear una empresa de materia prima | 20 |
| Crear una fábrica | 40 |
| Subir a nivel 2 (de 10 a 20 empleados) | 30 |
| Subir a nivel 3 (hasta 40 empleados) | 60 |
| Subir la calidad de una fábrica de armas de Q a Q+1 | 20 × Q |

**Impuestos**

| Impuesto | Se cobra sobre | Rango legal | Valor inicial |
| --- | --- | --- | --- |
| Al trabajo | El salario | 0 a 30 % | 12 % |
| Al valor agregado | Las ventas en el mercado del país | 0 a 25 % | 5 % |
| Arancel | Las ventas de empresas extranjeras | 0 a 50 % | 10 % |

Todo va al tesoro nacional. Con los precios de lanzamiento, un país de 500 jugadores activos recauda unos 4.250 Crédito por día.

**Bancos privados**

- El Congreso abre la licitación y gana quien ofrece la garantía más alta, con un mínimo de 500 Oro.
- Un banco puede captar depósitos hasta 5 veces el valor de su garantía.
- Cada banco fija sus tasas. La ley fija una tasa máxima de préstamo; la inicial es 3 % semanal.
- Préstamos a 7, 14 o 30 días, por hasta 30 veces el salario promedio del deudor en los últimos 7 días.
- Si un jugador no paga, se le descuenta su saldo y el 50 % de cada salario hasta cubrir la deuda. Mientras tanto no puede pedir otro préstamo.
- Si un banco no puede devolver depósitos, su garantía se reparte entre los depositantes y pierde la licencia.

**Sociedades**

- De 2 a 5 socios, cada uno con un porcentaje de participación.
- La sociedad puede tener empresas, y las ganancias se reparten según la participación.
- Las deudas son de la sociedad: los socios no responden con su dinero personal.

**Cuentas oficiales**

- Tesoro nacional, una cuenta por ministerio, el presupuesto de cada hospital de campaña y el depósito nacional de combustible y armas.
- Solo el banco central mueve dinero entre ellas, por orden del ministro de Finanzas.

**Contra la inflación**

- Oro que sale del juego: crear y mejorar empresas, entrenamiento avanzado, emisión de moneda, crear partidos y periódicos, iniciar resistencias.
- Moneda local que sale del juego: una comisión del 1 % en cada venta del mercado, el presupuesto que consumen los hospitales y lo que cuesta explorar y mantener yacimientos.
- Raciones, armas y combustible se destruyen al usarse.
- Oro que entra: 1 por completar las misiones diarias, 3 extra por 7 días seguidos, 3 por cada nivel y 2 por medalla de batalla. Según el cálculo, entran unos 1,7 Oro por jugador activo al día y salen 1,25.

### Por validar en pruebas

- [ ] Que el salario real se mantenga cerca del de referencia (42 Crédito)
- [ ] Que ninguna materia prima quede sin demanda o con exceso permanente
- [ ] Que la garantía mínima de 500 Oro no deje los bancos solo en manos de los jugadores más ricos
- [ ] Que el Oro neto quede entre 0 y +0,5 por jugador activo al día (ver módulo 12)

## 5 · Política

Cada país lo gobiernan sus propios jugadores, que eligen presidente y Congreso y votan las leyes. Este módulo define los cargos, los plazos y qué puede cambiar cada uno.

**Incluye**

- Partidos: crear, afiliarse, líder
- Elecciones: presidente y Congreso, frecuencia, quién puede votar y postularse
- Leyes: qué tipos existen (impuestos, aranceles, declarar guerra, paz, presupuesto)
- Poderes del presidente y del Congreso
- Diplomacia: alianzas, tratados, embargos

**Ya propuesto**

- Elección de presidente cada 30 días.
- Elección del Congreso cada 30 días, 15 días después de la presidencial: hay una elección cada 15 días, alternando presidente y Congreso.
- El presidente designa al vicepresidente, a los ministros y a los embajadores.
- Ministerios ya mencionados: Guerra (módulo 6), Finanzas (módulo 4) e Interior, que aprueba las ciudadanías (módulo 3).
- Votación de leyes con plazo de cierre (ejemplo: Ley de aranceles agrícolas, cierra en 14 h).
- El nombre del presidente se ve en el panel del país.

**Por decidir**

- [ ] Qué ministerios existen además de Guerra, Finanzas e Interior, y qué puede hacer cada uno
- [ ] Qué hace un embajador
- [x] Quién declara la guerra: propone el presidente y aprueba el Congreso por mayoría simple (ver módulo 6)
- [ ] Cuántos votos o qué porcentaje aprueba una ley
- [ ] Qué se puede votar sin ser miembro de un partido

## 6 · Guerra y conquista

Las regiones cambian de dueño ganando batallas, y la batalla se gana sumando el daño de todos los ciudadanos de cada bando. Es el núcleo que hace visible el juego en el mapa.

**Incluye**

- Declarar la guerra y abrir una batalla por una región vecina
- Rondas, duración y cómo se decide el ganador
- Fórmula de daño: fuerza, rango, armas, bonificaciones
- Unidades militares: grupos de jugadores con líder
- Quién puede combatir por cada bando (ciudadanos, aliados, mercenarios)
- Resistencia: cómo un país recupera una región ocupada

**Ya propuesto (valores de ejemplo de los bocetos)**

- Batalla por rondas, con un marcador de dominio (ejemplo: ronda 3 de 5, Valdoria 58 % contra Karelia 42 %).
- Cada golpe cuesta 10 de energía y da +1 de experiencia.
- Entrenar cuesta 10 de energía y da +10 de fuerza.
- Al ganar, la región toma el color del conquistador y la frontera se mueve.
- Una región sin frontera terrestre con el atacante se puede atacar por aire o por mar.
- El ataque marítimo exige costa disponible: el país atacante debe administrar en ese momento al menos una región con salida al mar. Si no tiene ninguna, o todas sus regiones costeras están ocupadas por otro país, no puede hacer ataques navales.
- Hospitales de campaña: el presidente o el ministro de Guerra los instala en regiones en guerra y les asigna un presupuesto. Los jugadores recuperan energía en ellos; cada uso consume parte del presupuesto y el hospital funciona hasta agotarlo.

### Balance propuesto: guerra

La energía es lo que limita la guerra: cada golpe cuesta 10, y nadie puede dar más de 52 golpes por día.

**Energía** (también define el módulo 3)

- Máximo 100. Se recarga 10 por hora.
- Las raciones recuperan hasta 200 por día, y los hospitales de campaña hasta 100 más.
- Quien entra dos veces por día junta unos 200 de recarga. El techo absoluto es 540 de energía: 52 golpes después de trabajar y entrenar.

**Declarar la guerra** (también define el módulo 5)

- El presidente propone la ley y el Congreso la aprueba por mayoría simple.
- La guerra sigue hasta firmar la paz, que deben aprobar los Congresos de los dos países.

**Abrir una batalla**

| Tipo | Región que se puede atacar | Requisito | Combustible del depósito nacional | Daño del atacante |
| --- | --- | --- | --- | --- |
| Terrestre | Limítrofe con una región que el atacante administra | — | 200 | 100 % |
| Marítima | Cualquier región enemiga con salida al mar | Costa disponible | 800 | 90 % |
| Aérea | Cualquier región enemiga a 1.500 km o menos de una región del atacante | — | 1.500 | 90 % |

- La abre el presidente o el ministro de Guerra. Un país puede tener 2 batallas ofensivas abiertas a la vez; defensivas, sin límite.
- Una región que resistió un ataque no puede ser atacada de nuevo por el mismo país durante 24 horas.
- Para un país de 500 jugadores activos, un ataque terrestre cuesta medio día de recaudación, uno marítimo 2,4 días y uno aéreo 4,4 días.

**Rondas**

- Cada ronda dura 4 horas, y la gana el bando que hizo más daño en ella.
- Gana la batalla el primero que gana 3 rondas: como máximo 5 rondas y 20 horas, así cada batalla cubre un día en cualquier zona horaria.
- Si gana el atacante, la región cambia de dueño al cerrar la batalla.

**Daño por golpe**

```latex
\text{Daño} = 50 \times \left(1 + \frac{\sqrt{\text{Fuerza}}}{10}\right) \times (1 + 0{,}03 \times \text{Rango}) \times \text{Arma} \times \text{Bonificaciones}
```

- Arma: ×1 sin arma, de ×1,2 a ×2,0 según la calidad. Se gasta un arma por golpe.
- La raíz cuadrada de la fuerza frena la ventaja de los veteranos: al máximo, un veterano pega unas 13 veces más que un jugador nuevo.

| Perfil | Fuerza | Rango | Arma | Daño por golpe |
| --- | --- | --- | --- | --- |
| Nuevo, día 1 | 100 | 0 | Q1 | 120 |
| 1 mes | 550 | 3 | Q2 | 255 |
| 6 meses | 1.840 | 12 | Q3 | 576 |
| 1 año, al máximo | 7.400 | 20 | Q5 | 1.536 |

**Bonificaciones y quién combate**

- Defensa: +10 % para el país que administra la región.
- Resistencia: +10 % para el país de origen de la región, si hoy está ocupada.
- Combaten los ciudadanos de los dos países y los de sus aliados con tratado. Cualquier otro jugador puede sumarse como voluntario, con −25 % de daño.

**Entrenar, experiencia y rango**

- Entrenar: una vez por día, 10 de energía, +10 de fuerza. El entrenamiento avanzado da +20 de fuerza por 1 Oro.
- El rango sube con el daño acumulado: llegar al rango n pide 10.000 × n² de daño. El rango 12 pide 1,44 millones, y el máximo es 20.

**Hospitales de campaña**

- Cada uso recupera 10 de energía y consume 15 Crédito del presupuesto, que salen del juego.
- Lo usa cualquier jugador del bando que lo instaló, hasta 100 de energía por día entre todos los hospitales.
- 200 usos cuestan 3.000 Crédito, menos de un día de recaudación de un país de 500 jugadores.

**Recompensas**

- Héroe de la ronda: quien hace más daño en cada bando gana 2 Oro y una medalla.

**País sin regiones**

- Queda ocupado: sus ciudadanos conservan la ciudadanía, pero no hay elecciones ni impuestos.
- Cualquier ciudadano puede iniciar una resistencia en una de sus regiones de origen por 20 Oro. Se lucha como una batalla normal.
- Si un país pierde su capital, la capital pasa a su región más poblada.

### Por validar en pruebas

- [ ] Que los jugadores muy activos (52 golpes por día) no se despeguen demasiado del resto
- [ ] Que el ataque aéreo valga su costo frente al marítimo
- [ ] Que las rondas de 4 horas no se sientan lentas
- [ ] Que las resistencias no hagan imposible sostener una conquista

## 7 · Sociedad y prensa

Los jugadores se organizan y discuten dentro del juego, sobre todo a través de periódicos propios. Este módulo cubre todo lo que pasa entre personas.

**Incluye**

- Periódicos: crear uno, publicar artículos, suscriptores, votos
- Noticias automáticas del mundo (batallas, leyes, récords)
- Mensajes privados, amigos y chat por país o unidad
- Notificaciones
- Moderación de contenido y reportes

**Ya propuesto**

- Sección de noticias en la pantalla principal, con fuente y antigüedad (ejemplo: Prensa nacional, hace 12 min).

**Por decidir**

- [ ] ¿Los artículos dan influencia o dinero a su autor?
- [ ] Idiomas: ¿un mundo en español o varios idiomas en el mismo mundo?
- [ ] Reglas de moderación y quién modera

## 8 · Ciclo diario y retención

El jugador vuelve cada día porque la energía se recarga, hay misiones nuevas y su país lo necesita en una batalla o una votación. Este módulo ordena esa rutina.

**Incluye**

- La rutina diaria: qué se hace en una sesión de pocos minutos
- Misiones diarias y semanales, y sus recompensas
- Logros y medallas
- Primeros días: tutorial y guía del nuevo ciudadano
- Eventos especiales del mundo

**Ya propuesto (valores de ejemplo de los bocetos)**

- Cuatro misiones diarias: trabajar, entrenar, combatir y votar. Completarlas da 1 Oro, y 7 días seguidos dan 3 Oro extra (valores ajustados por balance, módulo 4).
- Pantalla principal con "asuntos pendientes" y un registro de qué cambió tras cada acción.

**Por decidir**

- [ ] ¿Las misiones son siempre las mismas o cambian?
- [ ] Pasos del tutorial
- [ ] Qué pierde quien no entra un día (si pierde algo)

## 9 · Monetización

El juego se financia vendiendo Oro y comodidades, con un límite claro para que pagar no decida las guerras. Este módulo fija qué se vende y dónde está ese límite.

**Incluye**

- Qué se puede comprar con dinero real: Oro, suscripción, cosméticos
- Qué nunca se vende
- Precios y paquetes
- Publicidad (si la hay)

**Por decidir**

- [ ] ¿El Oro comprado se puede usar para comprar energía o armas?
- [ ] ¿Suscripción mensual con ventajas, o solo compras sueltas?
- [ ] Tope de gasto diario o de ventaja por pagar

## 10 · Interfaz y experiencia

La interfaz ya tiene una primera versión: una pantalla principal en escritorio y móvil, un sistema visual y una landing con el mapa. Este módulo reúne todas las pantallas y las reglas visuales.

**Incluye**

- Mapa de pantallas y navegación
- Sistema visual: tipografía, colores, espaciado, componentes
- Estados de cada acción: normal, cargando, éxito, error, deshabilitado
- Adaptación a móvil
- Accesibilidad

**Ya propuesto**

- Base clara, sin modo oscuro. IBM Plex Sans Condensed para títulos e IBM Plex Sans para el resto.
- El rojo queda reservado para la acción de combate; un solo botón rojo por pantalla.
- Cada acción muestra costo, beneficio y resultado.
- Pantallas hechas: pantalla principal (escritorio y móvil), hoja de estados, landing con mapa.

**Por decidir**

- [ ] Lista completa de pantallas por módulo
- [ ] ¿App móvil propia o web adaptada?

## 11 · Tecnología, operación y juego limpio

Un mundo compartido y persistente necesita un servidor que procese el día de juego para todos a la vez y frene a quien hace trampa. Este módulo describe cómo funciona por dentro.

**Incluye**

- Arquitectura: cliente web, servidor, base de datos
- Procesos del día de juego: recarga, producción, cierre de batallas y elecciones
- Estado compartido del mapa en tiempo real
- Multicuentas, bots y otras trampas: detección y sanciones
- Cuentas, seguridad y privacidad
- Herramientas internas para el equipo (administración, soporte)

**Ya propuesto**

- Panel de administración para el equipo, con estas funciones:
  - Elegir qué países participan. Los demás quedan en gris, bloqueados y sin interacción en el mapa.
  - Habilitar los territorios en disputa, que empiezan deshabilitados.
  - Revisar y corregir la agrupación de regiones de cada país antes de habilitarlo.
  - Asignar los territorios iniciales de cada país (criterio pendiente, módulo 2).
- Todos los procesos del día de juego corren en GMT−3.

### Infraestructura con presupuesto de $0

La propuesta es Supabase para los datos, las cuentas y las batallas en vivo, y Cloudflare para servir la web y disparar las tareas programadas. Las dos tienen plan gratuito sin tarjeta de crédito, y alcanzan para una beta cerrada de unos cientos de jugadores diarios.

| Pieza del juego | Servicio | Límite clave del plan gratuito |
| --- | --- | --- |
| Web del juego y archivo del mapa | Cloudflare Workers, archivos estáticos | Solicitudes de archivos estáticos gratis e ilimitadas |
| Tareas programadas (rondas, día de juego, elecciones) | Cloudflare Cron Triggers | 100.000 solicitudes por día y 10 ms de CPU por ejecución |
| Base de datos: economía, política, guerra | Supabase Postgres | 500 MB y 5 GB de transferencia por mes |
| Cuentas y acceso | Supabase Auth | 50.000 usuarios activos por mes |
| Batallas en vivo | Supabase Realtime | 200 conexiones simultáneas y 2 millones de mensajes por mes |
| Lógica del servidor | Funciones de Postgres y Supabase Edge Functions | 500.000 invocaciones por mes |
| Correos (verificación, avisos) | Resend | 3.000 por mes y 100 por día |
| Copias de seguridad | Copia diaria de la base con GitHub Actions | Supabase Free no incluye copias automáticas |

**Por qué esta combinación**

- La economía mueve dinero entre jugadores, empresas y tesoros, y eso pide transacciones de verdad. Postgres las tiene, y cada operación de dinero puede ser una función de la base que valida y registra todo junto. Eso también frena trampas, porque el navegador no decide saldos.
- Supabase trae cuentas, tiempo real y base en un solo proyecto, lo que reduce las piezas a mantener.
- Cloudflare sirve el mapa (0,9 MB) y la web sin costo. Así no se gasta la transferencia mensual de Supabase, que es el límite más ajustado.
- Es Postgres estándar: si el juego crece o cambian las condiciones, la base se puede mudar a otro proveedor.

**Reglas para no pasarse del plan gratuito**

- La energía y los cambios de día se calculan cuando el jugador entra, a partir de la hora de su última acción. No hay una tarea que recorra a todos los jugadores.
- El daño se guarda sumado por jugador y por batalla, no un registro por golpe.
- Solo la pantalla de batalla usa tiempo real. El resto se actualiza cuando el jugador hace algo.
- Las tareas programadas solo disparan funciones de la base: el cierre de cada ronda cada 4 horas y el cambio de día a las 00:00 GMT−3 (03:00 UTC). Los límites diarios de Cloudflare se reinician a las 00:00 UTC, que son las 21:00 en GMT−3.
- El juego vive en un subdominio gratuito de Cloudflare hasta que haya presupuesto para un dominio propio, que se paga por año.

**Cuándo empezar a pagar**

| Señal | Paso siguiente | Costo |
| --- | --- | --- |
| Transferencia de Supabase cerca de 5 GB por mes, base cerca de 500 MB o más de 150 jugadores conectados a la vez en batallas | Supabase Pro | Desde US$25 por mes |
| Más de 100.000 solicitudes por día en Cloudflare | Workers Paid | Mínimo US$5 por mes |
| Muchos correos de verificación por día | Plan pago de Resend o verificación por otro medio | A definir |

**Opciones descartadas**

- Vercel Hobby: es solo para uso personal y no comercial, y el juego va a tener monetización (módulo 9).
- Neon: su plan gratuito da 100 horas de cómputo por proyecto y por mes, y la base se suspende tras 5 minutos sin uso. No cubre un juego encendido las 24 horas.
- Solo Cloudflare (D1 y Durable Objects): D1 permite 100.000 filas escritas por día y los Workers gratuitos tienen 10 ms de CPU por solicitud. Es ajustado para la economía, y además faltaría un servicio de cuentas. Queda como opción para las batallas en vivo si Realtime se queda corto.
- Oracle Cloud Always Free: es el más potente (2 núcleos Arm, 12 GB de memoria, 200 GB de disco y 10 TB de transferencia por mes), pero exige administrar un servidor propio. Además, Oracle puede recuperar una máquina que pase 7 días con menos del 20 % de uso, que es justo lo que pasa antes del lanzamiento. Sirve como paso intermedio cuando haya alguien que lo mantenga.

**Riesgos**

- Supabase pausa un proyecto gratuito tras una semana sin actividad. Antes del lanzamiento puede pasar; se reactiva desde el panel.
- Las condiciones de los planes gratuitos cambian. Conviene revisarlas antes de abrir el juego.
- No pude confirmar en sus páginas de precios si Supabase Cron está incluido en el plan gratuito, ni las condiciones de uso comercial del plan gratuito de Cloudflare. Por eso las tareas programadas quedan en Cloudflare Cron Triggers.

Fuentes consultadas el 8 de octubre de 2026: [precios de Supabase](https://supabase.com/pricing), [precios de Cloudflare Workers](https://developers.cloudflare.com/workers/platform/pricing/), [límites de Cloudflare Workers](https://developers.cloudflare.com/workers/platform/limits/), [precios de Durable Objects](https://developers.cloudflare.com/durable-objects/platform/pricing), [precios de D1](https://developers.cloudflare.com/d1/platform/pricing/), [plan Hobby de Vercel](https://vercel.com/docs/plans/hobby), [precios de Neon](https://neon.com/pricing), [recursos Always Free de Oracle](https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm), [precios de Resend](https://resend.com/pricing) y [Supabase Cron](https://supabase.com/docs/guides/cron).

### Arquitectura técnica

Las reglas del juego viven en la base de datos y el navegador solo muestra y pide: ningún saldo, daño ni voto se calcula en la computadora del jugador. Todo se escribe en TypeScript y SQL.

&#91;embedded content: arquitectura técnica · navegador, Cloudflare, Supabase y apoyo\]

El navegador descarga la app y el mapa desde Cloudflare y todo lo demás se lo pide a Supabase; el reloj de Cloudflare dispara las mismas funciones del juego que usa el jugador.

| Capa | Tecnología | Por qué |
| --- | --- | --- |
| Lenguaje | TypeScript en la web y las funciones; SQL en la base | Un solo lenguaje de punta a punta, con tipos generados desde la base |
| Web del juego | React con Vite, como aplicación de una sola página | El juego vive detrás del login y no necesita un servidor propio para la interfaz |
| Datos en la web | TanStack Query | Caché, reintentos y actualización en segundo plano sin escribir esa lógica |
| Mapa | SVG con d3-geo y el TopoJSON propio | Ya funciona en la landing. Con unas 820 regiones no hace falta un motor de mapas; si en móvil se vuelve lento, se pasa a Canvas |
| Reglas del juego | Funciones de Postgres (PL/pgSQL) llamadas por RPC | Cada acción se valida y se aplica en una sola transacción, sin forma de saltarse una regla |
| Datos | Postgres en Supabase, con permisos por fila (RLS) | Cada jugador lee solo lo que le corresponde y nadie escribe las tablas directamente |
| Dinero | Libro contable de doble entrada | Cada movimiento registra origen, destino y motivo; los saldos se pueden auditar y reconstruir |
| Tiempo real | Supabase Realtime, un canal por batalla | El marcador se publica sumado cada pocos segundos, no por cada golpe |
| Tareas programadas | Cloudflare Cron Triggers que llaman a funciones de la base | Cada tarea se puede repetir sin efecto doble: si corre dos veces, la segunda no cambia nada |
| Cuentas | Supabase Auth, con Turnstile de Cloudflare en el registro | Login resuelto. Turnstile es gratuito y frena registros automáticos |
| Correos | Resend, enviado desde Supabase Edge Functions | Verificación de cuenta y avisos |
| Pruebas | pgTAP para las funciones de la base, Vitest para la web y Playwright para recorridos completos | Las reglas se prueban donde viven |
| Entrega | GitHub Actions: pruebas, migraciones y despliegue | Dos proyectos gratuitos de Supabase: uno de pruebas y uno de producción |
| Errores | Sentry (límites del plan gratuito a confirmar) | Errores de la web con contexto para reproducirlos |
| Mapa de origen | Scripts de Python que generan el TopoJSON desde Natural Earth | Ya existen. Cada región tiene un código fijo, compartido por el mapa y la base |

**Cómo se organiza el código**

Un solo repositorio con todas las piezas, para que un cambio de regla, su prueba y su pantalla viajen juntos:

```text
concordia/
  apps/web/              React: juego, landing y panel de administración
  apps/reloj/            Worker de Cloudflare con las tareas programadas
  supabase/migrations/   tablas, funciones y permisos, en SQL
  supabase/tests/        pruebas de las reglas (pgTAP)
  supabase/functions/    Edge Functions (correos)
  packages/tipos/        tipos de TypeScript generados desde la base
  datos/mapa/            scripts del mapa y TopoJSON generado
```

**Datos principales, por módulo**

| Módulo | Tablas |
| --- | --- |
| Mundo (2) | países, regiones, dueño actual de cada región |
| Ciudadano (3) | ciudadanos, solicitudes de ciudadanía, inventario |
| Economía (4) | empresas, empleos, ofertas del mercado, movimientos del libro contable, bancos, préstamos, yacimientos, contratos entre países |
| Política (5) | partidos, cargos, elecciones, leyes, votos |
| Guerra (6) | guerras, batallas, rondas, daño sumado por jugador y batalla, hospitales |
| Sociedad (7) | periódicos, artículos, mensajes, notificaciones |
| Operación (11) | registro de tareas programadas, registro de acciones de administración |

**Reglas técnicas**

- La base es la autoridad: el navegador pide «trabajar» y la base decide si puede, cuánto cobra y qué cambia.
- Cada acción tiene un límite de frecuencia por jugador, controlado en la misma función.
- Las horas se guardan en UTC. El día de juego (GMT−3) se calcula con una sola función de la base.
- Toda acción de administración queda registrada: quién, qué y cuándo.
- Los cambios de la base se hacen solo con migraciones en el repositorio, probadas antes en el proyecto de pruebas.

**Cuándo cambiaría algo**

- Si las batallas en vivo superan lo que da Supabase Realtime, cada batalla pasa a un Durable Object de Cloudflare con WebSockets.
- Si se pide una app para el teléfono, primero la misma web como aplicación instalable; una app nativa, solo si esa no alcanza.

**Por decidir**

- [x] Tecnología del servidor y dónde se aloja: Supabase y Cloudflare (ver Infraestructura con presupuesto de $0)
- [ ] Cuántos jugadores debe soportar el primer mundo
- [ ] Política de multicuentas

## 12 · Balance, métricas y glosario

Todos los números del juego viven en una sola tabla de parámetros, para ajustarlos sin reescribir los módulos. Este módulo se llena a medida que los demás fijan valores.

**Incluye**

- Tabla de parámetros: costos de energía, recompensas, impuestos, fórmulas
- Métricas de salud: jugadores activos por día, retención, inflación, batallas por día
- Glosario de términos del juego
- Registro de decisiones tomadas y su fecha

**Indicadores para ajustar el balance**

Los valores de los módulos 4 y 6 son el punto de partida. Estos indicadores dicen cuándo cambiarlos.

| Indicador | Rango sano | Si se sale del rango |
| --- | --- | --- |
| Oro neto por jugador activo y día | 0 a +0,5 | Bajar la recompensa por racha semanal o subir el costo de las empresas |
| Precio de la ración en el mercado | 10 a 20 Crédito | Ajustar el rendimiento del trigo o frenar la emisión |
| Daño por golpe del veterano frente al jugador nuevo | 15 veces o menos | Bajar el factor de rango (hoy 0,03) |
| Batallas abiertas por país y día | 0,5 a 2 | Ajustar el combustible que cuesta abrir una batalla |
| Jugadores que usan el entrenamiento avanzado | Menos del 50 % | Si son más, el Oro pesa demasiado en la guerra: subir su costo |
| Regiones que cambian de dueño por semana | 1 a 5 % del total | Ajustar las bonificaciones de defensa y resistencia |

**Glosario inicial**

- **Región:** unidad mínima de territorio; siempre tiene un país dueño.
- **Ocupada:** región cuyo dueño actual no es su país de origen.
- **Energía:** recurso diario que gastan las acciones.
- **Oro:** moneda común a todo el mundo.
- **Crédito:** moneda que se gana trabajando.

## Plan de desarrollo

El juego se construye en 30 módulos de desarrollo, agrupados en 8 fases. Cada módulo se programa, se prueba con un criterio concreto y se cierra antes de empezar el siguiente que dependa de él. Los códigos D01 a D30 los distinguen de los 12 módulos de diseño.

Ya hecho: el documento de diseño, y el mapa por regiones con la landing de prueba, que son la base de D03 y D04.

| Código | Módulo | Fase | Depende de | Avance |
| --- | --- | --- | --- | --- |
| D01 | Repositorio y entrega automática | 0 · Base | — | Pendiente |
| D02 | Reloj y día de juego | 0 · Base | D01 | Pendiente |
| D03 | Mundo: países, regiones y dueños | 1 · Mundo y cuentas | D01 | Pendiente |
| D04 | Mapa del juego | 1 · Mundo y cuentas | D03 | Pendiente |
| D05 | Cuentas | 1 · Mundo y cuentas | D01 | Pendiente |
| D06 | Ciudadanía | 1 · Mundo y cuentas | D03, D05 | Pendiente |
| D07 | Panel de administración | 1 · Mundo y cuentas | D03, D05 | Pendiente |
| D08 | Perfil y energía | 2 · Economía básica | D05 | Pendiente |
| D09 | Libro contable y monedas | 2 · Economía básica | D01 | Pendiente |
| D10 | Empresas y trabajo | 2 · Economía básica | D08, D09 | Pendiente |
| D11 | Mercado | 2 · Economía básica | D10 | Pendiente |
| D12 | Productos y consumo | 2 · Economía básica | D11 | Pendiente |
| D13 | Misiones diarias | 2 · Economía básica | D10, D12 | Pendiente |
| D14 | Entrenamiento | 3 · Guerra | D08 | Pendiente |
| D15 | Batallas y rondas | 3 · Guerra | D02, D03, D12 | Pendiente |
| D16 | Combate y daño | 3 · Guerra | D14, D15 | Pendiente |
| D17 | Batalla en vivo | 3 · Guerra | D16 | Pendiente |
| D18 | Conquista y hospitales | 3 · Guerra | D16 | Pendiente |
| D19 | Partidos y elecciones | 4 · Política | D06 | Pendiente |
| D20 | Cargos de gobierno | 4 · Política | D19 | Pendiente |
| D21 | Leyes y votaciones | 4 · Política | D20 | Pendiente |
| D22 | Recursos y yacimientos | 5 · Economía avanzada | D10, D18 | Pendiente |
| D23 | Bancos y sociedades | 5 · Economía avanzada | D09, D21 | Pendiente |
| D24 | Cambio de monedas y emisión | 5 · Economía avanzada | D21 | Pendiente |
| D25 | Prensa y noticias | 6 · Sociedad y retención | D05 | Pendiente |
| D26 | Mensajes y notificaciones | 6 · Sociedad y retención | D05 | Pendiente |
| D27 | Tutorial y logros | 6 · Sociedad y retención | D13 | Pendiente |
| D28 | Juego limpio | 7 · Beta cerrada | D10, D16 | Pendiente |
| D29 | Operación y monitoreo | 7 · Beta cerrada | D02 | Pendiente |
| D30 | Lanzamiento de la beta | 7 · Beta cerrada | D28, D29 | Pendiente |

Las pruebas que dependen del tiempo (rondas, 72 horas, recarga de energía) usan un reloj simulado, para no esperar horas reales.

### Fase 0 · Base

#### D01 · Repositorio y entrega automática

- [ ] Repositorio único con la estructura del módulo 11
- [ ] Dos proyectos de Supabase (pruebas y producción) y una cuenta de Cloudflare
- [ ] GitHub Actions: revisión de código y tipos, pruebas, migraciones y despliegue

**Prueba:** un cambio mínimo pasa las pruebas, llega solo al proyecto de pruebas y, al aprobarlo, a producción.

#### D02 · Reloj y día de juego

- [ ] Función del día de juego en GMT−3
- [ ] Worker de Cloudflare con las tareas programadas
- [ ] Registro de tareas, para que una tarea repetida no aplique su efecto dos veces

**Prueba:** a las 03:00 UTC cambia el día de juego, y ejecutar la misma tarea dos veces deja un solo efecto.

### Fase 1 · Mundo y cuentas

#### D03 · Mundo: países, regiones y dueños

- [ ] Tablas de países, regiones y dueño actual
- [ ] Carga de las 78 regiones de los 13 países con su código fijo
- [ ] Lectura pública del estado del mapa

**Prueba:** la base devuelve 13 países activos y 78 regiones, cada una con su dueño.

#### D04 · Mapa del juego

- [ ] Mapa de la landing pasado a la app
- [ ] Dueños y colores leídos desde la base

**Prueba:** cambiar el dueño de una región en la base cambia su color en el mapa al recargar.

#### D05 · Cuentas

- [ ] Registro e inicio de sesión con Supabase Auth
- [ ] Turnstile en el registro
- [ ] Correo de verificación con Resend

**Prueba:** una persona se registra, verifica su correo, entra y sale; un registro sin Turnstile se rechaza.

#### D06 · Ciudadanía

- [ ] Alta de ciudadano y solicitud de ciudadanía
- [ ] Aprobación por el ministro del Interior o el presidente, con estado de residente mientras espera
- [ ] Aprobación automática a las 72 horas para jugadores nuevos

**Prueba:** una solicitud aprobada da la ciudadanía; otra sin respuesta se aprueba sola a las 72 horas.

#### D07 · Panel de administración

- [ ] Activar y desactivar países
- [ ] Habilitar territorios en disputa y revisar regiones
- [ ] Registro de cada acción de administración

**Prueba:** desactivar un país lo pone en gris en el mapa y queda registrado quién lo hizo.

### Fase 2 · Economía básica

#### D08 · Perfil y energía

- [ ] Perfil con nivel, experiencia, fuerza, rango e influencia
- [ ] Energía calculada al entrar: 10 por hora, máximo 100

**Prueba:** con el reloj adelantado 3 horas, la energía sube 30 y nunca pasa de 100.

#### D09 · Libro contable y monedas

- [ ] Libro contable de doble entrada
- [ ] Oro y una moneda local por país
- [ ] Transferencias como funciones de la base

**Prueba:** después de 1.000 transferencias al azar, el total de dinero no cambia y ningún saldo queda negativo.

#### D10 · Empresas y trabajo

- [ ] Crear empresas de materia prima y fábricas, pagando en Oro
- [ ] Ofertas de empleo, trabajar una vez por día y cobrar salario
- [ ] Impuesto al trabajo hacia el tesoro

**Prueba:** trabajar dos veces el mismo día se rechaza, y el salario cobrado es el bruto menos el 12 %.

#### D11 · Mercado

- [ ] Publicar ofertas y comprar
- [ ] IVA, arancel y comisión del 1 %

**Prueba:** en una compra, el dinero que sale del comprador es exactamente lo que reciben el vendedor y el tesoro, más la comisión que sale del juego.

#### D12 · Productos y consumo

- [ ] Raciones, armas Q1 a Q5 y combustible
- [ ] Comer raciones, con tope de 200 de energía por día

**Prueba:** recuperar más de 200 de energía con comida en un mismo día se rechaza.

#### D13 · Misiones diarias

- [ ] Cuatro misiones diarias con 1 Oro de recompensa
- [ ] Racha de 7 días con 3 Oro extra

**Prueba:** completar las cuatro paga 1 Oro una sola vez por día.

### Fase 3 · Guerra

Mientras no exista el Congreso (D21), las guerras las declara el panel de administración.

#### D14 · Entrenamiento

- [ ] Entrenar una vez por día: +10 de fuerza
- [ ] Entrenamiento avanzado: +20 por 1 Oro

**Prueba:** entrenar dos veces el mismo día se rechaza.

#### D15 · Batallas y rondas

- [ ] Abrir batallas terrestres, marítimas y aéreas, con sus requisitos y su combustible
- [ ] Rondas de 4 horas cerradas por el reloj, al mejor de 5
- [ ] Máximo de 2 batallas ofensivas por país

**Prueba:** un país sin costa disponible no puede abrir una batalla marítima, y una batalla termina cuando un bando gana 3 rondas.

#### D16 · Combate y daño

- [ ] Golpe con la fórmula de daño, armas y bonificaciones
- [ ] Voluntarios con −25 %
- [ ] Daño sumado por jugador y batalla, y héroe de la ronda

**Prueba:** el daño por golpe coincide con la tabla de perfiles del módulo 6.

#### D17 · Batalla en vivo

- [ ] Canal de Realtime por batalla
- [ ] Marcador publicado sumado cada pocos segundos

**Prueba:** dos navegadores ven el mismo marcador mientras un tercero combate.

#### D18 · Conquista y hospitales

- [ ] Cambio de dueño y de color al ganar
- [ ] Hospitales de campaña con presupuesto

**Prueba:** al ganar una batalla, la región cambia de color en el mapa de todos los jugadores.

### Fase 4 · Política

Antes de empezar hay que cerrar los pendientes del módulo 5.

#### D19 · Partidos y elecciones

- [ ] Partidos y afiliación
- [ ] Elecciones de presidente y de Congreso, alternadas cada 15 días

**Prueba:** con el reloj simulado, se alternan una elección presidencial y una del Congreso cada 15 días, y gana quien tiene más votos.

#### D20 · Cargos de gobierno

- [ ] Vicepresidente, ministros y embajadores designados por el presidente
- [ ] Permisos de cada cargo

**Prueba:** solo el presidente y el ministro de Guerra pueden abrir una batalla.

#### D21 · Leyes y votaciones

- [ ] Tipos de ley: impuestos, guerra y paz, salario mínimo y criterios de ciudadanía
- [ ] Votación con plazo y aplicación del efecto

**Prueba:** una ley aprobada que sube un impuesto cambia lo que se cobra desde el día siguiente.

### Fase 5 · Economía avanzada

Antes de empezar hay que elegir la fuente de datos de recursos reales.

#### D22 · Recursos y yacimientos

- [ ] Yacimientos de cada región calculados desde datos reales
- [ ] Exploración, mantenimiento y bonificación de producción
- [ ] Contratos de yacimientos entre países

**Prueba:** explorar un yacimiento de nivel 2 lleva la producción de esa materia prima del 50 % al 80 %.

#### D23 · Bancos y sociedades

- [ ] Banco central y cuentas oficiales
- [ ] Licitación de bancos privados: depósitos, préstamos, garantía e impago
- [ ] Sociedades entre jugadores

**Prueba:** un préstamo impago descuenta el 50 % de cada salario del deudor hasta saldarlo.

#### D24 · Cambio de monedas y emisión

- [ ] Mercado de cambio entre Oro y monedas locales
- [ ] Ley de emisión: 1 Oro del tesoro por cada 100 Crédito

**Prueba:** emitir 1.000 Crédito descuenta 10 Oro del tesoro.

### Fase 6 · Sociedad y retención

#### D25 · Prensa y noticias

- [ ] Periódicos y artículos
- [ ] Noticias automáticas de batallas, leyes y conquistas

**Prueba:** una conquista publica una noticia automática en el país conquistado.

#### D26 · Mensajes y notificaciones

- [ ] Mensajes entre jugadores
- [ ] Notificaciones de batallas, votaciones y ciudadanía

**Prueba:** abrir una votación notifica a todos los ciudadanos del país.

#### D27 · Tutorial y logros

- [ ] Tutorial del nuevo ciudadano
- [ ] Logros y medallas

**Prueba:** un jugador nuevo completa el tutorial y termina con su primera jornada de trabajo hecha.

### Fase 7 · Beta cerrada

La monetización queda para después de esta fase, con el módulo 9 cerrado.

#### D28 · Juego limpio

- [ ] Límites de frecuencia en cada acción
- [ ] Detección de multicuentas

**Prueba:** un script que repite una acción muy rápido queda frenado por el límite.

#### D29 · Operación y monitoreo

- [ ] Copia diaria de la base y una restauración probada
- [ ] Registro de errores con Sentry
- [ ] Tablero con los indicadores del módulo 12

**Prueba:** se restaura la copia del día anterior en el proyecto de pruebas y el juego funciona.

#### D30 · Lanzamiento de la beta

- [ ] Revisar las condiciones de los planes gratuitos
- [ ] Términos de uso y política de privacidad
- [ ] Invitar a los primeros jugadores

**Prueba:** los primeros jugadores invitados se registran y juegan un día completo sin errores bloqueantes.
