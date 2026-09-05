import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js";

const mount = document.querySelector("#scene");
const speedValue = document.querySelector("#speed");
const headingValue = document.querySelector("#heading");
const loading = document.querySelector("#loading");

const controls = {
  throttle: false,
  brake: false,
  left: false,
  right: false,
};

const telemetry = {
  speed: 0,
  heading: 0,
  x: 0,
  z: 0,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x87bdd5, 26, 185);

const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 360);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setClearColor(0x8fd1ec, 1);
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xf5fbff, 0x0f6174, 2.2));
const sun = new THREE.DirectionalLight(0xfff3c1, 2.8);
sun.position.set(-18, 34, 20);
scene.add(sun);

const skyGeometry = new THREE.SphereGeometry(210, 32, 16);
const skyMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    topColor: { value: new THREE.Color(0x3e9bd0) },
    bottomColor: { value: new THREE.Color(0xd7f3ff) },
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition).y;
      gl_FragColor = vec4(mix(bottomColor, topColor, smoothstep(-0.08, 0.65, h)), 1.0);
    }
  `,
});
scene.add(new THREE.Mesh(skyGeometry, skyMaterial));

const seaGeometry = new THREE.PlaneGeometry(220, 220, 72, 72);
seaGeometry.rotateX(-Math.PI / 2);
const basePositions = new Float32Array(seaGeometry.attributes.position.array);
const seaMaterial = new THREE.MeshStandardMaterial({
  color: 0x0b8fac,
  roughness: 0.42,
  metalness: 0.08,
  emissive: 0x063d56,
  emissiveIntensity: 0.08,
});
const sea = new THREE.Mesh(seaGeometry, seaMaterial);
scene.add(sea);

const horizon = new THREE.Mesh(
  new THREE.RingGeometry(88, 90, 96),
  new THREE.MeshBasicMaterial({
    color: 0xe6f8ff,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  }),
);
horizon.rotation.x = -Math.PI / 2;
horizon.position.y = 0.05;
scene.add(horizon);

const boat = new THREE.Group();
const bowGeometry = new THREE.BufferGeometry();
bowGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(
    [
      -0.58, 0.64, 0.1,
      0.58, 0.64, 0.1,
      0, 0.58, -2.35,
      -0.49, 0.27, 0.1,
      0.49, 0.27, 0.1,
      0, 0.31, -2.22,
    ],
    3,
  ),
);
bowGeometry.setIndex([
  0, 1, 2,
  3, 4, 5,
  0, 3, 5,
  0, 5, 2,
  1, 2, 5,
  1, 5, 4,
  0, 1, 4,
  0, 4, 3,
]);
bowGeometry.computeVertexNormals();
const bow = new THREE.Mesh(
  bowGeometry,
  new THREE.MeshStandardMaterial({
    color: 0xa95e32,
    roughness: 0.72,
    metalness: 0.02,
  }),
);
boat.add(bow);

const deck = new THREE.Mesh(
  new THREE.BoxGeometry(1.18, 0.22, 1.45),
  new THREE.MeshStandardMaterial({ color: 0x6c3a22, roughness: 0.82 }),
);
deck.position.set(0, 0.52, 0.28);
boat.add(deck);

const railMaterial = new THREE.MeshStandardMaterial({
  color: 0x875033,
  roughness: 0.74,
});

[
  [new THREE.Vector3(-0.56, 0.69, 0.08), new THREE.Vector3(-0.055, 0.635, -2.2)],
  [new THREE.Vector3(0.56, 0.69, 0.08), new THREE.Vector3(0.055, 0.635, -2.2)],
].forEach(([start, end]) => {
  const direction = new THREE.Vector3().subVectors(end, start);
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.055, direction.length()),
    railMaterial,
  );
  rail.position.copy(start).add(end).multiplyScalar(0.5);
  rail.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    direction.normalize(),
  );
  boat.add(rail);
});

const wheelAssembly = new THREE.Group();
wheelAssembly.position.set(0, 0.86, 0.08);
const helmMaterial = new THREE.MeshStandardMaterial({
  color: 0x5a311c,
  roughness: 0.58,
  metalness: 0.03,
});
wheelAssembly.add(
  new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 10, 32), helmMaterial),
);
for (let i = 0; i < 6; i += 1) {
  const spoke = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.29, 0.02),
    helmMaterial,
  );
  spoke.rotation.z = (i * Math.PI) / 6;
  wheelAssembly.add(spoke);
}
const hub = new THREE.Mesh(
  new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16),
  helmMaterial,
);
hub.rotation.x = Math.PI / 2;
wheelAssembly.add(hub);
boat.add(wheelAssembly);

const pedestal = new THREE.Mesh(
  new THREE.BoxGeometry(0.09, 0.34, 0.08),
  new THREE.MeshStandardMaterial({ color: 0x7a482a, roughness: 0.7 }),
);
pedestal.position.set(0, 0.61, 0.09);
boat.add(pedestal);
scene.add(boat);

const markers = Array.from({ length: 26 }, (_, i) => {
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.13, 0.42, 8),
    new THREE.MeshStandardMaterial({
      color: i % 2 ? 0xffd166 : 0xef476f,
      roughness: 0.55,
    }),
  );
  marker.position.set(Math.sin(i * 5.19) * 54, 0.24, -18 - ((i * 37) % 118));
  scene.add(marker);
  return marker;
});

const state = {
  x: 0,
  z: 0,
  heading: 0,
  speed: 0,
  time: 0,
  lastTelemetry: 0,
};

function resize() {
  const width = mount.clientWidth || window.innerWidth;
  const height = mount.clientHeight || window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function update(dt) {
  state.time += dt;
  const acceleration = controls.throttle ? 3.2 : 0;
  const braking = controls.brake ? 5.1 : 0;
  const drag = state.speed > 0 ? 0.45 : 0.18;
  state.speed = clamp(
    state.speed + acceleration * dt - braking * dt - state.speed * drag * dt,
    0,
    8.5,
  );

  const turnInput = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
  state.heading += turnInput * (0.56 + state.speed * 0.075) * dt;

  const wheelTarget = -turnInput * 0.82;
  const wheelResponse = 1 - Math.exp(-10 * dt);
  wheelAssembly.rotation.z = THREE.MathUtils.lerp(
    wheelAssembly.rotation.z,
    wheelTarget,
    wheelResponse,
  );

  const forwardX = Math.sin(state.heading);
  const forwardZ = -Math.cos(state.heading);
  state.x += forwardX * state.speed * dt;
  state.z += forwardZ * state.speed * dt;

  const positions = seaGeometry.attributes.position;
  const points = positions.array;
  for (let i = 0; i < points.length; i += 3) {
    const x = basePositions[i] + state.x * 0.35;
    const z = basePositions[i + 2] + state.z * 0.35;
    points[i + 1] =
      Math.sin(x * 0.22 + state.time * 1.7) * 0.22 +
      Math.sin(z * 0.18 + state.time * 1.1) * 0.18 +
      Math.sin((x + z) * 0.08 + state.time * 0.7) * 0.12;
  }
  positions.needsUpdate = true;
  seaGeometry.computeVertexNormals();

  sea.position.set(state.x, 0, state.z);
  horizon.position.set(state.x, 0.05, state.z);
  boat.position.set(state.x, 0.18 + Math.sin(state.time * 2.1) * 0.08, state.z);
  boat.rotation.y = -state.heading;
  boat.rotation.x = Math.sin(state.time * 1.5 + state.speed) * 0.025;
  boat.rotation.z = -turnInput * 0.07 + Math.sin(state.time * 1.2) * 0.018;

  markers.forEach((marker, index) => {
    marker.position.y = 0.24 + Math.sin((state.time + index * 0.7) * 1.6) * 0.12;
    marker.rotation.y += dt * 0.6;
  });

  camera.position.set(
    state.x - forwardX * 1.78,
    1.58 + Math.sin(state.time * 2.2) * 0.035,
    state.z - forwardZ * 1.78,
  );
  camera.lookAt(
    state.x + forwardX * 13,
    -1.15 + Math.sin(state.time * 1.1) * 0.12,
    state.z + forwardZ * 13,
  );

  telemetry.speed = Number(state.speed.toFixed(1));
  telemetry.heading =
    Math.round((((state.heading * 180) / Math.PI) % 360 + 360) % 360) % 360;
  telemetry.x = Number(state.x.toFixed(1));
  telemetry.z = Number(state.z.toFixed(1));

  if (state.time - state.lastTelemetry > 0.12) {
    state.lastTelemetry = state.time;
    speedValue.textContent = telemetry.speed.toFixed(1);
    headingValue.textContent = String(telemetry.heading);
  }
}

function render() {
  renderer.render(scene, camera);
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(tick);
}

function setControl(name, active, button) {
  controls[name] = active;
  button?.classList.toggle("active", active);
}

document.querySelectorAll("[data-control]").forEach((button) => {
  const name = button.dataset.control;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    setControl(name, true, button);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
    button.addEventListener(eventName, () => setControl(name, false, button));
  });
  button.addEventListener("contextmenu", (event) => event.preventDefault());
});

function releaseControls() {
  Object.keys(controls).forEach((name) => {
    controls[name] = false;
  });
  document.querySelectorAll(".control.active").forEach((button) => {
    button.classList.remove("active");
  });
}

function onKey(event, pressed) {
  const key = event.key.toLowerCase();
  const mapping = {
    arrowup: "throttle",
    w: "throttle",
    arrowdown: "brake",
    s: "brake",
    arrowleft: "left",
    a: "left",
    arrowright: "right",
    d: "right",
  };
  const control = mapping[key];
  if (control) {
    event.preventDefault();
    controls[control] = pressed;
  }
  if (key === "f" && pressed) {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => undefined);
  }
}

window.addEventListener("keydown", (event) => onKey(event, true));
window.addEventListener("keyup", (event) => onKey(event, false));
window.addEventListener("blur", releaseControls);
window.addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) releaseControls();
});
document.addEventListener("fullscreenchange", resize);

window.render_game_to_text = () =>
  JSON.stringify({
    mode: "sailing",
    coordinateSystem: "x right, z forward is negative, heading degrees clockwise",
    boat: telemetry,
    controls,
  });

window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) update(1 / 60);
  render();
};

resize();
update(1 / 60);
render();
loading.classList.add("ready");
loading.setAttribute("aria-hidden", "true");
requestAnimationFrame(tick);
