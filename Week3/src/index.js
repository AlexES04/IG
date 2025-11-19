import * as dat from "dat.gui";
import { mat4 } from "gl-matrix";

// Vertex shader source
const vertexShaderSource = `#version 300 es
precision mediump float;

      in vec2 aCoordinates;
      uniform mat4 uModelMatrix;

      void main(void) {
        gl_Position = uModelMatrix * vec4(aCoordinates, 0.0, 1.0);
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

var settings = {
  translateX: 0.0,
  translateY: 0.0,
  rotateZ: 0.0,
  zoom: 1.0,
  rotateX: 1.0,
  rotateY: 1.0,
};

var modelMatrixLoc;
var modelMatrix;
var matrixStack = [];

var sun = {
  x: 0,
  y: 0,
  width: 0.2,
  height: 0.2,
  color: [1, 1, 0, 1],
  angle: 0.0,
};

var earth = {
  x: 0.5,
  y: 0,
  width: 0.1,
  height: 0.1,
  color: [0.2, 0.2, 1, 1],
  angle: 0.0,
};

var moon = {
  x: 1.0,
  y: 0,
  width: 0.15,
  height: 0.15,
  color: [1, 1, 1, 1],
  angle: 0.0,
};

var mars = {
  x: 0.8,
  y: 0,
  width: 0.1,
  height: 0.1,
  color: [0.7, 0, 0, 1],
  angle: 0.0,
};

var marsMoon = {
  x: 1.0,
  y: 0,
  width: 0.2,
  height: 0.2,
  color: [0.7, 0.7, 0.7, 1],
  angle: 0.0,
};

function init() {
  // ============ STEP 1: Creating a canvas=================
  canvas = document.getElementById("my_Canvas");
  gl = canvas.getContext("webgl2");

  // create GUI
  var gui = new dat.GUI();
  gui.add(settings, "translateX", -1.0, 1.0, 0.01);
  gui.add(settings, "translateY", -1.0, 1.0, 0.01);
  gui.add(settings, "rotateZ", -180, 180, 1.0);
  gui.add(settings, "zoom", 0.1, 10, 0.1);
  gui.add(settings, "rotateX", -180, 180, 1.0);
  gui.add(settings, "rotateY", -180, 180, 1.0);

  // Posicionar el GUI debajo del canvas
  const canvasRect = canvas.getBoundingClientRect();
  gui.domElement.style.position = "absolute";
  gui.domElement.style.top = canvasRect.bottom + window.scrollY + 20 + "px";
  gui.domElement.style.left =
    canvasRect.left +
    window.scrollX +
    (canvasRect.width - gui.domElement.offsetWidth) / 2 +
    "px";

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

  // Bind vertex buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

  // Get the attribute location
  const coordLocation = gl.getAttribLocation(shaderProgram, "aCoordinates");

  // Point an attribute to the currently bound VBO
  gl.vertexAttribPointer(coordLocation, 2, gl.FLOAT, false, 0, 0);

  // Enable the attribute
  gl.enableVertexAttribArray(coordLocation);

  // Unbind the buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // look up uniform locations
  colorLocation = gl.getUniformLocation(shaderProgram, "uColor");
  // Set a random color.
  modelMatrixLoc = gl.getUniformLocation(shaderProgram, "uModelMatrix");
}

function render() {
  //========= STEP 4: Create the geometry and draw ===============

  // Clear the canvas
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear the color buffer bit
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Set the view port
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Bind appropriate array buffer to it
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

  // draw geometry
  // Set the model Matrix.
  modelMatrix = mat4.create();
  mat4.identity(modelMatrix);
  mat4.translate(modelMatrix, modelMatrix, [
    settings.translateX,
    settings.translateY,
    0,
  ]);
  mat4.rotateZ(modelMatrix, modelMatrix, (settings.rotateZ / 180) * Math.PI);
  mat4.rotateX(modelMatrix, modelMatrix, (settings.rotateX / 180) * Math.PI);
  mat4.rotateY(modelMatrix, modelMatrix, (settings.rotateY / 180) * Math.PI);

  mat4.scale(modelMatrix, modelMatrix, [settings.zoom, settings.zoom, 1]);
  gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);

  glPushMatrix();

  gl.uniform4fv(colorLocation, earth.color);
  drawCircle(earth.x);

  sun.angle += 0.001;
  mat4.rotateZ(modelMatrix, modelMatrix, sun.angle);

  mat4.scale(modelMatrix, modelMatrix, [sun.width, sun.height, 1]);
  gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
  gl.uniform4fv(colorLocation, sun.color);
  drawSquare();

  glPopMatrix();

  glPushMatrix();

  earth.angle += 0.005;

  mat4.rotateZ(modelMatrix, modelMatrix, earth.angle);

  mat4.translate(modelMatrix, modelMatrix, [earth.x, earth.y, 0]);
  mat4.scale(modelMatrix, modelMatrix, [earth.width, earth.height, 1]);
  gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
  gl.uniform4fv(colorLocation, earth.color);

  drawSquare();

  glPushMatrix();

  moon.angle += 0.07;
  mat4.rotateZ(modelMatrix, modelMatrix, moon.angle);

  gl.uniform4fv(colorLocation, moon.color);
  drawCircle(moon.x);

  mat4.translate(modelMatrix, modelMatrix, [moon.x, moon.y, 0]);
  mat4.scale(modelMatrix, modelMatrix, [moon.width, moon.height, 1]);
  gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);

  gl.uniform4fv(colorLocation, moon.color);
  drawSquare();
  glPopMatrix();

  glPopMatrix();

  glPushMatrix();
  mars.angle += 0.004;

  mat4.rotateX(modelMatrix, modelMatrix, (70 * Math.PI) / 180);
  mat4.rotateZ(modelMatrix, modelMatrix, mars.angle);

  gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
  gl.uniform4fv(colorLocation, [0.6, 0.3, 0.3, 1]);
  drawCircle(mars.x, 100);

  mat4.translate(modelMatrix, modelMatrix, [mars.x, mars.y, 0]);
  mat4.scale(modelMatrix, modelMatrix, [mars.width, mars.height, 1]);
  gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
  gl.uniform4fv(colorLocation, mars.color);

  drawSquare();

  glPushMatrix();
  marsMoon.angle += 0.03;

  gl.uniform4fv(colorLocation, marsMoon.color);
  drawCircle(marsMoon.x);

  mat4.rotateZ(modelMatrix, modelMatrix, marsMoon.angle);

  mat4.translate(modelMatrix, modelMatrix, [marsMoon.x, marsMoon.y, 0]);
  mat4.scale(modelMatrix, modelMatrix, [marsMoon.width, marsMoon.height, 1]);
  gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);

  gl.uniform4fv(colorLocation, marsMoon.color);

  drawSquare();

  glPopMatrix();
  glPopMatrix();

  // Unbind the buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  //document.getElementById("debug").textContent = "y = " + player1.y.toFixed(2);

  // start animation loop
  window.requestAnimationFrame(render);
}

function drawSquare() {
  const v = new Float32Array([
    -0.5, 0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, -0.5,
  ]);
  // Pass the vertex data to the buffer
  gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawCircle(radius = 1.0, segments = 70) {
  const vertices = [];

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    vertices.push(x, y);
  }

  const vertexData = new Float32Array(vertices);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
  gl.drawArrays(gl.LINE_LOOP, 0, segments);
}

function glPushMatrix() {
  const matrix = mat4.create();
  mat4.copy(matrix, modelMatrix);
  matrixStack.push(matrix);
}

function glPopMatrix() {
  modelMatrix = matrixStack.pop();
}

// CÓDIGO PRINCIPAL
init();
render();
