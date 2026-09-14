# Blackjack

Mesa de blackjack individual en HTML, CSS y JavaScript. Sin compilación ni dependencias de ejecución.

## Ejecutar

Abre index.html o sirve la carpeta con un servidor estático. GitHub Pages puede publicar directamente estos archivos. Se recomienda usar una dirección HTTP estable para conservar el guardado del navegador.

## Jugar

- Banca en la zona central de la mesa y mano del jugador junto al borde inferior.
- Sin reloj, sesiones de tres manos ni contador de victorias.
- Monedero inicial de 100 monedas ficticias; equivalencia visual de 1 moneda = 1 euro ficticio. Sin transacciones de dinero real.
- Apuesta escrita por teclado: cualquier importe positivo hasta el saldo, con hasta dos decimales. No existe un mínimo de mesa de 10 monedas.
- Se descuenta la apuesta al repartir y solo se liquida una vez.
- Victoria normal: ganancia 1:1. Blackjack inicial: ganancia 3:2. En ambos casos se devuelve también la apuesta. Empate: devolución de la apuesta. Derrota: sin devolución.
- El motor calcula en céntimos enteros. La ganancia de blackjack se redondea al céntimo más cercano, con medios céntimos hacia arriba.
- Saldo cero tras una mano: se repone a 100, una sola vez. No se repone mientras la apuesta siga en juego.
- Ases de 1 u 11, figuras de 10, baraja nueva de 52 cartas por mano. La banca se planta en 17 suave. El blackjack se comprueba al repartir y llegar a 21 termina el turno.
- No se incluyen dividir parejas, doblar, seguro, rendición ni experiencia.

Los pagos y la regla de banca se basan en [las reglas de Bicycle](https://bicyclecards.com/how-to-play/blackjack). El redondeo, la recarga y la equivalencia ficticia son decisiones de este juego.

## Guardado

La clave localStorage blackjack-table-v1 guarda monedero, apuesta, cartas restantes, manos y resultado. Una recarga reanuda la mano sin cobrar ni devolver de nuevo. Los datos se validan al restaurar; un guardado inválido se reemplaza por un monedero inicial con aviso. Un fallo de almacenamiento permite continuar en memoria y se comunica al jugador.

Las actualizaciones de otra pestaña se recogen antes de la siguiente acción. Utiliza una sola pestaña: localStorage no ofrece transacciones atómicas para acciones simultáneas de varias pestañas. El guardado local es modificable por el usuario, no sincroniza dispositivos y no sirve para saldos reales ni clasificaciones competitivas.

La antigua versión solo guardaba el volumen, cuya clave se conserva. No había saldo que migrar.

## Pruebas

Con Node.js 20 o posterior:

    npm test

No es necesario instalar paquetes. En entornos que bloquean los subprocesos del ejecutor:

    node -e "require('./tests/game.test.js'); require('./tests/ui.test.js')"

Las pruebas incluyen reglas, pagos, importes inválidos, acciones repetidas, recarga por saldo cero, restauración de partidas y controles con un DOM simulado.

## Estructura

- game.js: reglas, monedero, liquidación y validación de guardados.
- script.js: interfaz, almacenamiento y audio.
- index.html / styles.css: mesa y controles adaptables.
- index2.html / styles2.css: reglas completas.
- tests/: regresiones con el ejecutor integrado de Node.js.

## Recursos originales

Se conservan jazz-cafe-143906.mp3 y la imagen de fondo original (sin uso en la mesa CSS). El repositorio original no documenta su autoría ni licencia; no se les atribuye una licencia nueva.
