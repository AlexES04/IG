import GUI from "lil-gui";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import h337 from "heatmap.js";

const locationDataFile = "src/resources/geolocalizacionParking.csv";
const registerDataFile = "src/resources/parkingSeptiembre2025.csv";
const textureFile = "src/resources/mapaLPGC.png";

let scene, renderer, camera, camcontrols;
let mapa,
  mapsx,
  mapsy,
  scale = 10;

let heatmapInstance, heatmapTexture, heatmapPlane;
const HEATMAP_RES_X = 512;
let HEATMAP_RES_Y;

let minlon = -15.46945,
  maxlon = -15.39203;
let minlat = 28.07653,
  maxlat = 28.18235;
let txwidth, txheight;

let parkings = [];
const initialDate = new Date(2025, 8, 1);
let currentDate;
let totalMinutes = 0,
  dateInfoShow,
  parkingInfoShow;
const parkingData = [],
  parkingLots = [];

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
  showDate();
  showParkingLots();

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 7;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camcontrols = new OrbitControls(camera, renderer.domElement);

  const gui = new GUI();
  const settings = { timeSpeed: 1 };

  gui
    .add(settings, "timeSpeed", 0, 50, 1)
    .name("Time Speed")
    .onChange((value) => {
      minuteStep = value;
    });

  const tx1 = new THREE.TextureLoader().load(
    textureFile,

    function (texture) {
      const txaspectRatio = texture.image.width / texture.image.height;
      mapsy = scale;
      mapsx = mapsy * txaspectRatio;
      drawPlane(0, 0, 0, mapsx, mapsy);

      createHeatmapPlane();

      mapa.material.map = texture;
      mapa.material.needsUpdate = true;

      texturacargada = true;

      fetch(locationDataFile)
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

      fetch(registerDataFile)
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
    }
  );
}

function processCSVParkingLocationsWith(content) {
  const sep = ";";
  const rows = content.split("\n");

  const headers = rows[0].split(sep);
  const indexes = {
    id: headers.indexOf("idbase"),
    nombre: headers.indexOf("nombre"),
    lat: headers.indexOf("latitud"),
    lon: headers.indexOf("altitud"),
  };
  console.log("Parking lot indexes: ", indexes);

  for (let i = 1; i < rows.length; i++) {
    const column = rows[i].split(sep);
    if (column.length > 1) {
      parkingLots.push({
        id: column[indexes.idbase],
        nombre: column[indexes.nombre],
        lat: column[indexes.lat],
        lon: column[indexes.lon],
      });

      let mlon = Map2Range(
        column[indexes.lon],
        minlon,
        maxlon,
        -mapsx / 2,
        mapsx / 2
      );
      let mlat = Map2Range(
        column[indexes.lat],
        minlat,
        maxlat,
        -mapsy / 2,
        mapsy / 2
      );
      drawSphere(mlon, mlat, 0, 0.03, 20, 10, 0x009688);
    }
  }
  console.log("Parking lots CSV file loaded correctly.");
}

function processCSVParkingInfoWith(content) {
  const sep = ";";
  const rows = content.split(/\r?\n/);

  let firstRow = rows[0];
  if (firstRow.charCodeAt(0) === 0xfeff) {
    firstRow = firstRow.substring(1);
  }

  const headers = firstRow.split(sep);

  const indexes = {
    time: headers.indexOf("Time"),
    movement: headers.indexOf("MovementTypeDesig"),
    location: headers.indexOf("PARKING"),
  };

  parkingLoaded = true;
  console.log("Parking info indexes: ", indexes);

  for (let i = 1; i < rows.length; i++) {
    const column = rows[i].split(sep);
    if (column.length > 1) {
      parkingData.push({
        timeStamp: stringToDate(column[indexes.time]),
        movement: column[indexes.movement],
        location: column[indexes.location],
      });
      addParkingLot(column[indexes.location]);
    }
  }
  console.log("Parking CSV file loaded correctly");
  console.log("Parking lots: ", carsNumber);
}

function setMovement() {
  while (parkingData[nextMoveIndex].timeStamp <= currentDate) {
    const register = parkingData[nextMoveIndex];
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

function createHeatmapPlane() {
  HEATMAP_RES_Y = Math.round(HEATMAP_RES_X * (mapsy / mapsx));

  const heatmapContainer = document.createElement("div");
  heatmapContainer.style.width = `${HEATMAP_RES_X}px`;
  heatmapContainer.style.height = `${HEATMAP_RES_Y}px`;
  heatmapContainer.style.position = "absolute";
  heatmapContainer.style.left = "-9999px";
  document.body.appendChild(heatmapContainer);

  heatmapInstance = h337.create({
    container: heatmapContainer,
    radius: 50,
    maxOpacity: 0.8,
    minOpacity: 0.1,
    blur: 0.9,
    gradient: {
      "0.0": "blue",
      0.2: "cyan",
      0.4: "lime",
      0.6: "yellow",
      0.8: "red",
      "1.0": "red",
    },
  });

  const canvas = heatmapContainer.querySelector("canvas");

  heatmapTexture = new THREE.CanvasTexture(canvas);

  const heatmapGeometry = new THREE.PlaneGeometry(mapsx, mapsy);
  const heatmapMaterial = new THREE.MeshBasicMaterial({
    map: heatmapTexture,
    transparent: true,
    opacity: 0.7,
  });

  heatmapPlane = new THREE.Mesh(heatmapGeometry, heatmapMaterial);
  heatmapPlane.position.z = 0.01;
  scene.add(heatmapPlane);
}

function updateHeatMap() {
  const dataPoints = [];

  for (let i = 0; i < parkings.length; i++) {
    const parkingLot = parkingLots[i];
    const sphere = parkings[i];

    if (!parkingLot || !sphere) continue;

    const parkingLotName = parkingLot.nombre;
    const carsParkingNumber = carsNumber.get(parkingLotName);
    const capacity = parkingCapacity.get(parkingLotName);

    if (carsParkingNumber === undefined || !capacity) continue;

    const parkingRate = Math.min(carsParkingNumber / capacity, 1.0);

    if (parkingRate <= 0) continue;
    const mlon = sphere.position.x;
    const mlat = sphere.position.y;

    const canvasX = Math.round(
      Map2Range(mlon, -mapsx / 2, mapsx / 2, 0, HEATMAP_RES_X)
    );
    const canvasY = Math.round(
      Map2Range(mlat, -mapsy / 2, mapsy / 2, HEATMAP_RES_Y, 0)
    );

    dataPoints.push({
      x: canvasX,
      y: canvasY,
      value: parkingRate,
    });
  }

  heatmapInstance.setData({
    max: 1.0,
    data: dataPoints,
  });

  heatmapTexture.needsUpdate = true;
}

function animate() {
  if (texturacargada && parkingLoaded) {
    updateDate();
    setMovement();
    updateHeatMap();
    updateParkingInfo();
  }

  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function stringToDate(stringDate) {
  const [date, hour] = stringDate.split(" ");
  const [day, month, year] = date.split("/").map(Number);
  const [hours, minutes] = hour.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

function updateDate() {
  totalMinutes += minuteStep;
  currentDate = new Date(initialDate.getTime() + totalMinutes * 60000);

  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  };
  dateInfoShow.innerHTML = currentDate.toLocaleString("es-ES", options);
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
  parkingInfoShow.innerHTML = htmlString;
}

function Map2Range(val, vmin, vmax, dmin, dmax) {
  let t = 1 - (vmax - val) / (vmax - vmin);
  return dmin + t * (dmax - dmin);
}

function drawSphere(px, py, pz, radio, nx, ny, col) {
  let geometry = new THREE.SphereBufferGeometry(radio, nx, ny);
  let material = new THREE.MeshBasicMaterial({
    color: col,
  });
  let mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(px, py, pz);
  parkings.push(mesh);
  scene.add(mesh);
}

function drawPlane(px, py, pz, sx, sy) {
  let geometry = new THREE.PlaneGeometry(sx, sy);
  let material = new THREE.MeshBasicMaterial({});
  let mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(px, py, pz);
  scene.add(mesh);
  mapa = mesh;
}

function showDate() {
  dateInfoShow = document.createElement("div");
  dateInfoShow.style.position = "absolute";
  dateInfoShow.style.top = "15px";
  dateInfoShow.style.width = "100%";
  dateInfoShow.style.textAlign = "center";
  dateInfoShow.style.color = "#fff";
  dateInfoShow.style.fontWeight = "bold";
  dateInfoShow.style.backgroundColor = "transparent";
  dateInfoShow.style.zIndex = "1";
  dateInfoShow.style.fontFamily = "Monospace";
  dateInfoShow.innerHTML = "Cargando...";
  document.body.appendChild(dateInfoShow);
}

function showParkingLots() {
  parkingInfoShow = document.createElement("div");
  parkingInfoShow.style.backgroundColor = "rgba(0, 0, 1, 0.5)";
  parkingInfoShow.style.padding = "10px";
  parkingInfoShow.style.fontSize = "14px";
  parkingInfoShow.style.position = "absolute";
  parkingInfoShow.style.top = "60px";
  parkingInfoShow.style.right = "30px";
  parkingInfoShow.style.width = "auto";
  parkingInfoShow.style.textAlign = "right";
  parkingInfoShow.style.color = "#fff";
  parkingInfoShow.style.fontWeight = "bold";
  parkingInfoShow.style.zIndex = "1";
  parkingInfoShow.style.fontFamily = "Monospace";
  document.body.appendChild(parkingInfoShow);
}
