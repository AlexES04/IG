import * as THREE from "three";
import Ammo from "ammojs-typed";
import TWEEN from "@tweenjs/tween.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Water } from "three/examples/jsm/objects/Water.js";

let camera, controls, scene, renderer;
let textureLoader;

const WATER_TEXTURE =
  "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/water/Water_1_M_Normal.jpg";

const Ship = {
  MODEL: "src/libs/ship.glb",
  MASS: 0,
  POSITION: new THREE.Vector3(0, -15, 0),
  ROTATION: new THREE.Euler(0, 0, 0),
  SCALE: new THREE.Vector3(1, 1, 1),
};

const Canon = {
  MODEL: "src/libs/canon.gltf",
  MASS: 0,
  POSITION: new THREE.Vector3(-23, 3.1, 7),
  ROTATION: new THREE.Euler(0, Math.PI / 1.7, 0),
  SCALE: new THREE.Vector3(1, 1, 1),
  ISCANON: true,
};

const Island = {
  MODEL: "src/libs/scene.gltf",
  MASS: 0,
  POSITION: new THREE.Vector3(-20, 3.0, 7),
  ROTATION: new THREE.Euler(0, Math.PI / 2.0, 0),
  SCALE: new THREE.Vector3(50, 50, 50),
};

const canons = [
  [Canon.POSITION, Canon.ROTATION],
  [new THREE.Vector3(-20, 3.1, 10), new THREE.Euler(0, Math.PI / 2.0, 0)],
  [new THREE.Vector3(15.0, 3.1, -20), new THREE.Euler(0, Math.PI / -3.2, 0)],
  [new THREE.Vector3(-40.0, 3.1, -20), new THREE.Euler(0, Math.PI / 2.8, 0)],
  [new THREE.Vector3(-41.0, 3.1, -16), new THREE.Euler(0, Math.PI / 2.8, 0)],
  [new THREE.Vector3(50.0, 3.1, 5.0), new THREE.Euler(0, Math.PI / -1.7, 0)],
];

const islands = [
  [
    new THREE.Vector3(-20, 3.0, 7),
    new THREE.Euler(0, Math.PI / 2.0, 0),
    new THREE.Vector3(50, 50, 50),
  ],
  [
    new THREE.Vector3(15.0, 3.0, -20.0),
    Island.ROTATION,
    new THREE.Vector3(30, 30, 20),
  ],
  [
    new THREE.Vector3(15.0, 3.0, 40.0),
    Island.ROTATION,
    new THREE.Vector3(120, 12, 120),
  ],
  [
    new THREE.Vector3(60.0, 3.0, 5.0),
    new THREE.Euler(0, Math.PI / 1.0, 0),
    new THREE.Vector3(150, 50, 120),
  ],
  [
    new THREE.Vector3(-50.0, 3.0, -30.0),
    new THREE.Euler(0, Math.PI / -1.7, 0),
    new THREE.Vector3(300, 1, 120),
  ],
];

let water;
const clock = new THREE.Clock();

let shipMesh = null;
let shipBody = null;
let isShipBroken = false;

// MODIFICADO: Array para almacenar todos los cañones
const canonContainers = [];
let canonPosition = new THREE.Vector3();
let canonDirection = new THREE.Vector3();

const mouseCoords = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const ballMaterial = new THREE.MeshPhongMaterial({ color: 0x202020 });

// Mundo físico con Ammo
let physicsWorld;
const gravityConstant = 7.8;
let collisionConfiguration;
let dispatcher;
let broadphase;
let solver;
const margin = 0.05;

const rigidBodies = [];

const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
let transformAux1;
let tempBtVec3_1;

Ammo(Ammo).then(start);

function start() {
  initGraphics();
  initPhysics();
  createObjects();
  initInput();
  animationLoop();
}

function initGraphics() {
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.2,
    2000
  );
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5);
  camera.position.set(-40, 10, -20);

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(3, 4, 7);
  controls.update();

  textureLoader = new THREE.TextureLoader();

  const ambientLight = new THREE.AmbientLight(0x707070);
  scene.add(ambientLight);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(-10, 18, 5);
  light.castShadow = true;
  const d = 14;
  light.shadow.camera.left = -d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = -d;
  light.shadow.camera.near = 2;
  light.shadow.camera.far = 50;
  light.shadow.mapSize.x = 1024;
  light.shadow.mapSize.y = 1024;
  scene.add(light);

  window.addEventListener("resize", onWindowResize);
}

function initPhysics() {
  collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
  dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  broadphase = new Ammo.btDbvtBroadphase();
  solver = new Ammo.btSequentialImpulseConstraintSolver();
  physicsWorld = new Ammo.btDiscreteDynamicsWorld(
    dispatcher,
    broadphase,
    solver,
    collisionConfiguration
  );
  physicsWorld.setGravity(new Ammo.btVector3(0, -gravityConstant, 0));

  transformAux1 = new Ammo.btTransform();
  tempBtVec3_1 = new Ammo.btVector3(0, 0, 0);
}

function createObjects() {
  loadWater();
  loadObject(Ship.MODEL, Ship.MASS, Ship.POSITION, 0, Ship.SCALE);

  loadObject(
    "src/libs/pirateAdmiral.glb",
    Ship.MASS,
    new THREE.Vector3(-23, 2.6, 8),
    new THREE.Euler(0, 0, 0),
    Ship.SCALE
  );

  islands.forEach((island) => {
    loadObject(Island.MODEL, Island.MASS, island[0], island[1], island[2]);
  });

  canons.forEach((canon) => {
    loadObject(Canon.MODEL, Canon.MASS, canon[0], canon[1], Canon.SCALE, true);
  });
}

function createRigidBody(object, physicsShape, mass, pos, quat, vel, angVel) {
  if (pos) {
    object.position.copy(pos);
  } else {
    pos = object.position;
  }
  if (quat) {
    object.quaternion.copy(quat);
  } else {
    quat = object.quaternion;
  }
  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
  const motionState = new Ammo.btDefaultMotionState(transform);
  const localInertia = new Ammo.btVector3(0, 0, 0);
  physicsShape.calculateLocalInertia(mass, localInertia);
  const rbInfo = new Ammo.btRigidBodyConstructionInfo(
    mass,
    motionState,
    physicsShape,
    localInertia
  );
  const body = new Ammo.btRigidBody(rbInfo);

  body.setFriction(0.5);

  if (vel) {
    body.setLinearVelocity(new Ammo.btVector3(vel.x, vel.y, vel.z));
  }

  if (angVel) {
    body.setAngularVelocity(new Ammo.btVector3(angVel.x, angVel.y, angVel.z));
  }

  object.userData.physicsBody = body;
  object.userData.collided = false;

  scene.add(object);
  if (mass > 0) {
    rigidBodies.push(object);
    body.setActivationState(4);
  }
  physicsWorld.addRigidBody(body);

  return body;
}

// MODIFICADO: Ahora dispara desde un cañón específico
function shootFromCanon(canonContainer) {
  const BALL_MASS = 35;
  const BALL_RADIUS = 0.3;

  if (!canonContainer) {
    console.warn("El cañón no está disponible");
    return;
  }

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 14, 10),
    ballMaterial
  );
  ball.castShadow = true;
  ball.receiveShadow = true;

  const ballShape = new Ammo.btSphereShape(BALL_RADIUS);
  ballShape.setMargin(margin);

  canonContainer.getWorldPosition(canonPosition);

  canonDirection.set(0, 0, 1);
  canonDirection.applyQuaternion(canonContainer.quaternion);
  canonDirection.normalize();

  pos.copy(canonPosition);
  pos.add(canonDirection.multiplyScalar(2));

  quat.set(0, 0, 0, 1);
  const ballBody = createRigidBody(ball, ballShape, BALL_MASS, pos, quat);

  canonDirection.set(0, 0, 1);
  canonDirection.applyQuaternion(canonContainer.quaternion);
  canonDirection.normalize();
  canonDirection.multiplyScalar(50);

  ballBody.setLinearVelocity(
    new Ammo.btVector3(canonDirection.x, canonDirection.y, canonDirection.z)
  );

  createMuzzleFlash(canonContainer);
}

// NUEVO: Dispara desde todos los cañones
function shootFromAllCanons() {
  if (canonContainers.length === 0) {
    console.warn("No hay cañones cargados todavía");
    return;
  }

  canonContainers.forEach((canon) => {
    shootFromCanon(canon);
  });
}

// MODIFICADO: Recibe el cañón específico como parámetro
function createMuzzleFlash(canonContainer) {
  if (!canonContainer) return;

  const flashGeometry = new THREE.SphereGeometry(0.2, 8, 8);
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 1,
  });
  const flash = new THREE.Mesh(flashGeometry, flashMaterial);

  canonContainer.getWorldPosition(pos);
  canonDirection.set(0, 0, 1);
  canonDirection.applyQuaternion(canonContainer.quaternion);

  flash.position.copy(pos);
  flash.position.add(canonDirection.multiplyScalar(1.5));

  flash.position.x -= 0.2;
  flash.position.z -= 0.1;
  flash.position.y += 0.25;

  scene.add(flash);

  new TWEEN.Tween(flashMaterial)
    .to({ opacity: 0 }, 200)
    .onComplete(() => {
      scene.remove(flash);
      flashGeometry.dispose();
      flashMaterial.dispose();
    })
    .start();
}

function initInput() {
  window.addEventListener("pointerdown", function (event) {
    shootFromAllCanons();
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animationLoop() {
  requestAnimationFrame(animationLoop);

  const deltaTime = clock.getDelta();
  TWEEN.update();
  moveWater();
  updatePhysics(deltaTime);

  renderer.render(scene, camera);
}

function updatePhysics(deltaTime) {
  physicsWorld.stepSimulation(deltaTime, 10);

  for (let i = 0, il = rigidBodies.length; i < il; i++) {
    const objThree = rigidBodies[i];
    const objPhys = objThree.userData.physicsBody;
    const ms = objPhys.getMotionState();
    if (ms) {
      ms.getWorldTransform(transformAux1);
      const p = transformAux1.getOrigin();
      const q = transformAux1.getRotation();
      objThree.position.set(p.x(), p.y(), p.z());
      objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());

      objThree.userData.collided = false;
    }
  }
}

function loadObject(
  path,
  mass = 0,
  position = new THREE.Vector3(0, 0, 0),
  rotation = new THREE.Euler(0, 0, 0),
  scale = new THREE.Vector3(1, 1, 1),
  isCanon = false,
  callback = null
) {
  console.log("Cargando ", path);
  new GLTFLoader().load(path, function (gltf) {
    const model = gltf.scene;

    model.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const container = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    container.add(model);
    model.position.copy(center).multiplyScalar(-1);

    const startPos = position.clone().add(new THREE.Vector3(0, size.y, 0));
    const startQuat = new THREE.Quaternion();
    startQuat.setFromEuler(rotation);

    const shape = new Ammo.btBoxShape(
      new Ammo.btVector3(size.x * 0.2, size.y * 0.3, size.z * 0.5)
    );
    shape.setMargin(margin);

    createRigidBody(container, shape, mass, startPos, startQuat);

    // MODIFICADO: Agregar al array si es cañón
    if (isCanon) canonContainers.push(container);

    container.scale.set(0, 0, 0);
    new TWEEN.Tween(container.scale)
      .to({ x: scale.x, y: scale.y, z: scale.z }, 1500)
      .easing(TWEEN.Easing.Elastic.Out)
      .onComplete(() => {
        if (callback) callback(container);
      })
      .start();

    console.log(path, " cargado correctamente.");
  });
}

function loadWater() {
  const RADIUS = 100;
  const SEGMENTS = 32;

  const waterGeometry = new THREE.CircleGeometry(RADIUS, SEGMENTS);
  const flowMap = textureLoader.load(WATER_TEXTURE);

  flowMap.wrapS = THREE.RepeatWrapping;
  flowMap.wrapT = THREE.RepeatWrapping;

  water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: flowMap,
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 3.7,
  });

  water.rotation.x = -Math.PI / 2;
  water.position.y = 2.5;

  scene.add(water);
}

function moveWater() {
  if (water) water.material.uniforms["time"].value += 0.2 / 60.0;
}
