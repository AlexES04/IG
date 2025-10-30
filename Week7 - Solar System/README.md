# Práctica semana 6/7 - Sistema solar

**Autor:** Alejandro de Olózaga Ramírez

**Fecha:** 30 de Octubre del 2025

Este proyecto implementa una simulación 3D interactiva del sistema solar con control de vuelo, texturas, órbitas, sombras y cámara secundaria. Ha sido realizado en [_CodeSandbox_](https://codesandbox.io/p/sandbox/s6-7-sistema-planetario-7gjkt3), en JavaScript, usando la librería _Three.js_. [Enlace a vídeo de YouTube](https://youtu.be/Z_pMQ0jz0a8) para visualización del proyecto en funcionamiento.

## Características
- Visualización 3D del Sistema Solar:
	- Representación del sol y planetas con texturas propias.
	- Trayectoria de cada planeta dibujada (órbitas).
- Cámara principal y *viewport*:
	- Cámara libre que simula un vuelo por el modelo:
	-  _Viewport_ pequeño en la parte inferior de la pantalla que muestra un planeta seleccionado.
- Iluminación:
	- Añadida luz ambiental para la iluminación general.
	- Añadida luz puntual que simula la que emite el sol.
- Sombras:
	- Sombras creadas por la luz puntual y los cuerpos que se interpongan entre la fuente de luz (Sol) y los demás cuerpos.
- Detalles extra:
	- Textura transparente de nubes en La Tierra.
	- Anillo de Saturno.
	- Sombreado especular con control de brillo.
	- Luna terrestre con su propia órbita y textura.

## Interfaz de usuario 
La interfaz de usuario creada con la librería lil.gui permite dos acciones:
- Indicar el planeta que se desee visualizar en el _viewport_ en la parte inferior de la pantalla.
- Crear un nuevo planeta con nombre, radio, distancia al sol, color y velocidad de traslación y rotación personalizados.

## Controles de vuelo

| Acción |Tecla  |
|--|--|
| Mover hacia delante |W/S  |
| Mover lateralmente |A/D  |
| Subir y bajar |R/F  |
| Rotar cámara |Deslizar ratón  |


## Tecnologías utilizadas
- JavaScript: lenguaje de programación, base del proyecto.
- Librería Three.js: motor 3D de WebGL.
- Librería lil.gui: interfaz gráfica sencilla.
- FlyControls: controles de vuelo 3D sencillos.

## Uso de IA
La Inteligencia artificial se ha usado para conseguir la información de los planetas (tamaños, distancia al sol, velocidades...) y ajustar esos parámetros dentro de unos rangos deseados. Además, se ha usado para dudas puntuales que se han tenido a lo largo del desarrollo de la práctica y también para la generación de la interfaz gráfica con _lil.gui_.
