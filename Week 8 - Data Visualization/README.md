# Práctica semana 8 - Visualización de datos

**Autor:** Alejandro de Olózaga Ramírez

**Fecha:** 13 de Noviembre del 2025

## Descripción
En esta práctica, se propone una aplicación web desarrollada en [Codesandbox](https://codesandbox.io/p/sandbox/ig-semana-8-parking-mg78mm) para la simulación y visualización en 2D de datos importados provenientes del portal abierto de Sagulpa. El código representa la ocupación de diferentes aparcamientos públicos de Sagulpa en Las Palmas de Gran Canaria por unidad de tiempo en el mes de septiembre de 2025. 

Lo que se genera es un mapa de la ciudad con la localización de cada parking y su respectivo flujo de entrada y salida de vehículos representado por un mapa de calor dinámico. 


## Funcionalidades
En este proyecto, se integran las distintas funcionalidades que se comentan a continuación:

- Mapa 2D: visualización de datos de aparcamiento sobre un mapa 2D de la ciudad de Las Palmas de Gran Ganaria.
- Cámara libre: opción de rotar, modificar zoom y desplazar la cámara para inspeccionar el mapa.
- Tiempo: especificación de fecha y hora en las que se sitúan los datos. Además, se proporciona un ajuste en la interfaz gráfica para regular la velocidad a la que pasa el tiempo, permitiendo deternerlo.
- HUD: visualización de un mapa de calor donde cada punto es un parking. La intensidad depende de la capacidad de ocupación de cada uno (plazas totales). Se añade un panel mostrando la ocupación total y de cada aparcamiento en tiempo real.


## Tecnologías
Las tecnologías y librerías usadas son las siguientes:
- HTML5 y CSS3: estructura base.
- JavaScript: lenguaje de programación, base del proyecto.
- Three.js (v0.152.1): motor 3D para la creación de la escena, cámara (control orbital), geometrías y textura.
- heatmap.js (v2.0.5): generación del canvas del mapa de calor.
- lil-gui (v0.20.0): interfaz gráfica sencilla para realizar ajustes.


## Datos
La aplicación depende de tres archivos de datos estáticos en formato CSV:
- ``src/mapaLPGC.png``: mapa de la ciudad de Las Palmas de Gran Canaria que se usa como textura principal.
- ``src/geolocalizacionParking.csv``: proporciona la información general de cada parking (nombre, calle, código, número, latitud, altitud). Solo se utiliza el nombre y la localización, pero los datos restantes permiten futuras implementaciones.
- ``src/parkingSeptiembre2025.csv``: proporciona la información de los movimientos (entradas y salidas) de vehículos en cada parking con un registro de fecha y hora. Se cuenta con registros desde el 1 al 30 de septiembre de 2025.

Además, se añade una variable ``Map`` para incluir la capacidad máxima de cada parking.


## Uso de IA
La Inteligencia artificial se ha usado para solucionar diversos errores a lo largo del proceso de desarrollo (sobre todo en la importación de los datos) y para planteamiento de dudas puntuales con respecto a las funcionalidades implementadas.