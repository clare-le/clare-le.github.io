import * as THREE from "../three.js";
import { box, panel, strut } from "../cargo/geometry.js";

function createHullGeometry(outline) {
  const top = outline.flatMap(([x, z]) => [x, 0.52, z]);
  const bottom = outline.flatMap(([x, z]) => [x * 0.72, -0.72, z * 0.985]);
  const vertices = [...top, ...bottom];
  const indices = [];
  for (let i = 1; i < outline.length - 1; i += 1) indices.push(0, i, i + 1);
  const deckIndexCount = indices.length;
  for (let i = 0; i < outline.length; i += 1) {
    const next = (i + 1) % outline.length;
    indices.push(i, i + outline.length, next);
    indices.push(next, i + outline.length, next + outline.length);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.addGroup(0, deckIndexCount, 0);
  geometry.addGroup(deckIndexCount, indices.length - deckIndexCount, 1);
  geometry.computeVertexNormals();
  return geometry;
}

export function createYachtHull(materials) {
  const root = new THREE.Group();
  root.name = "yacht-hull";
  const {
    hull, hullAccent, deck, teak, cabin, upholstery, trim, metal, glass, seal,
  } = materials;
  const outline = [
    [-2.05, 3.35], [2.05, 3.35], [2.05, 0.65], [1.88, -5.7],
    [1.28, -9.45], [0, -12.45], [-1.28, -9.45], [-1.88, -5.7], [-2.05, 0.65],
  ];
  const hullMesh = new THREE.Mesh(createHullGeometry(outline), [deck, hull]);
  hullMesh.name = "connected-yacht-hull";
  root.add(hullMesh);

  // A continuous sheer stripe makes the long planing hull read as one form.
  for (const side of [-1, 1]) {
    panel(root, hullAccent, [
      [side * 2.055, 0.35, 2.95], [side * 2.055, 0.35, -4.9],
      [side * 1.5, 0.24, -8.75], [side * 1.82, 0.24, -5.2],
    ]);
  }

  // Teak foredeck, sun pad, and center seam remain low for an unobstructed helm view.
  panel(root, teak, [
    [-1.48, 0.535, -0.85], [1.48, 0.535, -0.85],
    [0.92, 0.535, -8.75], [-0.92, 0.535, -8.75],
  ]);
  for (const x of [-0.48, 0, 0.48]) {
    strut(root, trim, [x, 0.548, -1.05], [x * 0.55, 0.548, -8.1], 0.009);
  }
  const sunPad = box(root, upholstery, [1.75, 0.09, 2.15], [0, 0.605, -3.1]);
  sunPad.rotation.x = -0.025;
  for (const x of [-0.57, 0, 0.57]) {
    box(root, trim, [0.018, 0.014, 1.98], [x, 0.658, -3.1]);
  }

  // The cockpit floor, coaming, fascia sill, and side decks overlap into a closed shell.
  box(root, teak, [3.38, 0.09, 3.85], [0, 0.585, 1.22]);
  box(root, cabin, [3.78, 0.26, 0.42], [0, 0.73, -0.58]);
  for (const side of [-1, 1]) {
    box(root, cabin, [0.27, 0.5, 3.98], [side * 1.89, 0.78, 1.26]);
    box(root, upholstery, [0.34, 0.16, 2.05], [side * 1.64, 0.88, 1.36]);
    box(root, trim, [0.37, 0.025, 2.08], [side * 1.64, 0.97, 1.36]);
  }
  box(root, upholstery, [2.55, 0.58, 0.24], [0, 0.93, 3.02]);
  box(root, upholstery, [2.55, 0.18, 0.72], [0, 0.69, 2.77]);

  // Three-piece raked windshield and side glass form a wraparound cockpit enclosure.
  const windshieldBottom = 1.02;
  const windshieldTop = 2.3;
  const frontZ = -0.5;
  const topZ = 0.08;
  const posts = [-1.78, -0.57, 0.57, 1.78];
  for (let i = 0; i < posts.length - 1; i += 1) {
    panel(root, glass, [
      [posts[i], windshieldBottom, frontZ], [posts[i + 1], windshieldBottom, frontZ],
      [posts[i + 1] * 0.94, windshieldTop, topZ], [posts[i] * 0.94, windshieldTop, topZ],
    ]);
  }
  for (const x of posts) {
    strut(root, seal, [x, windshieldBottom, frontZ],
      [x * 0.94, windshieldTop, topZ], 0.033);
    strut(root, metal, [x, windshieldBottom, frontZ + 0.012],
      [x * 0.94, windshieldTop, topZ + 0.012], 0.014);
  }
  strut(root, seal, [-1.78, windshieldBottom, frontZ],
    [1.78, windshieldBottom, frontZ], 0.042);
  strut(root, seal, [-1.68, windshieldTop, topZ], [1.68, windshieldTop, topZ], 0.05);
  for (const side of [-1, 1]) {
    panel(root, glass, [
      [side * 1.78, windshieldBottom, frontZ], [side * 1.9, 0.98, 2.15],
      [side * 1.72, 2.08, 2.05], [side * 1.68, windshieldTop, topZ],
    ]);
    strut(root, seal, [side * 1.78, windshieldBottom, frontZ],
      [side * 1.9, 0.98, 2.15], 0.038);
    strut(root, seal, [side * 1.68, windshieldTop, topZ],
      [side * 1.72, 2.08, 2.05], 0.038);
  }

  // A high panoramic roof closes the cockpit while preserving the forward view.
  const roofY = 2.43;
  panel(root, glass, [
    [-1.64, roofY, 0.08], [1.64, roofY, 0.08],
    [1.72, roofY, 2.78], [-1.72, roofY, 2.78],
  ]);
  box(root, cabin, [3.5, 0.1, 0.16], [0, roofY + 0.02, 0.04]);
  for (const side of [-1, 1]) {
    strut(root, cabin, [side * 1.68, roofY, 0.06],
      [side * 1.76, roofY, 2.78], 0.045);
    strut(root, metal, [side * 1.88, 0.98, 1.48],
      [side * 1.72, roofY, 1.48], 0.027);
  }

  // Stainless bow rails follow the hull rather than floating beside it.
  for (const side of [-1, 1]) {
    const rail = [
      [side * 1.83, 0.58, -1.0], [side * 1.72, 0.74, -4.8],
      [side * 1.18, 0.69, -8.85], [0, 0.64, -11.7],
    ];
    for (let i = 0; i < rail.length - 1; i += 1) {
      strut(root, metal, rail[i], rail[i + 1], 0.018);
    }
    for (const point of rail.slice(0, -1)) {
      strut(root, metal, [point[0], 0.54, point[2]], point, 0.015);
    }
  }

  return {
    root,
    profile: {
      camera: { distance: 2.55, height: 1.77, lookAhead: 24, lookHeight: 0.12 },
      spray: { forward: 11.45, halfWidth: 0.92 },
      waterline: 0.34,
      physics: {
        lengthMeters: 15.8,
        beamMeters: 4.1,
        hullCenterForwardMeters: 4.55,
        massKg: 18500,
        enginePowerKw: 2684,
        idleRpm: 650,
        maxRpm: 3600,
        fuelCapacityLiters: 1800,
        fullLoadFuelLitersPerHour: 480,
        maxSpeedKnots: 70,
        reverseSpeedKnots: 10,
        reverseThrustFactor: 0.72,
        anchorBrakeResponse: 0.9,
        propulsionFactor: 1.35,
        decelerationResponse: 0.3,
        throttleCurve: [0, 0.12, 0.28, 0.5, 0.74, 1],
        rudderResponse: 4.2,
        minSteerageKnots: 1.5,
        turnRateAtMax: 0.19,
        motion: {
          heave: 0.026,
          heaveFrequency: 1.65,
          pitch: 0.009,
          pitchFrequency: 1.3,
          accelerationPitch: 0.0022,
          heel: 0.052,
          roll: 0.008,
          cameraHeave: 0.016,
        },
      },
    },
  };
}
