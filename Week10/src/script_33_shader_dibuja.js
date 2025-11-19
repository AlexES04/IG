import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

let scene, renderer;
let camera;
let info;
let grid;
let camcontrols;
let uniforms;
let objetos = [];

const data = {
  radiation: radiatonSymbolFragmentShader(),
  spain: spainFlagFragmentShader(),
  canary: canaryFlagFragmentShader(),
  hungary: hungaryFlagFragmentShader(),
  netherlands: netherlandsFlagFragmentShader(),
  germany: germanyFlagFragmentShader(),
};

init();
animationLoop();

function init() {
  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 20);

  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);

  document.body.appendChild(renderer.domElement);

  //Objetos
  uniforms = {
    u_time: {
      type: "f",
      value: 1.0,
    },
    u_resolution: {
      type: "v2",
      value: new THREE.Vector2(),
    },
    u_mouse: {
      type: "v2",
      value: new THREE.Vector2(),
    },
  };

  PlaneShader(0, 0, -1, 7.5, 7.5, backgroundFragmentShader());

  const dataKeys = Object.keys(data);

  dataKeys.forEach((key, index) => {
    const shader = data[key];

    let spacingX = 2.0;
    let spacingY = 4.0;
    let xPosition = ((index % 3.0) - 1) * spacingX;
    let yPosition = 2 - Math.floor(index / 3.0) * spacingY;

    drawSphere(xPosition, yPosition, 0, 0.75, 20, 20, shader);
  });

  camcontrols = new OrbitControls(camera, renderer.domElement);

  //Dmensiones iniciales
  onWindowResize();
  window.addEventListener("resize", onWindowResize, false);
}

//Redimensionado de la ventana
function onWindowResize(e) {
  renderer.setSize(window.innerWidth, window.innerHeight);
  uniforms.u_resolution.value.x = renderer.domElement.width;
  uniforms.u_resolution.value.y = renderer.domElement.height;
}

//Evento de ratón
document.onmousemove = function (e) {
  uniforms.u_mouse.value.x = e.pageX / window.innerWidth;
  uniforms.u_mouse.value.y = e.pageY / window.innerHeight;
};

function PlaneShader(px = 0, py = 0, pz = 0, sx, sy, fragsh) {
  let geometry = new THREE.PlaneBufferGeometry(sx, sy);
  let material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    //Color sólido
    fragmentShader: fragsh,
    vertexShader: vertexShader(),
  });

  let mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(px, py, pz);
  scene.add(mesh);
  objetos.push(mesh);
}

function drawSphere(px, py, pz, radio, nx, ny, fragmentShader = undefined) {
  let geometry = new THREE.SphereGeometry(radio, nx, ny);
  let material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    fragmentShader: fragmentShader,
    vertexShader: vertexShader(),
  });

  let mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(px, py, pz);
  mesh.rotation.y = -Math.PI / 2;
  scene.add(mesh);
  objetos.push(mesh);
}
//Bucle de visualización
function animationLoop() {
  requestAnimationFrame(animationLoop);

  //Incrementa tiempo
  uniforms.u_time.value += 0.02;

  renderer.render(scene, camera);
}

function vertexShader() {
  return `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      
      vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewPosition; 
    }
  `;
}

function backgroundFragmentShader() {
  return `
  #ifdef GL_ES
  precision mediump float;
  #endif
  
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_time;

  varying vec2 vUv;
  
  #define PI 3.14159265358979323846
  
  void main() {
      // 1. Normalización de coordenadas
      vec2 st = vUv * 2.0 - 1.0;
  
      // 2. Cálculo de Ángulos y Sectores
      float angle = atan(st.y, st.x); 
      angle = mod(angle + PI * 2.0, PI * 2.0);
  
      float num_divisions = 8.0; 
      float sector_index = floor(angle / (PI * 2.0 / num_divisions));
  
      // --- 3. LÓGICA DE TIEMPO Y COREOGRAFÍA ---
      
      // Configuración de velocidades
      float move_duration = 0.6;   // Cuánto tarda una pieza en llegar a su destino
      float stagger_delay = 0.15;  // Retraso entre que sale una pieza y la siguiente
      float hold_time = 0.5;       // Tiempo de espera cuando todas están fuera
      float pause_closed = 0.5;    // Tiempo de espera cuando el círculo está cerrado
  
      // Calcular cuánto dura toda la secuencia de apertura
      // (El tiempo que tarda la última pieza en empezar + su duración de movimiento)
      float total_open_sequence = (num_divisions * stagger_delay) + move_duration;
      
      // Duración total del bucle (Ida + Espera + Vuelta + Espera Cerrado)
      float total_cycle = total_open_sequence + hold_time + total_open_sequence + pause_closed;
  
      // Tiempo local dentro del ciclo actual
      float t = mod(u_time, total_cycle);
  
      // Tiempo específico para ESTA pieza
      float my_start_out = sector_index * stagger_delay;
      float my_start_in  = total_open_sequence + hold_time + (sector_index * stagger_delay);
  
      // Calculamos el movimiento de IDA (0.0 a 1.0)
      float go_out = smoothstep(my_start_out, my_start_out + move_duration, t);
      
      // Calculamos el movimiento de VUELTA (0.0 a 1.0)
      // Restamos la vuelta a la ida. 
      // Si ya fuimos (1) y volvemos (1), el resultado es 0 (posición original).
      float come_back = smoothstep(my_start_in, my_start_in + move_duration, t);
  
      // Posición actual (0.0 = centro, 1.0 = fuera)
      float position_0_to_1 = go_out - come_back;
  
      // --- 4. APLICAR DESPLAZAMIENTO ---
      
      float max_separation = 1.2; 
      float offset_factor = position_0_to_1 * max_separation; 
  
      vec2 direction = normalize(st); 
      st -= direction * offset_factor; 
  
      // 5. DIBUJAR
      float radius = 0.4; 
      float circle = smoothstep(radius + 0.01, radius - 0.01, length(st));
  
      // Color blanco
      vec2 mouse = u_mouse/u_resolution;
      vec3 final_color = vec3(u_mouse.x, u_mouse.y, abs(sin(u_time))) * circle;
  
      gl_FragColor = vec4(final_color, 1.0);
  }
			  `;
}

function radiatonSymbolFragmentShader() {
  return `
  #ifdef GL_ES
  precision mediump float;
  #endif

  // Ya no necesitamos u_resolution ni u_mouse necesariamente para fijar la textura
  uniform float u_time;
  
  // Recibimos las coordenadas de textura del Vertex Shader
  varying vec2 vUv;

  #define PI 3.14159265358979323846

  void main() {
      // 1. Mapeo de Coordenadas UV
      // vUv va de (0.0, 0.0) a (1.0, 1.0) alrededor de la esfera.
      // Lo transformamos para que el centro (0.5, 0.5) sea (0.0, 0.0)
      vec2 st = vUv * 2.0 - 1.0;
      st *= 1.3;

      // CORRECCIÓN DE ASPECTO PARA ESFERA:
      // Las UVs de una esfera estiran la imagen (2:1 de ancho a alto).
      // Multiplicamos x por 2.0 (aprox) para que el círculo se vea redondo y no ovalado,
      // aunque esto depende de cómo Three.js genere la geometría UV.
      st.x *= 2.0; 

      // 2. Coordenadas Polares
      float r = length(st);           
      float a = atan(st.y, st.x);     
      
      // Animación: Rotación
      a += u_time * 0.5;

      // 3. Simetría de 3 lados (Lógica idéntica a la anterior)
      float sector = 2.0 * PI / 3.0;
      float mod_a = mod(a, sector) - sector / 2.0;

      // 4. Aspas
      float blade_width = PI / 3.0; 
      float blade_angular_mask = smoothstep(blade_width/2.0, (blade_width/2.0) - 0.01, abs(mod_a));

      // Ajustamos los radios para que encajen bien en el mapeado de la esfera
      float inner_r = 0.2;
      float outer_r = 0.8;
      // Un pequeño ajuste: si r > 1.0 se sale del mapa UV, cortamos el borde
      float blade_radial_mask = smoothstep(inner_r - 0.01, inner_r, r) * smoothstep(outer_r, outer_r - 0.01, r);
      
      float blades = blade_angular_mask * blade_radial_mask;

      // 5. Círculo Central
      float center_radius = 0.12; 
      float center_dot = smoothstep(center_radius + 0.005, center_radius - 0.005, r);

      // 6. Combinar
      float symbol = max(blades, center_dot);

      // 7. Colores
      vec3 bg_color = vec3(0.95, 0.8, 0.0); 
      vec3 sym_color = vec3(0.1, 0.1, 0.1); 
      
      vec3 color = mix(bg_color, sym_color, symbol);

      gl_FragColor = vec4(color, 1.0);
  }
  `;
}

function spainFlagFragmentShader() {
  return `
  #ifdef GL_ES
  precision mediump float;
  #endif

  varying vec2 vUv;

  void main() {
      // Normalizar vUv para que Y vaya de 0 a 1 (de abajo a arriba)
      vec2 st = vUv;

      vec3 color = vec3(0.0); // Color por defecto

      // Proporciones de la bandera de España: 1:2:1 (rojo:amarillo:rojo)
      // Dividimos la altura total (1.0) en 4 partes
      // La banda central (amarilla) ocupa 2 de esas 4 partes (0.5 de altura total)

      if (st.y < 0.33) { // Banda inferior (0 a 0.25)
          color = vec3(0.9, 0.0, 0.0); // Rojo
      } else if (st.y < 0.66) { // Banda central (0.25 a 0.75)
          color = vec3(1.0, 0.85, 0.0); // Amarillo
      } else { // Banda superior (0.75 a 1.0)
          color = vec3(0.9, 0.0, 0.0); // Rojo
      }

      gl_FragColor = vec4(color, 1.0);
  }
  `;
}

function canaryFlagFragmentShader() {
  return `
  #ifdef GL_ES
  precision mediump float;
  #endif

  varying vec2 vUv;

  void main() {
      // Usamos vUv.x para franjas verticales (tipo "gajos" de naranja).
      // Esto divide la circunferencia de la esfera en 3 sectores.
      float x_coord = vUv.x;

      vec3 color = vec3(0.0);

      // Proporciones de la bandera de Canarias: 3 bandas verticales.
      // Orden: Blanco, Azul, Amarillo.
      
      if (x_coord < 1.1/3.0) { // Primer tercio (0 a 0.33)
          color = vec3(1.0, 1.0, 1.0); // Blanco
      } else if (x_coord < 1.9/3.0) { // Segundo tercio (0.33 a 0.66)
          color = vec3(0.0, 0.2, 0.6); // Azul
      } else { // Tercer tercio (0.66 a 1.0)
          color = vec3(1.0, 0.8, 0.0); // Amarillo
      }

      gl_FragColor = vec4(color, 1.0);
  }
  `;
}

function germanyFlagFragmentShader() {
  return `
  #ifdef GL_ES
  precision mediump float;
  #endif

  varying vec2 vUv;

  void main() {
      // Normalizar vUv para que Y vaya de 0 a 1 (de abajo a arriba)
      vec2 st = vUv;

      vec3 color = vec3(0.0); // Color por defecto

      // Proporciones de la bandera de Alemania: 3 bandas horizontales iguales (1/3 cada una)
      // La vUv.y va de 0 a 1.

      if (st.y < 1.0/3.0) { // Banda inferior (0 a 1/3)
        color = vec3(1.0, 0.8, 0.0);// Negro
      } else if (st.y < 2.0/3.0) { // Banda central (1/3 a 2/3)
          color = vec3(0.8, 0.0, 0.0); // Rojo
      } else { // Banda superior (2/3 a 1.0)
          
          color = vec3(0.0, 0.0, 0.0);  // Oro (un amarillo más oscuro)
      }

      gl_FragColor = vec4(color, 1.0);
  }
  `;
}

function hungaryFlagFragmentShader() {
  return `
  #ifdef GL_ES
  precision mediump float;
  #endif

  varying vec2 vUv;

  void main() {
      // Usamos vUv.y para franjas horizontales estándar
      vec2 st = vUv;
      vec3 color = vec3(0.0);

      // Proporción 1:1:1 (Verde abajo, Blanco medio, Rojo arriba)
      // vUv.y va de 0 (abajo) a 1 (arriba)

      if (st.y < 1.0/3.0) { 
          color = vec3(0.25, 0.5, 0.3); // Verde bosque
      } else if (st.y < 2.0/3.0) { 
          color = vec3(1.0, 1.0, 1.0); // Blanco
      } else { 
          color = vec3(0.8, 0.2, 0.2); // Rojo
      }

      gl_FragColor = vec4(color, 1.0);
  }
  `;
}

function netherlandsFlagFragmentShader() {
  return `
  #ifdef GL_ES
  precision mediump float;
  #endif

  varying vec2 vUv;

  void main() {
      // Usamos vUv.y para franjas horizontales estándar
      vec2 st = vUv;
      vec3 color = vec3(0.0);

      // Proporción 1:1:1 (Azul abajo, Blanco medio, Rojo arriba)
      
      if (st.y < 1.0/3.0) { 
          color = vec3(0.1, 0.2, 0.6); // Azul cobalto
      } else if (st.y < 2.0/3.0) { 
          color = vec3(1.0, 1.0, 1.0); // Blanco
      } else { 
          color = vec3(0.7, 0.1, 0.1); // Rojo bermellón
      }

      gl_FragColor = vec4(color, 1.0);
  }
  `;
}
