import * as THREE from "../three.js";
import { box, strut, panel } from "./geometry.js";

export function createCargoHull(materials) {
  const root = new THREE.Group();
  root.name = "cargo-hull";
  const { hull, deck, cabin, consolePaint, floor, metal, glass, seal, safety, screen } = materials;

  // Deck, hull walls, and bow use the same outline.
  const outline = [[-0.93, 1.95], [0.93, 1.95], [0.93, -3.9],
    [0.52, -4.8], [0, -5.15], [-0.52, -4.8], [-0.93, -3.9]];
  const vertices = outline.flatMap(([x, z]) => [x, 0.43, z]);
  vertices.push(...outline.flatMap(([x, z]) => [x * 0.75, -0.12, z * 0.98]));
  const indices = [];
  for (let i = 1; i < outline.length - 1; i += 1) indices.push(0, i, i + 1);
  const deckIndexCount = indices.length;
  for (let i = 0; i < outline.length; i += 1) {
    const next = (i + 1) % outline.length;
    indices.push(i, i + 7, next, next, i + 7, next + 7);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.addGroup(0, deckIndexCount, 0);
  geometry.addGroup(deckIndexCount, indices.length - deckIndexCount, 1);
  geometry.computeVertexNormals();
  root.add(new THREE.Mesh(geometry, [deck, hull]));

  // The helm fascia, side walls, floor, and sill form one connected interior shell.
  const shell = new THREE.BufferGeometry();
  shell.setAttribute("position", new THREE.Float32BufferAttribute([
    -0.9, 1.04, -0.35, 0.9, 1.04, -0.35,
    -0.9, 0.445, -0.2, 0.9, 0.445, -0.2,
    -0.9, 1.04, 1.95, 0.9, 1.04, 1.95,
    -0.9, 0.445, 1.95, 0.9, 0.445, 1.95,
    -0.9, 1.04, -0.7, 0.9, 1.04, -0.7,
  ], 3));
  shell.setIndex([
    0, 2, 1, 1, 2, 3,
    0, 4, 2, 4, 6, 2, 1, 3, 5, 5, 3, 7,
    2, 6, 3, 6, 7, 3,
    8, 0, 9, 9, 0, 1,
  ]);
  shell.addGroup(0, 6, 0);
  shell.addGroup(6, 12, 1);
  shell.addGroup(18, 6, 2);
  shell.addGroup(24, 6, 2);
  shell.computeVertexNormals();
  const interior = new THREE.Mesh(shell, [consolePaint, cabin, floor]);
  interior.name = "connected-cabin-shell";
  root.add(interior);

  const bottomY = 1.04, topY = 2.12, frontZ = -0.7, browZ = -0.54, rearZ = 1.95;
  const posts = [-0.9, -0.32, 0.32, 0.9];
  for (let i = 0; i < posts.length - 1; i += 1) {
    const left = posts[i], right = posts[i + 1];
    panel(root, glass, [[left, bottomY, frontZ], [right, bottomY, frontZ],
      [right, topY, browZ], [left, topY, browZ]]);
  }
  for (const x of posts) {
    strut(root, seal, [x, bottomY, frontZ], [x, topY, browZ], 0.031);
    strut(root, cabin, [x, bottomY, frontZ + 0.006], [x, topY, browZ + 0.006], 0.022);
  }
  strut(root, cabin, [-0.9, bottomY, frontZ], [0.9, bottomY, frontZ], 0.044);
  strut(root, cabin, [-0.9, topY, browZ], [0.9, topY, browZ], 0.055);
  for (const x of [-0.9, 0.9]) {
    panel(root, glass, [[x, bottomY, frontZ], [x, bottomY, rearZ],
      [x, topY, rearZ], [x, topY, browZ]]);
    strut(root, cabin, [x, bottomY, frontZ], [x, bottomY, rearZ], 0.045);
    strut(root, cabin, [x, topY, browZ], [x, topY, rearZ], 0.045);
    strut(root, cabin, [x, bottomY, rearZ], [x, topY, rearZ], 0.045);
    strut(root, cabin, [x, bottomY, 0.65], [x, topY, 0.65], 0.025);
  }
  box(root, cabin, [1.92, 0.075, 2.59], [0, topY + 0.025, 0.705]);
  box(root, screen, [0.2, 0.012, 0.07], [0, topY - 0.023, -0.1]);

  // Closed hatch and continuous low bulwarks give the window a cargo-deck view.
  box(root, safety, [1.25, 0.035, 2.22], [0, 0.452, -2.65]);
  box(root, hull, [1.18, 0.19, 2.15], [0, 0.535, -2.65]);
  box(root, deck, [1.22, 0.045, 2.19], [0, 0.652, -2.65]);
  for (const z of [-3.45, -2.95, -2.45, -1.95]) {
    box(root, metal, [1.15, 0.015, 0.022], [0, 0.681, z]);
  }
  for (const side of [-1, 1]) {
    const bulwarkOutline = [
      [side * 0.93, 0.43, -0.72],
      [side * 0.93, 0.43, -3.9],
      [side * 0.52, 0.43, -4.8],
      [0, 0.43, -5.15],
    ];
    for (let i = 0; i < bulwarkOutline.length - 1; i += 1) {
      const a = bulwarkOutline[i];
      const b = bulwarkOutline[i + 1];
      panel(root, hull, [a, b, [b[0], 0.69, b[2]], [a[0], 0.69, a[2]]]);
      strut(root, metal, [a[0], 0.69, a[2]], [b[0], 0.69, b[2]], 0.019);
    }
    box(root, metal, [0.16, 0.035, 0.075], [side * 0.42, 0.45, -4.6]);
    strut(root, metal, [side * 0.42, 0.45, -4.6], [side * 0.42, 0.57, -4.6], 0.022);
    strut(root, metal, [side * 0.42 - 0.08, 0.57, -4.6], [side * 0.42 + 0.08, 0.57, -4.6], 0.018);
  }
  return {
    root,
    profile: {
      camera: { distance: 1.65, height: 1.72, lookAhead: 14, lookHeight: -0.65 },
      spray: { forward: 4.8, halfWidth: 0.5 },
      waterline: 0.18,
      physics: {
        lengthMeters: 7.1,
        beamMeters: 1.86,
        hullCenterForwardMeters: 1.6,
        massKg: 4800,
        enginePowerKw: 110,
        maxSpeedKnots: 10.5,
        reverseSpeedKnots: 3.5,
        reverseThrustFactor: 0.85,
        anchorBrakeResponse: 0.65,
        propulsionFactor: 0.75,
        decelerationResponse: 0.22,
        throttleCurve: [0, 0.14, 0.31, 0.52, 0.75, 1],
        rudderResponse: 3,
        minSteerageKnots: 1.8,
        turnRateAtMax: 0.23,
        motion: {
          heave: 0.038,
          heaveFrequency: 1.35,
          pitch: 0.011,
          pitchFrequency: 1.05,
          accelerationPitch: 0.003,
          heel: 0.026,
          roll: 0.007,
          cameraHeave: 0.018,
        },
      },
    },
  };
}
