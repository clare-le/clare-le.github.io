import * as THREE from "./boats/three.js";
import { createBoatSlot } from "./boats/index.js";
import { selectBoatConfiguration } from "./boats/config.js";
import { createTestIsland } from "./world/island.js";

const mount = document.querySelector("#scene");
const speedValue = document.querySelector("#speed");
const headingValue = document.querySelector("#heading");
const throttleValue = document.querySelector("#throttle");
const bearingValue = document.querySelector("#bearing");
const fuelValue = document.querySelector("#fuel");
const fuelLitersValue = document.querySelector("#fuel-liters");
const rpmValue = document.querySelector("#rpm");
const latitudeValue = document.querySelector("#latitude");
const longitudeValue = document.querySelector("#longitude");
const loading = document.querySelector("#loading");
const shoreStatus = document.querySelector("#shore-status");

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
  tapPointerId: null,
  tapStartX: 0,
  tapStartY: 0,
};
const maxCameraYaw = Math.PI / 2;
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const anchorWorldPosition = new THREE.Vector3();

const knotsToMetersPerSecond = 0.514444;
const propulsionResponseScale = 24;
const bearings = ["北", "東北", "東", "東南", "南", "西南", "西", "西北"];
const spawnCoordinates = { latitude: 25.15, longitude: 121.78 };
const metersPerLatitudeDegree = 111320;

const telemetry = {
  speed: 0,
  throttle: 0,
  gear: "N",
  targetSpeed: 0,
  acceleration: 0,
  heading: 0,
  x: 0,
  z: 0,
  fuelPercent: 100,
  fuelLiters: 0,
  rpm: 0,
  latitude: spawnCoordinates.latitude,
  longitude: spawnCoordinates.longitude,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function accelerationResponse(physics) {
  const powerPerTonne = physics.enginePowerKw / (physics.massKg / 1000);
  return Math.sqrt(powerPerTonne) * physics.propulsionFactor / propulsionResponseScale;
}

function targetSpeedForThrottle(physics, throttleLevel) {
  if (throttleLevel < 0) return -physics.reverseSpeedKnots;
  return physics.maxSpeedKnots * physics.throttleCurve[throttleLevel];
}

function gearForThrottle(throttleLevel) {
  if (throttleLevel < 0) return "R";
  if (throttleLevel === 0) return "N";
  return "F";
}

function instrumentRpm(physics, throttleLevel, speed) {
  if (throttleLevel === 0) return physics.idleRpm;
  const throttleRatio = throttleLevel < 0
    ? physics.reverseThrustFactor
    : physics.throttleCurve[throttleLevel];
  const speedRatio = clamp(Math.abs(speed) / physics.maxSpeedKnots, 0, 1);
  const rpmRatio = clamp(throttleRatio * 0.82 + speedRatio * 0.18, 0, 1);
  const rpm = THREE.MathUtils.lerp(physics.idleRpm, physics.maxRpm, rpmRatio);
  return Math.round(rpm / 50) * 50;
}

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
  const { spray, waterline, physics } = vessel.profile;
  const intensity = clamp(state.speed / physics.maxSpeedKnots, 0, 1);
  const worldSpeed = state.speed * knotsToMetersPerSecond;
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
      const hullWaterline = waterline
        + Math.sin(state.time * physics.motion.heaveFrequency) * physics.motion.heave;
      sprayPositions.set([x, Math.max(waterHeight(x, z, state.time), hullWaterline)
        + 0.08, z], index * 3);
      particle.age = 0;
      particle.life = 0.65 + Math.random() * 0.5;
      particle.vx = rightX * side * spread * (0.5 + intensity)
        + forwardX * worldSpeed * 0.85;
      particle.vz = rightZ * side * spread * (0.5 + intensity)
        + forwardZ * worldSpeed * 0.85;
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

const island = createTestIsland();
const islandEnabled = new URLSearchParams(window.location.search).get("island") !== "off";
if (islandEnabled) scene.add(island.root);

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
  acceleration: 0,
  shoreZone: "clear",
  shoreDistance: 0,
  impact: 0,
  collisionCount: 0,
  grounded: false,
  anchorDeployed: false,
  fuelFraction: 1,
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

function islandClearance(forwardX, forwardZ, radius = island.shoreRadius) {
  if (!islandEnabled) return { clearance: Infinity, normalX: 0, normalZ: 0 };
  const { physics } = vessel.profile;
  const rightX = -forwardZ;
  const rightZ = forwardX;
  const centerX = state.x + forwardX * physics.hullCenterForwardMeters;
  const centerZ = state.z + forwardZ * physics.hullCenterForwardMeters;
  const deltaX = centerX - island.center.x;
  const deltaZ = centerZ - island.center.z;
  const distance = Math.max(0.0001, Math.hypot(deltaX, deltaZ));
  const normalX = deltaX / distance;
  const normalZ = deltaZ / distance;
  const forwardProjection = normalX * forwardX + normalZ * forwardZ;
  const rightProjection = normalX * rightX + normalZ * rightZ;
  const hullRadius = Math.hypot(
    physics.lengthMeters * 0.5 * forwardProjection,
    physics.beamMeters * 0.5 * rightProjection,
  );
  return {
    clearance: distance - radius - hullRadius,
    normalX,
    normalZ,
  };
}

function resolveIslandCollision(forwardX, forwardZ) {
  const contact = islandClearance(forwardX, forwardZ);
  if (contact.clearance >= 0) {
    state.grounded = false;
    return contact;
  }

  state.x -= contact.normalX * contact.clearance;
  state.z -= contact.normalZ * contact.clearance;
  const direction = Math.sign(state.speed);
  const approach = Math.max(0, -(forwardX * direction * contact.normalX
    + forwardZ * direction * contact.normalZ));
  const impactSpeed = Math.abs(state.speed) * approach;
  if (!state.grounded && impactSpeed > 0.2) {
    state.impact = Math.max(state.impact, clamp(impactSpeed / 6, 0.18, 1));
    state.collisionCount += 1;
  }
  if (approach > 0) {
    state.speed *= Math.max(0, 1 - approach * 1.35);
    if (Math.abs(state.speed) < 0.08) state.speed = 0;
  }
  state.grounded = true;
  return contact;
}

function update(dt) {
  state.time += dt;
  state.impact = Math.max(0, state.impact - dt * 1.25);
  const { physics } = vessel.profile;
  const requestedTargetSpeed = targetSpeedForThrottle(physics, state.throttleLevel);
  const throttleRatio = state.throttleLevel < 0
    ? physics.reverseThrustFactor
    : physics.throttleCurve[state.throttleLevel];
  const fuelLoad = state.throttleLevel === 0 ? 0.06 : 0.12 + throttleRatio * 0.88;
  state.fuelFraction = Math.max(0, state.fuelFraction
    - physics.fullLoadFuelLitersPerHour * fuelLoad * dt
      / (physics.fuelCapacityLiters * 3600));
  const previousSpeed = state.speed;
  const changingDirection = requestedTargetSpeed !== 0 && state.speed !== 0
    && Math.sign(requestedTargetSpeed) !== Math.sign(state.speed);
  const movementTarget = state.anchorDeployed || changingDirection ? 0 : requestedTargetSpeed;
  const gainingSpeed = Math.abs(movementTarget) > Math.abs(state.speed);
  const propulsion = accelerationResponse(physics)
    * (movementTarget < 0 ? physics.reverseThrustFactor : 1);
  let speedResponse = physics.decelerationResponse;
  if (state.anchorDeployed) {
    speedResponse = physics.anchorBrakeResponse;
  } else if (changingDirection) {
    speedResponse = Math.max(speedResponse, accelerationResponse(physics) * 4);
  } else if (gainingSpeed) {
    speedResponse = propulsion;
  }
  state.speed = THREE.MathUtils.damp(state.speed, movementTarget, speedResponse, dt);
  const stopThreshold = changingDirection ? 0.03 : 0.002;
  if (Math.abs(movementTarget - state.speed) < stopThreshold) state.speed = movementTarget;
  const approachHeadingX = Math.sin(state.heading);
  const approachHeadingZ = -Math.cos(state.heading);
  const shallowContact = islandClearance(
    approachHeadingX, approachHeadingZ, island.shallowRadius,
  );
  const shallowAmount = clamp(
    -shallowContact.clearance / (island.shallowRadius - island.shoreRadius), 0, 1,
  );
  if (shallowAmount > 0) {
    const shallowSpeedLimit = Math.max(1.8, physics.maxSpeedKnots * 0.28);
    const speedLimit = THREE.MathUtils.lerp(
      physics.maxSpeedKnots, shallowSpeedLimit, shallowAmount,
    );
    if (Math.abs(state.speed) > speedLimit) {
      state.speed = THREE.MathUtils.damp(
        state.speed, Math.sign(state.speed) * speedLimit, 0.8 + shallowAmount * 1.8, dt,
      );
    }
  }

  const turnInput = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
  const rudderResponse = 1 - Math.exp(-physics.rudderResponse * dt);
  state.rudder = THREE.MathUtils.lerp(state.rudder, turnInput, rudderResponse);
  const speedRatio = clamp(Math.abs(state.speed) / physics.maxSpeedKnots, 0, 1);
  const turnAuthority = clamp(Math.abs(state.speed) / physics.minSteerageKnots, 0, 1);
  const turnRate = physics.turnRateAtMax * (0.28 + speedRatio * 0.72);
  state.heading += state.rudder * turnRate * turnAuthority * Math.sign(state.speed) * dt;

  const forwardX = Math.sin(state.heading);
  const forwardZ = -Math.cos(state.heading);
  const worldSpeed = state.speed * knotsToMetersPerSecond;
  state.x += forwardX * worldSpeed * dt;
  state.z += forwardZ * worldSpeed * dt;
  const shoreContact = resolveIslandCollision(forwardX, forwardZ);
  const nearShore = islandClearance(forwardX, forwardZ, island.shallowRadius);
  state.shoreZone = state.grounded ? "grounded" : nearShore.clearance < 0 ? "shallow" : "clear";
  state.shoreDistance = Math.max(0, shoreContact.clearance);
  state.acceleration = clamp((state.speed - previousSpeed) / dt, -12, 12);

  vessel.update(dt, {
    rudder: state.rudder,
    throttle: state.throttleLevel < 0
      ? -1
      : state.throttleLevel / (physics.throttleCurve.length - 1),
    gear: Math.sign(state.throttleLevel),
    anchor: state.anchorDeployed,
    speed: state.speed,
    speedRatio: clamp(Math.abs(state.speed) / physics.maxSpeedKnots, 0, 1),
    heading: state.heading,
    time: state.time,
  });

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
  const motion = physics.motion;
  boat.position.set(state.x, vessel.profile.waterline
    + Math.sin(state.time * motion.heaveFrequency) * motion.heave, state.z);
  boat.rotation.y = -state.heading;
  boat.rotation.x = Math.sin(state.time * motion.pitchFrequency + speedRatio * 2) * motion.pitch
    - state.acceleration * motion.accelerationPitch
    + Math.sin(state.time * 34) * state.impact * 0.035;
  boat.rotation.z =
    -state.rudder * motion.heel * speedRatio * Math.sign(state.speed)
    + Math.sin(state.time * 1.2) * motion.roll;

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
    view.height + Math.sin(state.time * motion.heaveFrequency) * motion.cameraHeave,
    state.z - forwardZ * view.distance,
  );
  camera.position.x += Math.cos(state.time * 41) * state.impact * 0.035;
  camera.position.y += Math.sin(state.time * 37) * state.impact * 0.025;
  const lookHeading = state.heading + cameraLook.yaw;
  const lookDistance = view.lookAhead + view.distance;
  camera.lookAt(
    camera.position.x + Math.sin(lookHeading) * lookDistance,
    view.lookHeight + Math.sin(state.time * 1.1) * 0.12,
    camera.position.z - Math.cos(lookHeading) * lookDistance,
  );

  telemetry.speed = Number(state.speed.toFixed(1));
  telemetry.throttle = state.throttleLevel;
  telemetry.gear = gearForThrottle(state.throttleLevel);
  telemetry.targetSpeed = state.anchorDeployed ? 0 : requestedTargetSpeed;
  telemetry.acceleration = Number(state.acceleration.toFixed(2));
  telemetry.heading =
    Math.round((((state.heading * 180) / Math.PI) % 360 + 360) % 360) % 360;
  telemetry.x = Number(state.x.toFixed(1));
  telemetry.z = Number(state.z.toFixed(1));
  telemetry.fuelPercent = Number((state.fuelFraction * 100).toFixed(1));
  telemetry.fuelLiters = Number(
    (state.fuelFraction * physics.fuelCapacityLiters).toFixed(1),
  );
  telemetry.rpm = instrumentRpm(physics, state.throttleLevel, state.speed);
  telemetry.latitude = Number(
    (spawnCoordinates.latitude - state.z / metersPerLatitudeDegree).toFixed(5),
  );
  telemetry.longitude = Number((spawnCoordinates.longitude
    + state.x / (metersPerLatitudeDegree
      * Math.cos(spawnCoordinates.latitude * Math.PI / 180))).toFixed(5));

  if (state.time - state.lastTelemetry > 0.12) {
    state.lastTelemetry = state.time;
    speedValue.textContent = telemetry.speed.toFixed(1);
    throttleValue.textContent = telemetry.throttle < 0 ? "R" : String(telemetry.throttle);
    headingValue.textContent = String(telemetry.heading);
    bearingValue.textContent = bearings[Math.round(telemetry.heading / 45) % 8];
    fuelValue.textContent = String(Math.round(telemetry.fuelPercent));
    fuelLitersValue.textContent = String(Math.round(telemetry.fuelLiters));
    rpmValue.textContent = telemetry.rpm.toLocaleString("en-US");
    latitudeValue.textContent = `${telemetry.latitude.toFixed(2)}°N`;
    longitudeValue.textContent = `${telemetry.longitude.toFixed(2)}°E`;
    shoreStatus.hidden = state.shoreZone === "clear" && !state.anchorDeployed;
    shoreStatus.classList.toggle("impact", state.grounded && state.impact > 0.12);
    shoreStatus.textContent = state.grounded && state.impact > 0.12
      ? "碰岸"
      : state.anchorDeployed ? "錨已下"
        : state.grounded ? "已靠岸" : "淺水";
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
  const { throttleCurve } = vessel.profile.physics;
  state.throttleLevel = clamp(
    state.throttleLevel + delta,
    -1,
    throttleCurve.length - 1,
  );
  throttleValue.textContent = state.throttleLevel < 0 ? "R" : String(state.throttleLevel);
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

function beginCanvasPointer(event) {
  if (event.isPrimary && cameraLook.tapPointerId === null) {
    cameraLook.tapPointerId = event.pointerId;
    cameraLook.tapStartX = event.clientX;
    cameraLook.tapStartY = event.clientY;
  }
  beginCameraLook(event);
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

function anchorScreenPosition() {
  const target = vessel.root.getObjectByName("anchor-hit");
  if (!target) return null;
  target.getWorldPosition(anchorWorldPosition);
  anchorWorldPosition.project(camera);
  const rect = renderer.domElement.getBoundingClientRect();
  return {
    x: Math.round(rect.left + (anchorWorldPosition.x + 1) * rect.width * 0.5),
    y: Math.round(rect.top + (1 - anchorWorldPosition.y) * rect.height * 0.5),
  };
}

function toggleAnchorAt(event) {
  const target = vessel.root.getObjectByName("anchor-hit");
  if (!target) return false;
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNdc.set(
    (event.clientX - rect.left) / rect.width * 2 - 1,
    -(event.clientY - rect.top) / rect.height * 2 + 1,
  );
  target.updateWorldMatrix(true, false);
  raycaster.setFromCamera(pointerNdc, camera);
  if (!raycaster.intersectObject(target, false).length) return false;
  state.anchorDeployed = !state.anchorDeployed;
  return true;
}

function finishCanvasPointer(event, allowTap) {
  if (event.pointerId === cameraLook.tapPointerId) {
    const travel = Math.hypot(
      event.clientX - cameraLook.tapStartX,
      event.clientY - cameraLook.tapStartY,
    );
    if (allowTap && travel < 12) toggleAnchorAt(event);
    cameraLook.tapPointerId = null;
  }
  endCameraLook(event);
}

renderer.domElement.addEventListener("pointerdown", beginCanvasPointer);
renderer.domElement.addEventListener("pointermove", moveCameraLook);
renderer.domElement.addEventListener("pointerup", (event) => finishCanvasPointer(event, true));
renderer.domElement.addEventListener("pointercancel", (event) => finishCanvasPointer(event, false));
renderer.domElement.addEventListener("lostpointercapture",
  (event) => finishCanvasPointer(event, false));

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
  cameraLook.tapPointerId = null;
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
    coordinateSystem: "x right and z forward-negative in metres; speed knots; heading degrees clockwise",
    boat: telemetry,
    physics: {
      lengthMeters: vessel.profile.physics.lengthMeters,
      massKg: vessel.profile.physics.massKg,
      enginePowerKw: vessel.profile.physics.enginePowerKw,
      maxSpeedKnots: vessel.profile.physics.maxSpeedKnots,
      reverseSpeedKnots: vessel.profile.physics.reverseSpeedKnots,
      accelerationResponse: Number(accelerationResponse(vessel.profile.physics).toFixed(3)),
      decelerationResponse: vessel.profile.physics.decelerationResponse,
      anchorBrakeResponse: vessel.profile.physics.anchorBrakeResponse,
    },
    controls,
    camera: {
      yaw: Math.round(THREE.MathUtils.radToDeg(cameraLook.yaw)),
      dragging: cameraLook.dragging,
      limit: 90,
    },
    anchor: {
      deployed: state.anchorDeployed,
      controlScreen: anchorScreenPosition(),
    },
    water: {
      sprayIntensity: Number((Math.max(0, state.speed)
        / vessel.profile.physics.maxSpeedKnots).toFixed(2)),
      activeSprayParticles: sprayParticles.filter((p) => p.age < p.life).length,
    },
    shore: {
      active: islandEnabled,
      zone: state.shoreZone,
      distanceMeters: islandEnabled ? Number(state.shoreDistance.toFixed(2)) : null,
      impact: Number(state.impact.toFixed(2)),
      collisionCount: state.collisionCount,
      island: {
        x: island.center.x,
        z: island.center.z,
        shoreRadius: island.shoreRadius,
        shallowRadius: island.shallowRadius,
      },
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
