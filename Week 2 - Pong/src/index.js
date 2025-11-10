// Vertex shader source
const vertexShaderSource = `#version 300 es
      precision mediump float;

      in vec2 aCoordinates;

      void main(void) {
        gl_Position = vec4(aCoordinates, 0, 1);
        gl_PointSize = 10.0;
      }
`;

// Fragment shader source
const fragmentShaderSource = `#version 300 es
        precision mediump float;

        out vec4 fragColor;

        uniform vec4 uColor;
        
        void main(void) {
          // fragColor = vec4(0,0,1,1);
          fragColor = uColor;
      }
`;

var gl, canvas, colorLocation, vertex_buffer;

var ball = {
  x: -0.5,
  y: -0.3,
  width: 0.05,
  height: 0.1,
  color: [1, 1, 1, 1],
  speedX: 0.01,
  speedY: 0.02,
};

var player1 = {
  x: -0.8,
  y: -0.3,
  width: 0.05,
  height: 0.4,
  color: [1, 1, 1, 1],
  movement: 0,
  score: 0,
};

var player2 = {
  x: 0.8,
  y: -0.3,
  width: 0.05,
  height: 0.4,
  color: [1, 1, 1, 1],
  movement: 0,
  score: 0,
};

var middleLine = {
  color: [1, 1, 1, 1],
  coords: [
    0, -0.9, 0, -0.7, 0, -0.5, 0, -0.3, 0, -0.1, 0, 0.1, 0, 0.3, 0, 0.5, 0, 0.7,
    0, 0.9,
  ],
};

var prevTouchY;
var cornerSpeed = 1.4;

function init() {
  // ============ STEP 1: Creating a canvas=================
  canvas = document.getElementById("my_Canvas");
  gl = canvas.getContext("webgl2");

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
  gl.uniform4f(colorLocation, 1, 0, 0, 1);

  // Unbind the buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  colorLocation = gl.getUniformLocation(shaderProgram, "uColor");

  render();
}

function render() {
  //========= STEP 4: Create the geometry and draw ===============

  // Clear the canvas
  gl.clearColor(0, 0, 0, 1.0);

  // Clear the color buffer bit
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Set the view port
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Bind appropriate array buffer to it
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

  ball.x += ball.speedX;
  ball.y += ball.speedY;

  // Colission detection
  if (isTouchingBorder(ball)) ball.speedY *= -1;

  if (ball.x + ball.width >= 1) {
    player1.score++;
    updateScore();
    resetBall(true);
  } else if (ball.x <= -1) {
    player2.score++;
    updateScore();
    resetBall(false);
  }

  if (isColliding(ball, player1) || isColliding(ball, player2)) {
    ball.speedX *= -1;
    if (isTouchingCorner(ball, player1) || isTouchingCorner(ball, player2)) {
      ball.speedX *= cornerSpeed;
      ball.speedY *= cornerSpeed;
    }
  }

  document.onkeydown = onKeyDown;
  document.onkeyup = onKeyUp;

  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd, { passive: false });

  player1.y += player1.movement;
  player2.y += player2.movement;

  drawLines(middleLine);
  drawRectangle(ball);
  drawRectangle(player1);
  drawRectangle(player2);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  window.requestAnimationFrame(render);
}

function drawRectangle(r) {
  var x1 = r.x;
  var x2 = r.x + r.width;
  var y1 = r.y;
  var y2 = r.y + r.height;

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]),
    gl.STATIC_DRAW
  );
  gl.uniform4fv(colorLocation, r.color);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawLines(context) {
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(context.coords),
    gl.STATIC_DRAW
  );
  gl.uniform4fv(colorLocation, context.color);
  gl.drawArrays(gl.LINES, 0, context.coords.length * 2);
}

function onKeyDown(key) {
  switch (key.keyCode) {
    case 38: {
      if (player2.y + player2.height < 1) player2.movement = 0.02;
      else player2.movement = 0;
      break;
    }
    case 40: {
      if (player2.y > -1) player2.movement = -0.02;
      else player2.movement = 0;
      break;
    }
    case 83:
      if (player1.y > -1) player1.movement = -0.02;
      else player1.movement = 0;
      break;
    case 87:
      if (player1.y + player1.height < 1) player1.movement = 0.02;
      else player1.movement = 0;
      break;
  }
}

function onKeyUp(key) {
  switch (key.keyCode) {
    case 38:
    case 40:
      player2.movement = 0;
      break;
  }

  switch (key.keyCode) {
    case 87:
    case 83:
      player1.movement = 0;
      break;
  }
}

// eventos en el móvil
function onTouchStart(e) {
  e.preventDefault();
  const touchobj = e.changedTouches[0]; // first finger
  prevTouchY = parseInt(touchobj.clientY);
}

function onTouchMove(e) {
  e.preventDefault();
  const touchobj = e.changedTouches[0]; // first touch
  const touchY = parseInt(touchobj.clientY);
  const difY = touchY - prevTouchY;
  player1.movement = -difY * 0.005;
  prevTouchY = touchY;
}

function onTouchEnd(e) {
  e.preventDefault();
  player1.movement = 0;
}

function invertBallDirection() {
  ball.speedX *= -1;
  ball.speedY *= -1;
}

function isColliding(ball, player) {
  return (
    ball.x < player.x + player.width &&
    ball.x + ball.width > player.x &&
    ball.y < player.y + player.height &&
    ball.y + ball.height > player.y
  );
}

function isTouchingCorner(ball, player) {
  let ballCenter = ball.y + ball.height / 2;
  let playerCenter = player.y + player.height / 2;

  return Math.abs(ballCenter - playerCenter) > player.height * 2.5;
}

function isTouchingBorder(ball) {
  return ball.y < -1 || ball.y + ball.height > 1;
}

function resetBall(toLeft = true) {
  ball.x = toLeft ? 0.5 : -0.5;
  ball.y = toLeft ? 0.3 : -0.3;
  ball.speedX = 0;
  ball.speedY = 0;

  setTimeout(() => {
    ball.speedX = toLeft ? -0.01 : 0.01;
    ball.speedY = toLeft ? 0.02 : -0.02;
  }, 2000);
}

function updateScore() {
  document.getElementById("scorePlayer1").textContent = player1.score;
  document.getElementById("scorePlayer2").textContent = player2.score;
}

init();

console.log("This is Pong game.");
