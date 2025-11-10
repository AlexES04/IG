import * as dat from "dat.gui";
import { mat4 } from "gl-matrix";

// Vertex shader source
const vertexShaderSource = `#version 300 es
precision mediump float;

      in vec3 aCoordinates;
      uniform mat4 uModelMatrix;
      uniform mat4 uViewMatrix;

      void main(void) {
        gl_Position = uViewMatrix * uModelMatrix *
        vec4(aCoordinates, 1.0);
        gl_PointSize = 10.0;
      }
`;

// Fragment shader source
const fragmentShaderSource = `#version 300 es
precision mediump float;

out vec4 fragColor;
uniform vec4 uColor;

void main(void) {
  fragColor = uColor;
}
`;

var canvas, gl;
var colorLocation;
var vertex_buffer;
var modelMatrixLoc;
var modelMatrix;

var index_buffer;

var rotateX = 0,
  rotateY = 0;

var zoomFactor = 1;

var viewMatrixLoc;

var player = {
  x: 0,
  y: 0.5,
  z: 15,
  ori: -Math.PI / 2,
};

var enemy = {
  x: 0,
  y: 0,
  z: 2,
  speed: 0.02,
};

var bullets = [];

/*var settings = {
  translateX: 0.0,
  translateY: 0.0,
  rotateZ: 0.0,
};*/

var matrixStack = [];
function glPushMatrix() {
  const matrix = mat4.create();
  mat4.copy(matrix, modelMatrix);
  matrixStack.push(matrix);
}

function glPopMatrix() {
  modelMatrix = matrixStack.pop();
}

function init() {
  // ============ STEP 1: Creating a canvas=================
  canvas = document.getElementById("my_Canvas");
  gl = canvas.getContext("webgl2");

  gl.enable(gl.DEPTH_TEST);

  /*// create GUI
  var gui = new dat.GUI();
  gui.add(settings, "translateX", -1.0, 1.0, 0.01);
  gui.add(settings, "translateY", -1.0, 1.0, 0.01);
  gui.add(settings, "rotateZ", -180, 180);

  // Posicionar el GUI debajo del canvas
  const canvasRect = canvas.getBoundingClientRect();
  gui.domElement.style.position = "absolute";
  gui.domElement.style.top = canvasRect.bottom + window.scrollY + 20 + "px";
  gui.domElement.style.left =
    canvasRect.left +
    window.scrollX +
    (canvasRect.width - gui.domElement.offsetWidth) / 2 +
    "px";
    */

  //========== STEP 2: Create and compile shaders ==========

  // Create a vertex shader object
  const vertShader = gl.createShader(gl.VERTEX_SHADER);

  // Attach vertex shader source code
  gl.shaderSource(vertShader, vertexShaderSource);

  // Compile the vertex shader
  gl.compileShader(vertShader);
  if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
    console.log("vertShader: " + gl.getShaderInfoLog(vertShader));
  }

  // Create fragment shader object
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

  // Attach fragment shader source code
  gl.shaderSource(fragShader, fragmentShaderSource);

  // Compile the fragmentt shader
  gl.compileShader(fragShader);
  if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
    console.log("fragShader: " + gl.getShaderInfoLog(fragShader));
  }

  // Create a shader program object to store
  // the combined shader program
  const shaderProgram = gl.createProgram();

  // Attach a vertex shader
  gl.attachShader(shaderProgram, vertShader);

  // Attach a fragment shader
  gl.attachShader(shaderProgram, fragShader);

  // Link both programs
  gl.linkProgram(shaderProgram);

  // Use the combined shader program object
  gl.useProgram(shaderProgram);

  //======== STEP 3: Create buffer objects and associate shaders ========

  // Create an empty buffer object to store the vertex buffer
  vertex_buffer = gl.createBuffer();

  // create index buffer
  index_buffer = gl.createBuffer();

  // Bind vertex buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

  // Get the attribute location
  const coordLocation = gl.getAttribLocation(shaderProgram, "aCoordinates");

  // Point an attribute to the currently bound VBO
  gl.vertexAttribPointer(coordLocation, 3, gl.FLOAT, false, 0, 0);

  // Enable the attribute
  gl.enableVertexAttribArray(coordLocation);

  // Unbind the buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // look up uniform locations
  colorLocation = gl.getUniformLocation(shaderProgram, "uColor");

  modelMatrixLoc = gl.getUniformLocation(shaderProgram, "uModelMatrix");
  viewMatrixLoc = gl.getUniformLocation(shaderProgram, "uViewMatrix");
}

function render() {
  //========= STEP 4: Create the geometry and draw ===============

  // Clear the canvas
  gl.clearColor(0.8, 1.0, 0.5, 1.0);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Set the view port
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Bind appropriate array buffer to it
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

  // perspective
  const viewMatrix = mat4.create();
  mat4.perspective(
    viewMatrix,
    Math.PI / 4, // vertical opening angle
    1, // ratio width-height
    0.5, // z-near
    30 // z-far
  );
  gl.uniformMatrix4fv(viewMatrixLoc, false, viewMatrix);
  // draw geometry
  // Set the model Matrix.
  modelMatrix = mat4.create();
  mat4.identity(modelMatrix);

  const eye = [player.x, player.y, player.z];
  const center = [
    player.x + Math.cos(player.ori),
    player.y,
    player.z + Math.sin(player.ori),
  ];
  mat4.lookAt(modelMatrix, eye, center, [0, 1, 0]);

  // mouse transformations
  mat4.scale(modelMatrix, modelMatrix, [zoomFactor, zoomFactor, zoomFactor]);
  mat4.rotateX(modelMatrix, modelMatrix, rotateX);
  mat4.rotateY(modelMatrix, modelMatrix, rotateY);

  // drawGround
  renderGround(30, 30);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);

  renderWalls();

  let dx = player.x - enemy.x;
  let dz = player.z - enemy.z;
  let dist = Math.hypot(dx, dz);
  // Enemy
  if (dist > 0.1) {
    enemy.x += (dx / dist) * enemy.speed;
    enemy.z += (dz / dist) * enemy.speed;
  }
  renderCube([1, 0, 0, 1], [enemy.x, enemy.y, enemy.z], [0.5, 0.5, 0.5]);

  for (let b of bullets) {
    b.x += Math.cos(b.dir) * b.speed;
    b.z += Math.sin(b.dir) * b.speed;

    renderCube([0.7, 0.7, 0.7, 1], [b.x, b.y, b.z], [0.1, 0.1, 0.1]);
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  // Unbind the buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  //document.getElementById("debug").textContent = "y = " + player1.y.toFixed(2);

  // start animation loop
  window.requestAnimationFrame(render);
}

function renderCube(color, coords, scaleFactor) {
  glPushMatrix();
  mat4.translate(modelMatrix, modelMatrix, coords);
  mat4.scale(modelMatrix, modelMatrix, scaleFactor);
  gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
  // create vertices
  const arrayV = new Float32Array([
    0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1,
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, arrayV, gl.STATIC_DRAW);

  // create edges
  const arrayI = new Uint16Array([
    0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7,
  ]);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arrayI, gl.STATIC_DRAW);
  // draw cube
  gl.uniform4fv(colorLocation, [0, 0, 0, 1]);
  gl.drawElements(gl.LINES, 24, gl.UNSIGNED_SHORT, 0);

  // create faces
  const arrayF = new Uint16Array([
    1,
    0,
    3,
    1,
    3,
    2, // cara trasera
    4,
    5,
    6,
    4,
    6,
    7, // cara delantera
    7,
    6,
    2,
    7,
    2,
    3, // cara superior
    0,
    1,
    5,
    0,
    5,
    4, // cara inferior
    5,
    1,
    2,
    5,
    2,
    6, // cara derecha
    0,
    4,
    7,
    0,
    7,
    3, // cara izquierda
  ]);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arrayF, gl.STATIC_DRAW);
  // draw cube
  gl.uniform4fv(colorLocation, color);
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
  glPopMatrix();
}

// draw squared floor
function renderGround(size, n) {
  glPushMatrix();
  mat4.scale(modelMatrix, modelMatrix, [size, size, size]);
  mat4.translate(modelMatrix, modelMatrix, [-0.5, 0, -0.5]);
  gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
  // creamos vector vértices
  var k = 0;
  const arrayV = new Float32Array(12 * n);
  for (i = 0; i < n; i++) {
    arrayV[k++] = i / (n - 1);
    arrayV[k++] = 0;
    arrayV[k++] = 0;
    arrayV[k++] = i / (n - 1);
    arrayV[k++] = 0;
    arrayV[k++] = 1;
  }
  for (var i = 0; i <= n; i++) {
    arrayV[k++] = 0;
    arrayV[k++] = 0;
    arrayV[k++] = i / (n - 1);
    arrayV[k++] = 1;
    arrayV[k++] = 0;
    arrayV[k++] = i / (n - 1);
  }
  gl.bufferData(gl.ARRAY_BUFFER, arrayV, gl.STATIC_DRAW);
  gl.uniform4fv(colorLocation, [0, 0, 0, 1]);
  gl.drawArrays(gl.LINES, 0, 4 * n);
  glPopMatrix();
}

function renderWalls() {
  renderCube([0.3, 0.5, 1, 1], [-5, 0, -8], [0.5, 1.5, 2]);
  renderCube([0.3, 0.5, 1, 1], [-5, 0, -8], [10, 1.5, 0.5]);
  renderCube([0.3, 0.5, 1, 1], [5, 0, -8], [0.5, 1.5, 16.5]);
  renderCube([0.3, 0.5, 1, 1], [-5, 0, -5], [0.5, 1.5, 13]);
  renderCube([0.3, 0.5, 1, 1], [-5, 0, 1], [8.5, 1.5, 0.5]);
  renderCube([0.3, 0.5, 1, 1], [-5, 0, 8], [4, 1.5, 0.5]);
  renderCube([0.3, 0.5, 1, 1], [1, 0, 8], [4, 1.5, 0.5]);
  renderCube([0.3, 0.5, 1, 1], [1, 0, 8], [4, 1.5, 0.5]);
  renderCube([0.3, 0.5, 1, 1], [1, 0, 6], [3, 1.5, 0.5]);
  renderCube([0.3, 0.5, 1, 1], [-5, 0, 6], [2.5, 1.5, 0.5]);
  renderCube([0.3, 0.5, 1, 1], [-1.5, 0, 3], [0.5, 1.5, 3.5]);
  renderCube([0.3, 0.5, 1, 1], [-1.5, 0, 3], [3.5, 1.5, 0.5]);
  renderCube([0.3, 0.5, 1, 1], [2, 0, 1], [0.5, 1.5, 3.5]);
  renderCube([0.3, 0.5, 1, 1], [3.5, 0, 1], [0.5, 1.5, 6]);
}

function onMouseDown(e) {
  if (e.buttons == 1 && e.srcElement == canvas) {
    e.preventDefault();

    bullets.push({
      x: player.x,
      y: player.y,
      z: player.z,
      dir: player.ori,
      speed: 0.3,
    });
  }
}

function onKeyDown(key) {
  key.preventDefault();
  console.log(key.keyCode);
  switch (key.keyCode) {
    // up arrow
    case 38: {
      player.x = player.x + 0.2 * Math.cos(player.ori);
      player.z = player.z + 0.2 * Math.sin(player.ori);
      break;
    }
    // down arrow
    case 40: {
      player.x = player.x - 0.2 * Math.cos(player.ori);
      player.z = player.z - 0.2 * Math.sin(player.ori);
      break;
    }
    // left arrow
    case 37: {
      player.ori -= 0.02;
      break;
    }
    // down arrow
    case 39: {
      player.ori += 0.02;
      break;
    }
    case 32: {
      player.y += 0.2;
      break;
    }
    case 17: {
      player.y -= 0.2;
      break;
    }
  }
}

// CÓDIGO PRINCIPAL
init();
render();

document.onkeydown = onKeyDown;

document.onmousedown = onMouseDown;
