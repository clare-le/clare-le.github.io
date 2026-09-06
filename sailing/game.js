import * as THREE from "./boats/three.js";
import { createBoatSlot } from "./boats/index.js";
import { selectBoatConfiguration } from "./boats/config.js";

const mount = document.querySelector("#scene");
const speedValue = document.querySelector("#speed");
const headingValue = document.querySelector("#heading");
const throttleValue = document.querySelector("#throttle");
const bearingValue = document.querySelector("#bearing");
const loading = document.querySelector("#loading");

const controls = {
  left: false,
  right: false,
};

const cameraLook = {
  yaw: 0,
  dragging: false,
  pointerId: null,
  startX: 0,
  startYaw: 0,
};
const maxCameraYaw = Math.PI / 2;

const throttleSpeeds = [0, 1.3, 2.8, 4.5, 6.4, 8.5];
const bearings = ["北", "東北", "東", "東南", "南", "西南", "西", "西北"];

const telemetry = {
  speed: 0,
  throttle: 0,
  targetSpeed: 0,
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
const waterTime = { value: 0 };
seaMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.waterTime = waterTime;
  shader.vertexShader = `varying vec3 waterPosition;\n${shader.vertexShader}`
    .replace("#include <begin_vertex>", `#include <begin_vertex>
      waterPosition = (modelMatrix * vec4(position, 1.0)).xyz;`);
  shader.fragmentShader = `uniform float waterTime;
    varying vec3 waterPosition;\n${shader.fragmentShader}`
    .replace("#include <color_fragment>", `#include <color_fragment>
      vec2 p = waterPosition.xz;
      float ripple = sin(p.y * 9.0 + sin(p.x * 3.2 + waterTime * 0.7) * 2.0
        + sin(p.y * 2.1 + p.x * 1.7) * 1.4 + waterTime * 1.2);
      float crossRipple = sin(p.x * 5.0 - p.y * 3.0 - waterTime * 0.8);
      float nearWater = 1.0 - smoothstep(6.0, 35.0,
        distance(cameraPosition.xz, p));
      float crest = smoothstep(0.75, 1.0, ripple)
        * smoothstep(-0.3, 0.8, crossRipple);
      diffuseColor.rgb *= 1.0 + nearWater * ripple * 0.1;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.38, 0.79, 0.82),
        crest * nearWater * 0.28);`);
};
const sea = new THREE.Mesh(seaGeometry, seaMaterial);
scene.add(sea);

// Fixed-size world-space particle pool: emitted water does not turn with the boat.
const sprayCount = 240;
const sprayPositions = new Float32Array(sprayCount * 3);
const sprayStrength = new Float32Array(sprayCount);
const sprayParticles = Array.from({ length: sprayCount }, () => ({
  age: 2, life: 1, vx: 0, vy: 0, vz: 0, size: 0,
}));
const sprayGeometry = new THREE.BufferGeometry();
sprayGeometry.setAttribute("position", new THREE.BufferAttribute(sprayPositions, 3)
  .setUsage(THREE.DynamicDrawUsage));
sprayGeometry.setAttribute("strength", new THREE.BufferAttribute(sprayStrength, 1)
  .setUsage(THREE.DynamicDrawUsage));
const sprayMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: { pixelScale: { value: 1 } },
  vertexShader: `
    attribute float strength;
    uniform float pixelScale;
    varying float opacity;
    void main() {
      vec4 eye = modelViewMatrix * vec4(position, 1.0);
      opacity = strength;
      gl_Position = projectionMatrix * eye;
      gl_PointSize = clamp(pixelScale * (0.016 + strength * 0.025)
        / max(0.1, -eye.z), 1.0, 22.0);
    }
  `,
  fragmentShader: `
    varying float opacity;
    void main() {
      float radius = length(gl_PointCoord - 0.5) * 2.0;
      float alpha = (1.0 - smoothstep(0.25, 1.0, radius)) * opacity;
      if (alpha < 0.01) discard;
      gl_FragColor = vec4(0.86, 0.98, 1.0, alpha);
    }
  `,
});
const bowSpray = new THREE.Points(sprayGeometry, sprayMaterial);
bowSpray.frustumCulled = false;
scene.add(bowSpray);
let sprayCursor = 0;
let sprayEmission = 0;

function waterHeight(x, z, time) {
  return Math.sin(x * 0.22 + time * 1.7) * 0.22
    + Math.sin(z * 0.18 + time * 1.1) * 0.18
    + Math.sin((x + z) * 0.08 + time * 0.7) * 0.12;
}

function updateBowSpray(dt, forwardX, forwardZ) {
  const { spray, waterline } = vessel.profile;
  const intensity = clamp(state.speed / 8.5, 0, 1);
  const rightX = -forwardZ;
  const rightZ = forwardX;
  sprayEmission += dt * 100 * intensity;
  while (sprayEmission >= 1) {
    sprayEmission -= 1;
    for (const side of [-1, 1]) {
      const index = sprayCursor++ % sprayCount;
      const particle = sprayParticles[index];
      const spread = 0.65 + Math.random() * 0.65;
      const x = state.x + forwardX * spray.forward + rightX * side * spray.halfWidth;
      const z = state.z + forwardZ * spray.forward + rightZ * side * spray.halfWidth;
      const hullWaterline = waterline + Math.sin(state.time * 2.1) * 0.08;
      sprayPositions.set([x, Math.max(waterHeight(x, z, state.time), hullWaterline)
        + 0.08, z], index * 3);
      particle.age = 0;
      particle.life = 0.65 + Math.random() * 0.5;
      particle.vx = rightX * side * spread * (0.5 + intensity)
        + forwardX * state.speed * 0.85;
      particle.vz = rightZ * side * spread * (0.5 + intensity)
        + forwardZ * state.speed * 0.85;
      particle.vy = 0.4 + intensity * (1.7 + Math.random() * 0.4);
      particle.size = 0.25 + intensity * 0.65;
    }
  }
  for (let i = 0; i < sprayCount; i += 1) {
    const particle = sprayParticles[i];
    particle.age += dt;
    if (particle.age >= particle.life) {
      sprayStrength[i] = 0;
      continue;
    }
    const offset = i * 3;
    sprayPositions[offset] += particle.vx * dt;
    sprayPositions[offset + 2] += particle.vz * dt;
    particle.vy -= 2.8 * dt;
    const surface = waterHeight(sprayPositions[offset], sprayPositions[offset + 2], state.time);
    sprayPositions[offset + 1] = Math.max(surface + 0.025,
      sprayPositions[offset + 1] + particle.vy * dt);
    sprayStrength[i] = particle.size * (1 - particle.age / particle.life);
  }
  sprayGeometry.attributes.position.needsUpdate = true;
  sprayGeometry.attributes.strength.needsUpdate = true;
}

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

const vessel = createBoatSlot(selectBoatConfiguration(window.location.search));
const boat = vessel.root;
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
  throttleLevel: 0,
  rudder: 0,
  time: 0,
  lastTelemetry: 0,
};

function resize() {
  const width = mount.clientWidth || window.innerWidth;
  const height = mount.clientHeight || window.innerHeight;
  renderer.setSize(width, height);
  sprayMaterial.uniforms.pixelScale.value = height * renderer.getPixelRatio();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function update(dt) {
  state.time += dt;
  const targetSpeed = throttleSpeeds[state.throttleLevel];
  const speedRate = targetSpeed > state.speed ? 2.15 : 2.8;
  state.speed += clamp(targetSpeed - state.speed, -speedRate * dt, speedRate * dt);

  const turnInput = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
  const rudderResponse = 1 - Math.exp(-6 * dt);
  state.rudder = THREE.MathUtils.lerp(state.rudder, turnInput, rudderResponse);
  const turnAuthority = clamp(state.speed / 1.1, 0, 1);
  state.heading +=
    state.rudder * (0.38 + state.speed * 0.045) * turnAuthority * dt;

  vessel.update(dt, {
    rudder: state.rudder,
    throttle: state.throttleLevel / (throttleSpeeds.length - 1),
    speed: state.speed,
    speedRatio: state.speed / throttleSpeeds[throttleSpeeds.length - 1],
    heading: state.heading,
    time: state.time,
  });

  const forwardX = Math.sin(state.heading);
  const forwardZ = -Math.cos(state.heading);
  state.x += forwardX * state.speed * dt;
  state.z += forwardZ * state.speed * dt;
  waterTime.value = state.time;
  updateBowSpray(dt, forwardX, forwardZ);

  const positions = seaGeometry.attributes.position;
  const points = positions.array;
  for (let i = 0; i < points.length; i += 3) {
    const x = basePositions[i] + state.x;
    const z = basePositions[i + 2] + state.z;
    points[i + 1] = waterHeight(x, z, state.time);
  }
  positions.needsUpdate = true;
  seaGeometry.computeVertexNormals();

  sea.position.set(state.x, 0, state.z);
  horizon.position.set(state.x, 0.05, state.z);
  boat.position.set(state.x, vessel.profile.waterline + Math.sin(state.time * 2.1) * 0.08, state.z);
  boat.rotation.y = -state.heading;
  boat.rotation.x = Math.sin(state.time * 1.5 + state.speed) * 0.025;
  const boatSpeedRatio =
    state.speed / throttleSpeeds[throttleSpeeds.length - 1];
  boat.rotation.z =
    -state.rudder * (0.025 + boatSpeedRatio * 0.05) +
    Math.sin(state.time * 1.2) * 0.018;

  markers.forEach((marker, index) => {
    marker.position.y = 0.24 + Math.sin((state.time + index * 0.7) * 1.6) * 0.12;
    marker.rotation.y += dt * 0.6;
  });

  if (!cameraLook.dragging) {
    cameraLook.yaw = THREE.MathUtils.damp(cameraLook.yaw, 0, 2.4, dt);
    if (Math.abs(cameraLook.yaw) < 0.0005) cameraLook.yaw = 0;
  }

  const view = vessel.profile.camera;
  camera.position.set(
    state.x - forwardX * view.distance,
    view.height + Math.sin(state.time * 2.2) * 0.035,
    state.z - forwardZ * view.distance,
  );
  const lookHeading = state.heading + cameraLook.yaw;
  const lookDistance = view.lookAhead + view.distance;
  camera.lookAt(
    camera.position.x + Math.sin(lookHeading) * lookDistance,
    view.lookHeight + Math.sin(state.time * 1.1) * 0.12,
    camera.position.z - Math.cos(lookHeading) * lookDistance,
  );

  telemetry.speed = Number(state.speed.toFixed(1));
  telemetry.throttle = state.throttleLevel;
  telemetry.targetSpeed = targetSpeed;
  telemetry.heading =
    Math.round((((state.heading * 180) / Math.PI) % 360 + 360) % 360) % 360;
  telemetry.x = Number(state.x.toFixed(1));
  telemetry.z = Number(state.z.toFixed(1));

  if (state.time - state.lastTelemetry > 0.12) {
    state.lastTelemetry = state.time;
    speedValue.textContent = telemetry.speed.toFixed(1);
    throttleValue.textContent = String(telemetry.throttle);
    headingValue.textContent = String(telemetry.heading);
    bearingValue.textContent = bearings[Math.round(telemetry.heading / 45) % 8];
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

function setSteering(name, active, button) {
  controls[name] = active;
  button?.classList.toggle("active", active);
}

function adjustThrottle(delta) {
  state.throttleLevel = clamp(
    state.throttleLevel + delta,
    0,
    throttleSpeeds.length - 1,
  );
  throttleValue.textContent = String(state.throttleLevel);
}

function beginCameraLook(event) {
  if (!event.isPrimary || cameraLook.pointerId !== null) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const relativeX = (event.clientX - rect.left) / rect.width;
  const relativeY = (event.clientY - rect.top) / rect.height;
  if (relativeX < 0.15 || relativeX > 0.85
      || relativeY < 0.12 || relativeY > 0.74) return;
  event.preventDefault();
  cameraLook.dragging = true;
  cameraLook.pointerId = event.pointerId;
  cameraLook.startX = event.clientX;
  cameraLook.startYaw = cameraLook.yaw;
  renderer.domElement.setPointerCapture(event.pointerId);
}

function moveCameraLook(event) {
  if (event.pointerId !== cameraLook.pointerId) return;
  event.preventDefault();
  const width = renderer.domElement.getBoundingClientRect().width;
  const dragRange = Math.max(1, width * 0.42);
  cameraLook.yaw = clamp(
    cameraLook.startYaw + (event.clientX - cameraLook.startX) / dragRange * maxCameraYaw,
    -maxCameraYaw,
    maxCameraYaw,
  );
}

function endCameraLook(event) {
  if (event.pointerId !== cameraLook.pointerId) return;
  cameraLook.dragging = false;
  cameraLook.pointerId = null;
}

renderer.domElement.addEventListener("pointerdown", beginCameraLook);
renderer.domElement.addEventListener("pointermove", moveCameraLook);
for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
  renderer.domElement.addEventListener(eventName, endCameraLook);
}

document.querySelectorAll("[data-control]").forEach((button) => {
  const name = button.dataset.control;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    if (name === "left" || name === "right") {
      setSteering(name, true, button);
      return;
    }
    adjustThrottle(name === "throttle" ? 1 : -1);
    button.classList.add("active");
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
    button.addEventListener(eventName, () => {
      if (name === "left" || name === "right") {
        setSteering(name, false, button);
      } else {
        button.classList.remove("active");
      }
    });
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
  cameraLook.dragging = false;
  cameraLook.pointerId = null;
}

function onKey(event, pressed) {
  const key = event.key.toLowerCase();
  const mapping = {
    arrowleft: "left",
    a: "left",
    arrowright: "right",
    d: "right",
  };
  const throttleDelta =
    key === "arrowup" || key === "w"
      ? 1
      : key === "arrowdown" || key === "s"
        ? -1
        : 0;
  if (throttleDelta) {
    event.preventDefault();
    if (pressed && !event.repeat) adjustThrottle(throttleDelta);
    return;
  }
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
    model: vessel.configuration.model,
    coordinateSystem: "x right, z forward is negative, heading degrees clockwise",
    boat: telemetry,
    controls,
    camera: {
      yaw: Math.round(THREE.MathUtils.radToDeg(cameraLook.yaw)),
      dragging: cameraLook.dragging,
      limit: 90,
    },
    water: {
      sprayIntensity: Number((state.speed / 8.5).toFixed(2)),
      activeSprayParticles: sprayParticles.filter((p) => p.age < p.life).length,
    },
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
