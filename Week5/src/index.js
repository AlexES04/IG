import * as dat from "dat.gui";
import { mat4 } from "gl-matrix";

// Vertex shader source
const vertexShaderSource = `#version 300 es
precision mediump float;

      in vec3 aCoordinates;
      uniform mat4 uModelMatrix;
      uniform mat4 uViewMatrix;
      uniform vec4 lightPosition;
      uniform bool fixedLight;

      in vec3 aVertexNormals;
      out vec3 vNormal;
      out vec3 vEyeVector;
      out vec3 vLightDirection;

     void main(void) {
      // saving vertex after transformations BEFORE PERSPECTIVE
      vec4 vertex = uModelMatrix * vec4(aCoordinates, 1.0);
      gl_Position = uViewMatrix * vertex;
      // compute normal vector
      vNormal = vec3(uModelMatrix * vec4(aVertexNormals, 0.0));
      // compute vector from vertex to viewer
      vEyeVector = -vertex.xyz;
      // compute vector from vertex to light
      vec4 light;
      if (fixedLight == true) {
        light = vec4(10, 10, 10, 1);
      } else {
        light = uModelMatrix * lightPosition;
      }
      vLightDirection = light.xyz - vertex.xyz;
       }
`;

// Fragment shader source
const fragmentShaderSource = `#version 300 es
precision mediump float;

out vec4 fragColor;
uniform vec4 uColor;
uniform vec3 uDifColor;
uniform vec3 uSpecColor;
uniform vec4 Iamb;

in vec3 vNormal;
in vec3 vEyeVector;
in vec3 vLightDirection;

void main(void) {
  // computing diffuse component
  vec3 N = normalize(vNormal);
  vec3 L = normalize(vLightDirection);
  vec3 diffuseMaterial = uDifColor;
  float diffuse = max(dot(N, L), 0.0);
  vec4 Idif = vec4(diffuse*diffuseMaterial,1);
 
  // compute specular component
  float NL = dot(N,L);
  vec4 Ispec = vec4(0,0,0,1);
  if (NL>0.0) {
 vec3 R = 2.0*N*NL-L;
  float shininess = 10.0;
  vec3 specularMaterial = uSpecColor;
  vec3 V = normalize(vEyeVector);
  float specular = pow(max(dot(R, V), 0.0), shininess);
  Ispec = vec4(specular * specularMaterial, 1);
  }
  // computing ambient component
  // vec4 Iamb = vec4(0,0,0.2,1);
  // calculamos color final
  fragColor = Iamb + Idif + Ispec;
  fragColor = min(fragColor, vec4(1,1,1,1));
  
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
var mouseX, mouseY;
var zoomFactor = 1;
var viewMatrixLoc;

var normalsLoc;
var normal_buffer;
var difColorLoc;
var specColorLoc;
var lightPositionLoc;
var fixedLightLoc;
var iAmbientLoc;

var settings = {
  diffuseMatColor: "#00FF00",
  specColor: "#FF0000",
  lightX: 10,
  lightY: 10,
  lightZ: 10,
  fixedLight: "Yes",
};

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

  var gui = new dat.GUI();
  gui.addColor(settings, "diffuseMatColor").name("Diffuse Color");
  gui.addColor(settings, "specColor").name("Specular Color");
  gui.add(settings, "lightX", -20, 20).name("Light X position");
  gui.add(settings, "lightY", -20, 20).name("Light Y position");
  gui.add(settings, "lightZ", -20, 20).name("Light Z position");
  gui.add(settings, "fixedLight", ["Yes", "No"]).name("Fixed Light");

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
  normal_buffer = gl.createBuffer();

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

  normalsLoc = gl.getAttribLocation(shaderProgram, "aVertexNormals");
  difColorLoc = gl.getUniformLocation(shaderProgram, "uDifColor");
  specColorLoc = gl.getUniformLocation(shaderProgram, "uSpecColor");
  lightPositionLoc = gl.getUniformLocation(shaderProgram, "lightPosition");
  fixedLightLoc = gl.getUniformLocation(shaderProgram, "fixedLight");
  iAmbientLoc = gl.getUniformLocation(shaderProgram, "Iamb");

  gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffer);
  gl.vertexAttribPointer(normalsLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(normalsLoc);
}

function render() {
  //========= STEP 4: Create the geometry and draw ===============

  // Clear the canvas
  gl.clearColor(1.0, 0.5, 0.5, 1.0);

  // Clear the color buffer bit
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

  // Set the model Matrix.
  modelMatrix = mat4.create();
  mat4.identity(modelMatrix);

  const eye = [0, 0, 7];
  const center = [0, 0, 0];
  mat4.lookAt(modelMatrix, eye, center, [0, 1, 0]);

  // mouse transformations
  mat4.scale(modelMatrix, modelMatrix, [zoomFactor, zoomFactor, zoomFactor]);
  mat4.rotateX(modelMatrix, modelMatrix, rotateX);
  mat4.rotateY(modelMatrix, modelMatrix, rotateY);
  // drawGround
  //renderGround(9, 10);
  gl.uniform4fv(
    lightPositionLoc,
    new Float32Array([settings.lightX, settings.lightY, settings.lightZ, 1.0])
  );
  gl.uniform1i(fixedLightLoc, toBool(settings.fixedLight));

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
  glPushMatrix();
  mat4.translate(modelMatrix, modelMatrix, [
    settings.lightX,
    settings.lightY,
    settings.lightZ,
  ]);
  gl.uniform3fv(difColorLoc, hexToRgb("#000000"));
  gl.uniform3fv(specColorLoc, hexToRgb("#000000"));
  gl.uniform4fv(iAmbientLoc, [1, 1, 1, 1]);
  renderSphere(20, [0.05, 0.05, 0.05]);

  glPopMatrix();
  gl.uniform4fv(iAmbientLoc, [0, 0, 0.2, 1]);
  gl.uniform3fv(difColorLoc, hexToRgb(settings.diffuseMatColor));
  gl.uniform3fv(specColorLoc, hexToRgb(settings.specColor));

  renderSphere(20);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  // Unbind the buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // start animation loop
  window.requestAnimationFrame(render);
}

function renderSphere(n, scale = [0.7, 0.7, 0.7]) {
  glPushMatrix();
  mat4.scale(modelMatrix, modelMatrix, scale);
  gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
  // compute vertices
  const coords = new Float32Array(6 * n * n);
  const step = Math.PI / n;
  const R = 1;
  var k = 0;
  for (let i = 1; i < n; i++) {
    const tita = -Math.PI / 2 + i * step;
    for (let j = 0; j < 2 * n; j++) {
      const alpha = j * step;
      coords[k++] = R * Math.cos(tita) * Math.cos(alpha);
      coords[k++] = R * Math.cos(tita) * Math.sin(alpha);
      coords[k++] = R * Math.sin(tita);
    }
  }

  // compute normals
  const normals = coords;
  // compute faces
  const arrayIFaces = new Uint16Array((4 * n + 2) * n);
  var k = 0;
  for (let i = 0; i < n - 2; i++) {
    for (let j = 0; j < 2 * n; j++) {
      arrayIFaces[k++] = 2 * n * (i + 1) + j;
      arrayIFaces[k++] = 2 * n * i + j;
    }
    arrayIFaces[k++] = 2 * n * (i + 1);
    arrayIFaces[k++] = 2 * n * i;
  }
  // pass data to GPU
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arrayIFaces, gl.STATIC_DRAW);

  // draw meshes
  for (let i = 0; i < n - 2; i++)
    gl.drawElements(
      gl.TRIANGLE_STRIP,
      4 * n + 2,
      gl.UNSIGNED_SHORT,
      2 * i * (4 * n + 2)
    );

  glPopMatrix();
}

// CÓDIGO PRINCIPAL
init();
render();

// add mouse handlers
document.onmousedown = onMouseDown;
document.onmousemove = onMouseMove;
document.onwheel = zoom;

function onMouseDown(e) {
  if (e.buttons == 1 && e.srcElement == canvas) {
    mouseX = e.pageX;
    mouseY = e.pageY;
  }
}

function onMouseMove(e) {
  if (e.buttons == 1 && e.srcElement == canvas) {
    rotateY = rotateY + (e.pageX - mouseX) * 0.01;
    rotateX = rotateX + (e.pageY - mouseY) * 0.01;
    mouseX = e.pageX;
    mouseY = e.pageY;
    //console.log("move = ("+mouseX+","+mouseY+")");
  }
}

function zoom(e) {
  if (e.deltaY < 0) zoomFactor *= 1.1;
  else zoomFactor *= 0.9;
}

function hexToRgb(hex) {
  // Elimina el signo "#" si está presente
  hex = hex.replace(/^#/, "");
  // Divide el valor hexadecimal en sus componentes RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  // Devuelve un objeto con los valores RGB normalizados
  return [r, g, b];
}

function toBool(string) {
  return string === "Yes" ? true : false;
}
