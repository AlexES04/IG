import * as THREE from "three";
import { FlyControls } from "three/examples/jsm/controls/FlyControls";
import GUI from "lil-gui";

let scene, renderer;
let camera;
let info;
let moons = [],
  bodies = [];
let accglobal = 0.001;
let timestamp;

let index = 0;

let flyControls;
let t0 = new Date();
let shadows = true;

let saturnRing;
let planetCamera;
let selectedPlanetIndex;
const gui = new GUI();
const planetControl = { planet: "earth" };

// Type, radius, distance, translation speed, color, f1, f2 , rotation speed, moons
var planets = {
  sun: [31.5, 0.0, 0.0, 0.0, 0.0, 0.001, 0, 0xffffff],

  mercury: [1.0, 22.0, 0.05, 1.0, 1.0, 0.0004, 0, 0xaaaaaa],
  venus: [1.5, 45.0, 0.03, 1.0, 1.0, 0.0002, 0, 0xffe080],
  earth: [2.0, 72.0, 0.025, 1.0, 1.0, 0.025, 1, 0x1e90ff],
  mars: [1.6, 100.0, 0.018, 1.0, 1.0, 0.024, 2, 0xff4500],
  jupiter: [6.0, 180.0, 0.01, 1.0, 1.0, 0.061, 0, 0xffa500],
  saturn: [5.5, 235.0, 0.008, 1.0, 1.0, 0.057, 0, 0xffd700],
  uranus: [3.5, 290.0, 0.005, 1.0, 1.0, 0.035, 0, 0x40e0d0],
  neptune: [3.2, 350.0, 0.004, 1.0, 1.0, 0.037, 0, 0x00008b],
};

const newPlanetData = {
  name: "new planet",
  radius: 1,
  distance: 50,
  color: "#ff0000",
  translationSpeed: 0.01,
  rotationSpeed: 0.01,
};

init();
animationLoop();

function init() {
  info = document.createElement("div");
  info.style.position = "absolute";
  info.style.top = "30px";
  info.style.width = "100%";
  info.style.textAlign = "center";
  info.style.color = "#fff";
  info.style.fontWeight = "bold";
  info.style.backgroundColor = "transparent";
  info.style.zIndex = "1";
  info.style.fontFamily = "Monospace";
  info.innerHTML = "Sistema solar - Alejandro de Olózaga Ramírez, 2025";
  document.body.appendChild(info);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(90, 4, 0);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  planetCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  planetCamera.position.set(0, 5, 10);
  planetCamera.lookAt(new THREE.Vector3(0, 0, 0));

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  flyControls = new FlyControls(camera, renderer.domElement);
  flyControls.dragToLook = true;
  flyControls.movementSpeed = 0.01;
  flyControls.rollSpeed = 0.001;

  // Estrellas de fondo
  const starGeometry = new THREE.SphereGeometry(500, 20, 20);
  const starMaterial = new THREE.MeshBasicMaterial({
    map: loadTextureFrom("src/textures/milkyWay.jpg"),
    side: THREE.BackSide,
    transparent: true,
  });
  const starField = new THREE.Mesh(starGeometry, starMaterial);
  scene.add(starField);

  // Crear planetas iniciales
  Object.entries(planets).forEach(([name, values]) => {
    const [
      radius,
      distance,
      translationSpeed,
      f1,
      f2,
      rotationSpeed,
      moonsNumber,
      color,
    ] = values;

    drawSphere(
      radius,
      distance,
      translationSpeed,
      f1,
      f2,
      rotationSpeed,
      color,
      loadTextureFrom("src/textures/" + name + ".jpg")
    );

    if (name == "earth") addClouds(radius);
    if (name == "saturn") addRingWith(radius);

    for (let i = 0; i < moonsNumber; i++) {
      drawMoon(bodies[index], 0.2, 3, 0.02, 0xffffff, 0);
    }

    index += 1;
  });

  createAmbientLight();
  createSunLight();

  const viewportFolder = gui.addFolder("Viewport Settings");
  viewportFolder
    .add(
      planetControl,
      "Planet",
      Object.keys(planets).filter((p) => p !== "sun")
    )
    .name("Planet")
    .onChange((value) => {
      selectedPlanetIndex = Object.keys(planets).indexOf(value);
    });

  selectedPlanetIndex = Object.keys(planets).indexOf("earth");

  const newPlanetFolder = gui.addFolder("Create new planet");
  newPlanetFolder.add(newPlanetData, "name").name("Name");
  newPlanetFolder.add(newPlanetData, "radius", 0.5, 15, 0.1).name("Radius");
  newPlanetFolder.add(newPlanetData, "distance", 5, 400, 1).name("Distance");
  newPlanetFolder.addColor(newPlanetData, "color").name("Color");
  newPlanetFolder
    .add(newPlanetData, "translationSpeed", 0, 0.1, 0.001)
    .name("Traslation speed");
  newPlanetFolder
    .add(newPlanetData, "rotationSpeed", 0, 0.1, 0.001)
    .name("Rotation speed");
  newPlanetFolder
    .add({ add: () => addNewPlanet(newPlanetData) }, "add")
    .name("Add Planet");
}

function addNewPlanet(data) {
  const color = new THREE.Color(data.color);
  drawSphere(
    data.radius,
    data.distance,
    data.translationSpeed,
    1.0,
    1.0,
    data.rotationSpeed,
    color
  );

  planets[data.name] = [
    data.radius,
    data.distance,
    data.translationSpeed,
    1.0,
    1.0,
    data.rotationSpeed,
    0,
    color.getHex(),
  ];

  const planetNames = Object.keys(planets).filter((p) => p !== "sun");
  planetControl.Planet = data.name;
  selectedPlanetIndex = Object.keys(planets).indexOf(data.name);
}

// FUNCIONES EXISTENTES
function drawSphere(
  radius = 1.0,
  distance = 0.0,
  translationSpeed = 0.0,
  f1 = 1.0,
  f2 = 1.0,
  rotationSpeed = 0.1,
  color = 0xffffff,
  texture = undefined
) {
  let geometry = new THREE.SphereBufferGeometry(radius, 10, 10);
  let material = texture
    ? radius < 10
      ? new THREE.MeshPhongMaterial({
          map: texture,
          specular: new THREE.Color(0xffa000),
          shininess: 5,
        })
      : new THREE.MeshBasicMaterial({ map: texture })
    : new THREE.MeshPhongMaterial({ color });

  let body = new THREE.Mesh(geometry, material);
  if (shadows && radius < 10) {
    body.castShadow = true;
    body.receiveShadow = true;
  }

  bodies.push(body);
  scene.add(body);

  body.userData.dist = distance;
  body.userData.speed = translationSpeed;
  body.userData.f1 = f1;
  body.userData.f2 = f2;
  body.userData.rotationSpeed = rotationSpeed;

  let curve = new THREE.EllipseCurve(0, 0, distance * f1, distance * f2);
  let points3D = curve.getPoints(50).map((p) => new THREE.Vector3(p.x, 0, p.y));
  let orbit = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points3D),
    new THREE.LineBasicMaterial({ color })
  );
  scene.add(orbit);
}

function drawMoon(planet, radius, distance, translationSpeed, color, angle) {
  const pivot = new THREE.Object3D();
  pivot.rotation.x = angle;
  planet.add(pivot);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 10, 10),
    new THREE.MeshPhongMaterial({
      map: loadTextureFrom("src/textures/moon.jpg"),
    })
  );
  moon.userData.distance = distance;
  moon.userData.speed = translationSpeed;
  if (shadows) {
    moon.castShadow = true;
    moon.receiveShadow = true;
  }

  moons.push(moon);
  pivot.add(moon);
}

function animationLoop() {
  requestAnimationFrame(animationLoop);
  timestamp = (Date.now() - t0) * accglobal;

  for (let obj of bodies) {
    obj.position.x =
      Math.cos(timestamp * obj.userData.speed) *
      obj.userData.f1 *
      obj.userData.dist;
    obj.position.z =
      Math.sin(timestamp * obj.userData.speed) *
      obj.userData.f2 *
      obj.userData.dist;
    obj.rotation.y += obj.userData.rotationSpeed;

    if (saturnRing && saturnRing.userData.parentPlanet) {
      saturnRing.position.copy(saturnRing.userData.parentPlanet.position);
    }
  }

  for (let m of moons) {
    m.position.x = Math.cos(timestamp * m.userData.speed) * m.userData.distance;
    m.position.z = Math.sin(timestamp * m.userData.speed) * m.userData.distance;
    m.rotation.y -= 0.03;
  }

  flyControls.update(timestamp);

  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissorTest(true);
  renderer.render(scene, camera);

  const size = 300;
  renderer.setViewport(10, 10, size, size);
  renderer.setScissor(10, 10, size, size);
  renderer.setScissorTest(true);

  if (bodies[selectedPlanetIndex]) {
    const planet = bodies[selectedPlanetIndex];
    const planetName = Object.keys(planets)[selectedPlanetIndex];
    const planetData = planets[planetName];
    const planetRadius = planetData[0];
    const cameraDistance = planetRadius * 3.5;

    planetCamera.position.set(
      planet.position.x + cameraDistance,
      planet.position.y + planetRadius * 0.4,
      planet.position.z + cameraDistance
    );
    planetCamera.lookAt(planet.position);
  }

  renderer.render(scene, planetCamera);
}

function loadTextureFrom(path) {
  return new THREE.TextureLoader().load(path);
}
function createAmbientLight() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
}
function createSunLight() {
  const sunLight = new THREE.PointLight(0xffffff, 2, 0, 2);
  sunLight.position.set(0, 0, 0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  scene.add(sunLight);
}
function addClouds(radius) {
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(radius + 0.01, 32, 32),
    new THREE.MeshPhongMaterial({
      map: loadTextureFrom("src/textures/earthClouds.png"),
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    })
  );
  bodies[bodies.length - 1].add(clouds);
}
function addRingWith(radius) {
  saturnRing = new THREE.Mesh(
    new THREE.RingGeometry(radius * 1.3, radius * 2.2, 64),
    new THREE.MeshBasicMaterial({
      map: loadTextureFrom("src/textures/saturnRing.png"),
      side: THREE.DoubleSide,
      transparent: true,
    })
  );
  saturnRing.rotation.x = Math.PI / 2.2;
  scene.add(saturnRing);
  saturnRing.userData.parentPlanet = bodies[bodies.length - 1];
}
