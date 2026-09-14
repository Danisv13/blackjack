# Blackjack

Juego individual de blackjack en HTML, CSS y JavaScript, sin dependencias de ejecución ni compilación.

## Ejecutar

Abre `index.html` en un navegador moderno. También se puede servir la carpeta con cualquier servidor estático y publicar directamente mediante GitHub Pages.

## Pruebas

Con Node.js 20 o posterior, ejecuta `npm test`. No es necesario instalar paquetes. Las pruebas cubren el motor y la integración con una interfaz y reloj simulados; no sustituyen una revisión visual en navegadores reales.

## Reglas

- Una baraja nueva de 52 cartas por mano; ases de 1 u 11 y figuras de 10.
- Una carta de la banca queda oculta durante el turno del jugador.
- El blackjack inicial se resuelve al repartir; dos blackjacks empatan.
- Al llegar a 21, termina automáticamente el turno. Al superarlo, se pierde.
- La banca pide hasta 17 y se planta en 17 suave.
- Una sesión tiene tres manos; hacen falta dos victorias para ganarla. Los empates cuentan como manos jugadas.
- El contrarreloj opcional concede 60 segundos por mano, también en segundo plano. No puede cambiarse durante una mano.
- Los contadores son de sesión y se pierden al recargar. Solo se guarda el volumen, cuando el navegador lo permite.

## Estructura

- `game.js`: puntuación, baraja, estados y resultados, sin acceso al DOM.
- `script.js`: controles, presentación, reloj y audio.
- `index.html`, `styles.css`: mesa adaptable a pantallas pequeñas.
- `index2.html`, `styles2.css`: reglas completas.
- `tests/`: regresiones con el ejecutor de pruebas integrado de Node.js.

Las rondas solo se liquidan una vez. Las acciones se validan en el motor además de desactivarse en la interfaz. Los resultados usan identificadores, independientemente del texto mostrado.

## Alcance

Esta versión corrige el ciclo de partida y mejora los controles y la presentación. No incluye apuestas, recompensas, perfiles persistentes, dividir parejas ni doblar. Esas ampliaciones requieren reglas y pruebas adicionales.

## Recursos originales

Se conservan `jazz-cafe-143906.mp3` y la imagen de fondo del repositorio original, aunque la mesa ahora utiliza un fondo CSS. El repositorio original no documenta autoría ni licencia de estos archivos; este cambio no les atribuye ninguna licencia.
