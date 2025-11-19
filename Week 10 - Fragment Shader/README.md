# Práctica semana 9/10 - _Fragment Shader_

**Autor:** Alejandro de Olózaga Ramírez

**Fecha:** 19 de Noviembre del 2025

## Descripción
En esta práctica, se propone un dibujado con el _Fragment Shader_ en [Codesandbox](https://codesandbox.io/p/sandbox/ig2526-s9-forked-ksdz6t) para interactuar y practicar con las posibilidades de diseño o dibujado del recurso. Lo que se presenta es un fondo animado frente a 6 esferas cada una con una textura distinta: una con símbolo de radiación y las otras 5 con banderas de países.



A continuación, se adjunta una animación en formato GIF y un enlace para el [vídeo en YouTube](https://youtu.be). 

![Proyecto Fragment Shader en GIF](fragmentShader.gif)

## _Fragment Shader_
### Definiciones generales
Para cada _Fragment Shader_ se especifica la siguiente configuración, que fuerza el uso de precisión media para decimales en dispositivos móviles o navegadores.
```js
#ifdef GL_ES
precision mediump float;
#endif
```

Aparte, se declaran los siguientes _uniform_, que son las variables globales provenientes de la CPU. Se determina el tamaño de la ventana (exclusivamente para el fondo), la posición del ratón y el tiempo transcurrido.
```js
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
```

Se normalizan las coordenadas de (-1, -1) a (1, 1) con la siguiente línea, convirtiendo el punt (0, 0) en el centro de la imagen.
``vec2 st = vUv * 2.0 - 1.0;``

### Fondo animado


### Símbolo de radiación

### Banderas de países
Para las banderas de los países, simplemente, se calculan los puntos que se encuentran en un rango para pintarlos de un color determinado. Por ejemplo, en la bandera de España, los puntos del eje Y (``vUv.y``) que estén en el primer tercio (``st.y < 0.33``), se pinta de rojo.

Para las banderas con franjas horizontales, como la de Canarias, se usa la coordenada X en vez de la Y (``st.x < 0.33``). Aunque también se podría pintar por franjas verticales, para que se pinten anillos, y luego girarlo.


## Tecnologías
Las tecnologías y librerías usadas son las siguientes:
- HTML5 y CSS3: estructura base.
- JavaScript: lenguaje de programación, base del proyecto.
- Three.js (v0.152.1): motor 3D para la creación de la escena, cámara (control orbital), geometrías y textura.


## Uso de IA
La Inteligencia artificial se ha usado para solucionar diversos errores a lo largo del proceso de desarrollo (sobre todo en la importación de los datos), para planteamiento de dudas puntuales con respecto al _Fragment Shader_ y para posibles ideas para la realización del proyecto.