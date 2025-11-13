import GUI from "lil-gui";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import h337 from "heatmap.js";

let scene, renderer, camera, camcontrols;
let mapa,
  mapsx,
  mapsy,
  scale = 10;

let heatmapInstance, heatmapTexture, heatmapPlane;
const HEATMAP_RES_X = 512;
let HEATMAP_RES_Y;

// Latitud y longitud de los extremos del mapa de la imagen
let minlon = -15.46945,
  maxlon = -15.39203;
let minlat = 28.07653,
  maxlat = 28.18235;
// Dimensiones textura (mapa)
let txwidth, txheight;

let objetos = [];
//Datos fecha, estaciones, préstamos
const fechaInicio = new Date(2025, 8, 1); //Desde mayo (enero es 0)
let fechaActual;
let totalMinutos = 0, //8:00 como arranque
  fecha2show,
  infoParkingShow;
const datosParking = [],
  datosEstaciones = [];

const carsNumber = new Map();
const parkingCapacity = new Map([
  ["VEGUETA", 211],
  ["RINCÓN", 822],
  ["METROPOL", 244],
  ["MATA", 107],
  ["NUEVOS JUZGADOS", 464],
  ["SAN BERNARDO", 371],
  ["ELDER", 159],
]);
const maxCapacity = 2378;

let nextMoveIndex = 0;
let minuteStep = 1;

let texturacargada = false;
let parkingLoaded = false;

init();
animate();

function init() {
  //Muestra fecha actual como título
  showDate();
  showParkingLots();

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  //Posición de la cámara
  camera.position.z = 7;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camcontrols = new OrbitControls(camera, renderer.domElement);

  const gui = new GUI();
  const options = { timeSpeed: 1 };

  gui
    .add(options, "timeSpeed", 0, 50, 1)
    .name("Time Speed")
    .onChange((value) => {
      minuteStep = value;
    });
  //CARGA TEXTURA (MAPA)
  //Crea plano, ajustando su tamaño al de la textura, manteniendo relación de aspecto
  const tx1 = new THREE.TextureLoader().load(
    "src/mapaLPGC.png",

    // Acciones a realizar tras la carga
    function (texture) {
      //Objeto sobre el que se mapea la textura del mapa
      //Plano para mapa manteniendo proporciones de la textura de entrada
      const txaspectRatio = texture.image.width / texture.image.height;
      mapsy = scale;
      mapsx = mapsy * txaspectRatio;
      Plano(0, 0, 0, mapsx, mapsy);

      crearPlanoHeatmap();

      //Dimensiones, textura
      //console.log(texture.image.width, texture.image.height);
      mapa.material.map = texture;
      mapa.material.needsUpdate = true;

      texturacargada = true;

      //
      //CARGA DE DATOS
      //Antes debe disponerse de las dimensiones de la textura, su carga debe haber finalizado
      //Lectura del archivo csv con localizaciones de las estaciones Sitycleta
      fetch("src/geolocalizacionParking.csv")
        .then((response) => {
          if (!response.ok) {
            throw new Error("Error: " + response.statusText);
          }
          return response.text();
        })
        .then((content) => {
          processCSVParkingLocationsWith(content);
        })
        .catch((error) => {
          console.error("Error al cargar el archivo:", error);
        });

      //Carga datos de un año de préstamos desde el csv
      fetch("src/parkingSeptiembre2025.csv")
        .then((response) => {
          if (!response.ok) {
            throw new Error("Error: " + response.statusText);
          }
          return response.text();
        })
        .then((content) => {
          processCSVParkingInfoWith(content);
        })
        .catch((error) => {
          console.error("Error al cargar el archivo:", error);
        });
    } //function Texture
  ); //load
}

//Procesamiento datos csv
function processCSVParkingLocationsWith(content) {
  const sep = ";"; // separador ;
  const filas = content.split("\n");

  // Primera fila es el encabezado, separador ;
  const encabezados = filas[0].split(sep);
  // Obtiene índices de columnas de interés
  const indices = {
    id: encabezados.indexOf("idbase"),
    nombre: encabezados.indexOf("nombre"),
    lat: encabezados.indexOf("latitud"),
    lon: encabezados.indexOf("altitud"),
  };
  console.log("Parking lot indexes: ", indices);

  // Extrae los datos de interés
  for (let i = 1; i < filas.length; i++) {
    const columna = filas[i].split(sep); // separador ;
    if (columna.length > 1) {
      // No fila vacía
      datosEstaciones.push({
        id: columna[indices.idbase],
        nombre: columna[indices.nombre],
        lat: columna[indices.lat],
        lon: columna[indices.lon],
      });

      //longitudes crecen hacia la derecha, como la x
      let mlon = Map2Range(
        columna[indices.lon],
        minlon,
        maxlon,
        -mapsx / 2,
        mapsx / 2
      );
      //Latitudes crecen hacia arriba, como la y
      let mlat = Map2Range(
        columna[indices.lat],
        minlat,
        maxlat,
        -mapsy / 2,
        mapsy / 2
      );
      //Esfera en posición estaciones
      Esfera(mlon, mlat, 0, 0.03, 20, 10, 0x009688);
    }
  }
  console.log("Parking lots CSV file loaded correctly.");
}

function processCSVParkingInfoWith(content) {
  const sep = ";"; // separador ;
  const filas = content.split(/\r?\n/);

  // 2. Limpia la PRIMERA fila de un posible BOM (Byte Order Mark)
  let primeraFila = filas[0];
  if (primeraFila.charCodeAt(0) === 0xfeff) {
    primeraFila = primeraFila.substring(1);
  }

  const encabezados = primeraFila.split(sep);

  // Obtiene índices de columnas de interés
  const indices = {
    time: encabezados.indexOf("Time"),
    movement: encabezados.indexOf("MovementTypeDesig"),
    location: encabezados.indexOf("PARKING"),
  };

  parkingLoaded = true;
  console.log("Parking info indexes: ", indices);

  // Extrae los datos de interés
  for (let i = 1; i < filas.length; i++) {
    const columna = filas[i].split(sep);
    if (columna.length > 1) {
      // No fila vacía
      datosParking.push({
        timeStamp: convertirFecha(columna[indices.time]),
        movement: columna[indices.movement],
        location: columna[indices.location],
      });
      addParkingLot(columna[indices.location]);
    }
  }
  console.log("Parking CSV file loaded correctly");
  console.log("Parking lots: ", carsNumber);
}

function setMovement() {
  while (datosParking[nextMoveIndex].timeStamp <= fechaActual) {
    const register = datosParking[nextMoveIndex];
    const movementType = register.movement;
    const parking = register.location;

    if (movementType == "ENTRADA") {
      carsNumber.set(parking, carsNumber.get(parking) + 1);
    } else if (movementType == "SALIDA") {
      carsNumber.set(parking, Math.max(carsNumber.get(parking) - 1, 0));
    }

    nextMoveIndex++;
  }
}
function addParkingLot(parking) {
  if (!carsNumber.has(parking)) carsNumber.set(parking, 0);
}

/**
 * Crea el contenedor, inicializa heatmap.js y crea el plano de Three.js
 */
function crearPlanoHeatmap() {
  // 1. Calcula el alto de la textura manteniendo la proporción del mapa
  HEATMAP_RES_Y = Math.round(HEATMAP_RES_X * (mapsy / mapsx));

  // 2. Crea un 'div' contenedor para heatmap.js
  // Este div debe existir en el DOM, pero no necesitamos verlo.
  const heatmapContainer = document.createElement("div");
  heatmapContainer.style.width = `${HEATMAP_RES_X}px`;
  heatmapContainer.style.height = `${HEATMAP_RES_Y}px`;
  heatmapContainer.style.position = "absolute"; // Oculto fuera de pantalla
  heatmapContainer.style.left = "-9999px";
  document.body.appendChild(heatmapContainer);

  // 3. Inicializa heatmap.js
  heatmapInstance = h337.create({
    container: heatmapContainer,
    radius: 50, // <-- ¡JUEGA CON ESTE VALOR! Es el radio de influencia en píxeles.
    maxOpacity: 0.8, // Opacidad máxima en el centro de un punto
    minOpacity: 0.1, // Opacidad mínima
    blur: 0.9, // Desenfoque
    // Define el gradiente de color (¡mucho más fácil!)
    // 0.0 es 'frío' (azul), 1.0 es 'caliente' (rojo)
    gradient: {
      "0.0": "blue",
      0.2: "cyan",
      0.4: "lime",
      0.6: "yellow",
      0.8: "red",
      "1.0": "red",
    },
  });

  // 4. Obtiene el <canvas> que heatmap.js CREÓ automáticamente
  const canvas = heatmapContainer.querySelector("canvas");

  // 5. Crea la textura de Three.js a partir de ESE canvas
  heatmapTexture = new THREE.CanvasTexture(canvas);

  // 6. Crea el plano de Three.js (igual que antes)
  const heatmapGeometry = new THREE.PlaneGeometry(mapsx, mapsy);
  const heatmapMaterial = new THREE.MeshBasicMaterial({
    map: heatmapTexture,
    transparent: true,
    opacity: 0.7, // Opacidad general de la capa de heatmap
  });

  heatmapPlane = new THREE.Mesh(heatmapGeometry, heatmapMaterial);
  // Colócalo una pizca por encima del mapa para evitar "z-fighting"
  heatmapPlane.position.z = 0.01;
  scene.add(heatmapPlane);
}

function updateHeatMap() {
  // 1. Preparamos el array de datos para heatmap.js
  const dataPoints = [];

  // Iteramos por todos los parkings (almacenados en 'objetos')
  for (let i = 0; i < objetos.length; i++) {
    // 2. Obtenemos los datos (igual que antes)
    const estacion = datosEstaciones[i];
    const esfera = objetos[i]; // La usamos por su POSICIÓN

    if (!estacion || !esfera) continue; // Seguridad

    // 3. Obtenemos el nombre y la cantidad de coches
    const nombreEstacion = estacion.nombre;
    const numCoches = carsNumber.get(nombreEstacion);
    const capacidad = parkingCapacity.get(nombreEstacion);

    if (numCoches === undefined || !capacidad) continue;

    // 4. Calculamos la "plenitud" (0.0 a 1.0)
    const plenitud = Math.min(numCoches / capacidad, 1.0);

    // Si no hay "plenitud" (0 coches), no dibujamos nada
    if (plenitud <= 0) continue;
    // 5. Mapeamos la posición 3D a coordenadas del Canvas 2D
    // (Esta lógica es IDÉNTICA a la respuesta anterior)
    const mlon = esfera.position.x;
    const mlat = esfera.position.y;

    // Usamos Math.round() porque las coordenadas de píxeles deben ser enteras
    const canvasX = Math.round(
      Map2Range(mlon, -mapsx / 2, mapsx / 2, 0, HEATMAP_RES_X)
    );
    const canvasY = Math.round(
      Map2Range(mlat, -mapsy / 2, mapsy / 2, HEATMAP_RES_Y, 0)
    );

    // 6. Añadimos el punto al array de datos
    // heatmap.js usará el 'gradient' para colorear este valor
    dataPoints.push({
      x: canvasX,
      y: canvasY,
      value: plenitud,
    });
  }

  // 7. Pasamos los datos a heatmap.js
  heatmapInstance.setData({
    max: 1.0,
    data: dataPoints,
  });

  // 8. Le decimos a Three.js que la textura ha cambiado y debe re-subirla
  heatmapTexture.needsUpdate = true;
}

function animate() {
  if (texturacargada && parkingLoaded) {
    actualizarFecha();
    setMovement();
    updateHeatMap();
    updateParkingInfo();
  }

  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// Función para convertir una fecha en formato DD/MM/YYYY HH:mm, presenmte en archivo de préstamos, a Date
function convertirFecha(fechaStr) {
  const [fecha, hora] = fechaStr.split(" ");
  const [dia, mes, año] = fecha.split("/").map(Number);
  const [horas, minutos] = hora.split(":").map(Number);
  return new Date(año, mes - 1, dia, horas, minutos); // mes es 0-indexado
}

function actualizarFecha() {
  totalMinutos += minuteStep;
  // Añade fecha de partida
  fechaActual = new Date(fechaInicio.getTime() + totalMinutos * 60000);

  // Formatea salida
  const opciones = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  };
  //Modifica en pantalla
  fecha2show.innerHTML = fechaActual.toLocaleString("es-ES", opciones);
}

function updateParkingInfo() {
  let occupancy = 0;

  for (let cars of carsNumber.values()) occupancy += cars;

  let htmlString = `Ocupación Total: ${occupancy} / ${maxCapacity}`;
  htmlString += "<hr style='margin: 10px 0;'>";

  for (let parkingName of parkingCapacity.keys()) {
    const capacity = parkingCapacity.get(parkingName);

    const occupied = carsNumber.get(parkingName) || 0;

    htmlString += `${parkingName}: ${occupied} / ${capacity}<br>`;
  }
  infoParkingShow.innerHTML = htmlString;
}

//Dados los límites del mapa del latitud y longitud, mapea posiciones en ese rango
//valor, rango origen, rango destino
function Map2Range(val, vmin, vmax, dmin, dmax) {
  //Normaliza valor en el rango de partida, t=0 en vmin, t=1 en vmax
  let t = 1 - (vmax - val) / (vmax - vmin);
  return dmin + t * (dmax - dmin);
}

function Esfera(px, py, pz, radio, nx, ny, col) {
  let geometry = new THREE.SphereBufferGeometry(radio, nx, ny);
  let material = new THREE.MeshBasicMaterial({
    color: col,
  });
  let mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(px, py, pz);
  objetos.push(mesh);
  scene.add(mesh);
}

function Plano(px, py, pz, sx, sy) {
  let geometry = new THREE.PlaneGeometry(sx, sy);
  let material = new THREE.MeshBasicMaterial({});
  let mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(px, py, pz);
  scene.add(mesh);
  mapa = mesh;
}

function showDate() {
  fecha2show = document.createElement("div");
  fecha2show.style.position = "absolute";
  fecha2show.style.top = "15px";
  fecha2show.style.width = "100%";
  fecha2show.style.textAlign = "center";
  fecha2show.style.color = "#fff";
  fecha2show.style.fontWeight = "bold";
  fecha2show.style.backgroundColor = "transparent";
  fecha2show.style.zIndex = "1";
  fecha2show.style.fontFamily = "Monospace";
  fecha2show.innerHTML = "Cargando...";
  document.body.appendChild(fecha2show);
}

function showParkingLots() {
  infoParkingShow = document.createElement("div");
  infoParkingShow.style.backgroundColor = "rgba(0, 0, 1, 0.5)";
  infoParkingShow.style.padding = "10px";
  infoParkingShow.style.fontSize = "14px";
  infoParkingShow.style.position = "absolute";
  infoParkingShow.style.top = "60px";
  infoParkingShow.style.right = "30px";
  infoParkingShow.style.width = "auto";
  infoParkingShow.style.textAlign = "right";
  infoParkingShow.style.color = "#fff";
  infoParkingShow.style.fontWeight = "bold";
  infoParkingShow.style.zIndex = "1";
  infoParkingShow.style.fontFamily = "Monospace";
  document.body.appendChild(infoParkingShow);
}
