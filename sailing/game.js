import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js";

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

// --- VINTAGE WOODEN RUNABOUT YACHT MODEL (Riva / Chris-Craft Style) ---
const boat = new THREE.Group();

// Materials
const mahoganyMaterial = new THREE.MeshStandardMaterial({
  color: 0x752b14, // Deep polished mahogany
  roughness: 0.28,
  metalness: 0.08,
});
const teakDeckMaterial = new THREE.MeshStandardMaterial({
  color: 0x8e3b1c, // Striped teak foredeck
  roughness: 0.32,
  metalness: 0.05,
});
const creamStripeMaterial = new THREE.MeshStandardMaterial({
  color: 0xf6efe2, // Classic racing pinstripe
  roughness: 0.36,
  metalness: 0.02,
});
const hullNavyMaterial = new THREE.MeshStandardMaterial({
  color: 0x163248, // Deep marine navy lower hull
  roughness: 0.42,
  metalness: 0.06,
});
const chromeMaterial = new THREE.MeshStandardMaterial({
  color: 0xf0f4f8, // Polished chrome metal
  roughness: 0.12,
  metalness: 0.95,
});
const goldBrassMaterial = new THREE.MeshStandardMaterial({
  color: 0xdfab34, // Polished brass accents
  roughness: 0.22,
  metalness: 0.88,
});
const leatherCockpitMaterial = new THREE.MeshStandardMaterial({
  color: 0xbe8b58, // Saddle tan leather coaming
  roughness: 0.68,
  metalness: 0.02,
});
const darkCockpitMaterial = new THREE.MeshStandardMaterial({
  color: 0x1c130d,
  roughness: 0.84,
});
const glassMaterial = new THREE.MeshStandardMaterial({
  color: 0xa8eeff,
  transparent: true,
  opacity: 0.34,
  roughness: 0.06,
  metalness: 0.18,
  side: THREE.DoubleSide,
});

// 1. Lower Planing V-Hull
const lowerHullGeo = new THREE.BufferGeometry();
lowerHullGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(
    [
      // Cockpit bottom edge: left, center keel, right
      -0.56, 0.22, 0.45,
      0, 0.08, 0.45,
      0.56, 0.22, 0.45,
      // Mid hull
      -0.54, 0.25, -0.9,
      0, 0.1, -0.9,
      0.54, 0.25, -0.9,
      // Bow entry / stem
      -0.22, 0.32, -2.2,
      0, 0.18, -2.45,
      0.22, 0.32, -2.2,
      // Forefoot tip
      0, 0.35, -2.55,
    ],
    3,
  ),
);
lowerHullGeo.setIndex([
  // Cockpit to Mid
  0, 1, 4,  0, 4, 3,
  1, 2, 5,  1, 5, 4,
  // Mid to Bow
  3, 4, 7,  3, 7, 6,
  4, 5, 8,  4, 8, 7,
  // Bow to Forefoot
  6, 7, 9,
  7, 8, 9,
]);
lowerHullGeo.computeVertexNormals();
const lowerHull = new THREE.Mesh(lowerHullGeo, hullNavyMaterial);
boat.add(lowerHull);

// 2. Upper Hull Topsides (Tapered Mahogany Flared Bow)
const topsideGeo = new THREE.BufferGeometry();
topsideGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(
    [
      // Port upper sheer line
      -0.62, 0.68, 0.45,
      -0.59, 0.68, -0.85,
      -0.34, 0.65, -1.95,
      0, 0.62, -2.55,
      // Starboard upper sheer line
      0.62, 0.68, 0.45,
      0.59, 0.68, -0.85,
      0.34, 0.65, -1.95,
      // Lower chine line (matches lower hull)
      -0.56, 0.22, 0.45,
      -0.54, 0.25, -0.9,
      -0.22, 0.32, -2.2,
      0, 0.35, -2.55,
      0.56, 0.22, 0.45,
      0.54, 0.25, -0.9,
      0.22, 0.32, -2.2,
    ],
    3,
  ),
);
topsideGeo.setIndex([
  // Port side topsides
  0, 1, 8,   0, 8, 7,
  1, 2, 9,   1, 9, 8,
  2, 3, 10,  2, 10, 9,
  // Starboard side topsides
  4, 11, 12, 4, 12, 5,
  5, 12, 13, 5, 13, 6,
  6, 13, 10, 6, 10, 3,
]);
topsideGeo.computeVertexNormals();
const topsides = new THREE.Mesh(topsideGeo, mahoganyMaterial);
boat.add(topsides);

// 3. Foredeck (Polished Teak Deck with Camber/Crown)
const foredeckGeo = new THREE.BufferGeometry();
foredeckGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(
    [
      // Dashboard edge (z = -0.32)
      -0.58, 0.69, -0.32,
      0, 0.74, -0.32,
      0.58, 0.69, -0.32,
      // Mid foredeck (z = -1.4)
      -0.46, 0.67, -1.4,
      0, 0.71, -1.4,
      0.46, 0.67, -1.4,
      // Bow tip (z = -2.55)
      0, 0.63, -2.55,
    ],
    3,
  ),
);
foredeckGeo.setIndex([
  0, 1, 4,   0, 4, 3,
  1, 2, 5,   1, 5, 4,
  3, 4, 6,
  4, 5, 6,
]);
foredeckGeo.computeVertexNormals();
const foredeck = new THREE.Mesh(foredeckGeo, teakDeckMaterial);
boat.add(foredeck);

// Foredeck Center Inlay Stripe
const centerStripeGeo = new THREE.BufferGeometry();
centerStripeGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(
    [
      -0.032, 0.743, -0.32,
      0.032, 0.743, -0.32,
      -0.015, 0.633, -2.55,
      0.015, 0.633, -2.55,
    ],
    3,
  ),
);
centerStripeGeo.setIndex([0, 1, 3, 0, 3, 2]);
centerStripeGeo.computeVertexNormals();
const centerStripe = new THREE.Mesh(centerStripeGeo, creamStripeMaterial);
boat.add(centerStripe);

// 4. Cockpit Floor & Side Walls
const cockpitFloor = new THREE.Mesh(
  new THREE.BoxGeometry(1.1, 0.16, 1.1),
  darkCockpitMaterial,
);
cockpitFloor.position.set(0, 0.44, 0.22);
boat.add(cockpitFloor);

// Cockpit Padded Leather Coaming
const coamingLeft = new THREE.Mesh(
  new THREE.BoxGeometry(0.12, 0.14, 0.95),
  leatherCockpitMaterial,
);
coamingLeft.position.set(-0.54, 0.73, 0.15);
boat.add(coamingLeft);

const coamingRight = new THREE.Mesh(
  new THREE.BoxGeometry(0.12, 0.14, 0.95),
  leatherCockpitMaterial,
);
coamingRight.position.set(0.54, 0.73, 0.15);
boat.add(coamingRight);

// 5. Chrome Gunwale Rub Rails
[
  [new THREE.Vector3(-0.62, 0.70, 0.45), new THREE.Vector3(-0.35, 0.67, -1.95), new THREE.Vector3(0, 0.64, -2.55)],
  [new THREE.Vector3(0.62, 0.70, 0.45), new THREE.Vector3(0.35, 0.67, -1.95), new THREE.Vector3(0, 0.64, -2.55)],
].forEach((points) => {
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const dir = new THREE.Vector3().subVectors(end, start);
    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, dir.length(), 8),
      chromeMaterial,
    );
    rail.position.copy(start).add(end).multiplyScalar(0.5);
    rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    boat.add(rail);
  }
});

// Chrome Bow Stem Guard
const bowStemCap = new THREE.Mesh(
  new THREE.CylinderGeometry(0.028, 0.04, 0.32, 8),
  chromeMaterial,
);
bowStemCap.position.set(0, 0.49, -2.54);
bowStemCap.rotation.x = -0.3;
boat.add(bowStemCap);

// 6. Curved Wrap-Around Windshield
const windshieldGroup = new THREE.Group();
windshieldGroup.position.set(0, 0.71, -0.32);

const glassGeo = new THREE.BufferGeometry();
glassGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(
    [
      // Bottom rim
      -0.54, 0.02, 0.06,
      -0.24, 0.04, -0.04,
      0.24, 0.04, -0.04,
      0.54, 0.02, 0.06,
      // Top rim (slanted back towards driver)
      -0.48, 0.28, 0.16,
      -0.22, 0.31, 0.09,
      0.22, 0.31, 0.09,
      0.48, 0.28, 0.16,
    ],
    3,
  ),
);
glassGeo.setIndex([
  0, 1, 5,  0, 5, 4,
  1, 2, 6,  1, 6, 5,
  2, 3, 7,  2, 7, 6,
]);
glassGeo.computeVertexNormals();
const windshieldGlass = new THREE.Mesh(glassGeo, glassMaterial);
windshieldGroup.add(windshieldGlass);

// Chrome Windshield Frame (Accurately tracing glass brow and pillars)
const framePoints = [
  new THREE.Vector3(-0.54, 0.02, 0.06), // left base
  new THREE.Vector3(-0.48, 0.28, 0.16), // left top corner
  new THREE.Vector3(-0.22, 0.31, 0.09), // left brow
  new THREE.Vector3(0, 0.32, 0.08),     // center top
  new THREE.Vector3(0.22, 0.31, 0.09),  // right brow
  new THREE.Vector3(0.48, 0.28, 0.16),  // right top corner
  new THREE.Vector3(0.54, 0.02, 0.06),  // right base
];

for (let i = 0; i < framePoints.length - 1; i += 1) {
  const p1 = framePoints[i];
  const p2 = framePoints[i + 1];
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const seg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, dir.length(), 8),
    chromeMaterial,
  );
  seg.position.copy(p1).add(p2).multiplyScalar(0.5);
  seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  windshieldGroup.add(seg);
}

// Center Chrome Support Divider
const centerPillarP1 = new THREE.Vector3(0, 0.04, -0.04);
const centerPillarP2 = new THREE.Vector3(0, 0.32, 0.08);
const centerDir = new THREE.Vector3().subVectors(centerPillarP2, centerPillarP1);
const centerPillar = new THREE.Mesh(
  new THREE.CylinderGeometry(0.01, 0.01, centerDir.length(), 8),
  chromeMaterial,
);
centerPillar.position.copy(centerPillarP1).add(centerPillarP2).multiplyScalar(0.5);
centerPillar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), centerDir.normalize());
windshieldGroup.add(centerPillar);

// Chrome Center Rearview Mirror
const mirrorStem = new THREE.Mesh(
  new THREE.CylinderGeometry(0.007, 0.007, 0.04, 8),
  chromeMaterial,
);
mirrorStem.position.set(0, 0.34, 0.08);
windshieldGroup.add(mirrorStem);
const mirrorBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.09, 0.038, 0.015),
  chromeMaterial,
);
mirrorBody.position.set(0, 0.365, 0.08);
windshieldGroup.add(mirrorBody);
boat.add(windshieldGroup);

// 7. Dashboard & Instrument Panel
const dashFascia = new THREE.Mesh(
  new THREE.BoxGeometry(0.96, 0.22, 0.14),
  mahoganyMaterial,
);
dashFascia.position.set(0, 0.73, -0.16);
dashFascia.rotation.x = -0.32;
boat.add(dashFascia);

const dashLeatherRoll = new THREE.Mesh(
  new THREE.CylinderGeometry(0.03, 0.03, 0.98, 16),
  leatherCockpitMaterial,
);
dashLeatherRoll.position.set(0, 0.83, -0.11);
dashLeatherRoll.rotation.z = Math.PI / 2;
boat.add(dashLeatherRoll);

// 3 Classic Chrome Gauges
const gaugeFaceMat = new THREE.MeshStandardMaterial({
  color: 0x121820,
  roughness: 0.9,
});
const gaugeNeedleMat = new THREE.MeshBasicMaterial({ color: 0xff4818 });

function createGauge(radius) {
  const group = new THREE.Group();
  const bezel = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.012, 10, 24),
    chromeMaterial,
  );
  group.add(bezel);
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(radius - 0.004, 24),
    gaugeFaceMat,
  );
  face.position.z = -0.005;
  group.add(face);
  const dialTicks = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.68, radius * 0.76, 24),
    new THREE.MeshBasicMaterial({ color: 0xebf2f8 }),
  );
  dialTicks.position.z = -0.002;
  group.add(dialTicks);
  const needle = new THREE.Mesh(
    new THREE.BoxGeometry(0.007, radius * 0.82, 0.005),
    gaugeNeedleMat,
  );
  needle.position.y = (radius * 0.82) / 2;
  const needlePivot = new THREE.Group();
  needlePivot.add(needle);
  needlePivot.position.z = 0.004;
  group.add(needlePivot);
  return { group, needlePivot };
}

// Center Speedometer (Knots)
const speedGauge = createGauge(0.054);
speedGauge.group.position.set(0, 0.75, -0.08);
speedGauge.group.rotation.x = -0.32;
boat.add(speedGauge.group);

// Left Tachometer
const rpmGauge = createGauge(0.042);
rpmGauge.group.position.set(-0.16, 0.73, -0.08);
rpmGauge.group.rotation.x = -0.32;
boat.add(rpmGauge.group);

// Right Marine Heading Gauge
const headingGauge = createGauge(0.042);
headingGauge.group.position.set(0.16, 0.73, -0.08);
headingGauge.group.rotation.x = -0.32;
boat.add(headingGauge.group);

// 8. Throttle Quadrant & Dynamic Lever
const throttleBase = new THREE.Mesh(
  new THREE.BoxGeometry(0.07, 0.08, 0.12),
  chromeMaterial,
);
throttleBase.position.set(0.35, 0.67, -0.05);
boat.add(throttleBase);

const throttleLever = new THREE.Group();
throttleLever.position.set(0.35, 0.71, -0.05);
const leverArm = new THREE.Mesh(
  new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8),
  chromeMaterial,
);
leverArm.position.y = 0.08;
throttleLever.add(leverArm);
const leverKnob = new THREE.Mesh(
  new THREE.SphereGeometry(0.024, 16, 16),
  goldBrassMaterial,
);
leverKnob.position.y = 0.16;
throttleLever.add(leverKnob);
boat.add(throttleLever);

// 9. Vintage Luxury 3-Spoke Wooden Steering Wheel (Open-top layout for gauges)
const wheelAssembly = new THREE.Group();
wheelAssembly.position.set(0, 0.69, 0.03);
wheelAssembly.rotation.x = -0.22;

const steeringColumn = new THREE.Mesh(
  new THREE.CylinderGeometry(0.034, 0.042, 0.24, 16),
  chromeMaterial,
);
steeringColumn.position.set(0, 0.63, -0.07);
steeringColumn.rotation.x = Math.PI / 2 - 0.22;
boat.add(steeringColumn);

const wheelRim = new THREE.Mesh(
  new THREE.TorusGeometry(0.17, 0.019, 14, 36),
  mahoganyMaterial,
);
wheelAssembly.add(wheelRim);

const wheelHub = new THREE.Mesh(
  new THREE.CylinderGeometry(0.045, 0.045, 0.036, 20),
  chromeMaterial,
);
wheelHub.rotation.x = Math.PI / 2;
wheelAssembly.add(wheelHub);

const hornCap = new THREE.Mesh(
  new THREE.CylinderGeometry(0.03, 0.03, 0.04, 20),
  goldBrassMaterial,
);
hornCap.rotation.x = Math.PI / 2;
wheelAssembly.add(hornCap);

// Inverted 3-spoke design (down, up-right, up-left) leaving top open for gauges
[-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6].forEach((angle) => {
  const spokeGroup = new THREE.Group();
  spokeGroup.rotation.z = angle;
  const spoke = new THREE.Mesh(
    new THREE.BoxGeometry(0.026, 0.13, 0.012),
    chromeMaterial,
  );
  spoke.position.y = 0.078;
  spokeGroup.add(spoke);
  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.018, 12),
    darkCockpitMaterial,
  );
  hole.position.y = 0.082;
  hole.rotation.x = Math.PI / 2;
  spokeGroup.add(hole);
  wheelAssembly.add(spokeGroup);
});
boat.add(wheelAssembly);

// 10. Foredeck Accessories & Hardware

// Teardrop Bow Navigation Light
const navLightGroup = new THREE.Group();
navLightGroup.position.set(0, 0.67, -2.35);
const navHousing = new THREE.Mesh(
  new THREE.SphereGeometry(0.042, 16, 12),
  chromeMaterial,
);
navHousing.scale.set(1, 0.7, 1.8);
navLightGroup.add(navHousing);
const redPortLight = new THREE.Mesh(
  new THREE.SphereGeometry(0.022, 10, 10),
  new THREE.MeshStandardMaterial({
    color: 0xff1122,
    emissive: 0xcc0011,
    emissiveIntensity: 0.8,
  }),
);
redPortLight.position.set(-0.025, 0.015, -0.02);
navLightGroup.add(redPortLight);
const greenStbdLight = new THREE.Mesh(
  new THREE.SphereGeometry(0.022, 10, 10),
  new THREE.MeshStandardMaterial({
    color: 0x00ee55,
    emissive: 0x009933,
    emissiveIntensity: 0.8,
  }),
);
greenStbdLight.position.set(0.025, 0.015, -0.02);
navLightGroup.add(greenStbdLight);
boat.add(navLightGroup);

// Dual Chrome Trumpet Air Horns
const hornGroup = new THREE.Group();
hornGroup.position.set(-0.28, 0.71, -1.05);
hornGroup.rotation.y = 0.08;
[-0.03, 0.03].forEach((offsetY, i) => {
  const hornTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012 + i * 0.003, 0.007, 0.22, 10),
    chromeMaterial,
  );
  hornTube.position.set(offsetY * 1.3, 0.02 + offsetY * 0.6, -0.04);
  hornTube.rotation.x = Math.PI / 2;
  hornGroup.add(hornTube);
  const hornBell = new THREE.Mesh(
    new THREE.ConeGeometry(0.028 + i * 0.004, 0.06, 12),
    chromeMaterial,
  );
  hornBell.position.set(offsetY * 1.3, 0.02 + offsetY * 0.6, -0.15);
  hornBell.rotation.x = -Math.PI / 2;
  hornGroup.add(hornBell);
});
boat.add(hornGroup);

// Dual Chrome Engine Cowl Vents
[-0.24, 0.24].forEach((x) => {
  const vent = new THREE.Mesh(
    new THREE.SphereGeometry(0.038, 12, 10),
    chromeMaterial,
  );
  vent.position.set(x, 0.71, -0.65);
  vent.scale.set(0.9, 0.6, 1.4);
  vent.rotation.x = -0.3;
  boat.add(vent);
});

// Chrome Mooring Cleats
[
  new THREE.Vector3(-0.32, 0.69, -1.75),
  new THREE.Vector3(0.32, 0.69, -1.75),
].forEach((pos) => {
  const cleat = new THREE.Group();
  cleat.position.copy(pos);
  const cleatBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.018, 0.05),
    chromeMaterial,
  );
  cleat.add(cleatBase);
  const cleatBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.015, 0.11),
    chromeMaterial,
  );
  cleatBar.position.y = 0.015;
  cleat.add(cleatBar);
  boat.add(cleat);
});

// Bow Flagstaff with Fluttering Yacht Club Pennant
const bowFlagGroup = new THREE.Group();
bowFlagGroup.position.set(0, 0.64, -2.52);
const flagPole = new THREE.Mesh(
  new THREE.CylinderGeometry(0.007, 0.01, 0.36, 8),
  chromeMaterial,
);
flagPole.position.y = 0.18;
flagPole.rotation.x = -0.18;
bowFlagGroup.add(flagPole);
const flagFinial = new THREE.Mesh(
  new THREE.SphereGeometry(0.016, 10, 10),
  goldBrassMaterial,
);
flagFinial.position.set(0, 0.36, 0.04);
bowFlagGroup.add(flagFinial);

const pennantGeo = new THREE.BufferGeometry();
pennantGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(
    [
      0, 0.34, 0.03,
      0, 0.22, 0.01,
      0.24, 0.28, 0.08,
    ],
    3,
  ),
);
pennantGeo.setIndex([0, 1, 2, 0, 2, 1]);
pennantGeo.computeVertexNormals();
const pennantMesh = new THREE.Mesh(
  pennantGeo,
  new THREE.MeshStandardMaterial({
    color: 0x1d4e89,
    roughness: 0.6,
    side: THREE.DoubleSide,
  }),
);
bowFlagGroup.add(pennantMesh);
boat.add(bowFlagGroup);

// Classic Red & White Ring Lifebuoy (Hanging inside cockpit side)
const lifebuoyGroup = new THREE.Group();
lifebuoyGroup.position.set(-0.48, 0.58, 0.05);
lifebuoyGroup.rotation.y = Math.PI / 2;
const buoyTorus = new THREE.Mesh(
  new THREE.TorusGeometry(0.11, 0.028, 12, 24),
  new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5 }),
);
lifebuoyGroup.add(buoyTorus);
for (let b = 0; b < 4; b += 1) {
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.111, 0.03, 10, 8, Math.PI / 6),
    new THREE.MeshStandardMaterial({ color: 0xdd2818, roughness: 0.4 }),
  );
  band.rotation.z = (b * Math.PI) / 2 - Math.PI / 12;
  lifebuoyGroup.add(band);
}
boat.add(lifebuoyGroup);

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

  const wheelTarget = -state.rudder * 0.82;
  const wheelResponse = 1 - Math.exp(-10 * dt);
  wheelAssembly.rotation.z = THREE.MathUtils.lerp(
    wheelAssembly.rotation.z,
    wheelTarget,
    wheelResponse,
  );

  // Dynamic Throttle Lever (Reflecting 0-5 throttle gear steps)
  const throttleTarget = -(state.throttleLevel / 5) * 0.48;
  throttleLever.rotation.x = THREE.MathUtils.lerp(
    throttleLever.rotation.x,
    throttleTarget,
    1 - Math.exp(-8 * dt),
  );

  // Dynamic Instrument Gauges (Needles)
  const speedRatio = state.speed / 8.5;
  speedGauge.needlePivot.rotation.z = -speedRatio * 2.3;
  rpmGauge.needlePivot.rotation.z =
    -( (state.throttleLevel / 5) * 0.72 + speedRatio * 0.28 ) * 2.4;
  headingGauge.needlePivot.rotation.z =
    -((state.heading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  // Fluttering bow pennant flag
  const flutterFreq = 5.5 + state.speed * 1.4;
  pennantMesh.rotation.y = Math.sin(state.time * flutterFreq) * 0.22;
  pennantMesh.rotation.z = Math.cos(state.time * flutterFreq * 0.8) * 0.12;

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
  const boatSpeedRatio =
    state.speed / throttleSpeeds[throttleSpeeds.length - 1];
  boat.rotation.z =
    -state.rudder * (0.025 + boatSpeedRatio * 0.05) +
    Math.sin(state.time * 1.2) * 0.018;

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
