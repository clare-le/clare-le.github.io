import * as THREE from '../three.js';

export function createHull({ materials }) {
  const { mahoganyMaterial, teakDeckMaterial, creamStripeMaterial, hullNavyMaterial, chromeMaterial, leatherCockpitMaterial, cockpitSideMaterial, darkCockpitMaterial } = materials;
  const boat = new THREE.Group();
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

  // 4. Continuous cockpit shell: dashboard, sides, floor, and edge trim.
  const cockpitShellGeometry = new THREE.BufferGeometry();
  cockpitShellGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -0.6, 0.82, -0.3,  // 0 front-left outer top
        0.6, 0.82, -0.3,   // 1 front-right outer top
        -0.48, 0.5, -0.05, // 2 front-left floor seam
        0.48, 0.5, -0.05,  // 3 front-right floor seam
        -0.68, 0.56, 1.5,  // 4 rear-left outer top
        0.68, 0.56, 1.5,   // 5 rear-right outer top
        -0.46, 0.44, 1.5,  // 6 rear-left floor seam
        0.46, 0.44, 1.5,   // 7 rear-right floor seam
        -0.54, 0.77, -0.26, // 8 front-left inner trim
        -0.54, 0.51, 1.48, // 9 rear-left inner trim
        0.54, 0.77, -0.26, // 10 front-right inner trim
        0.54, 0.51, 1.48,  // 11 rear-right inner trim
      ],
      3,
    ),
  );
  cockpitShellGeometry.setIndex([
    0, 2, 1, 1, 2, 3,       // dashboard
    0, 4, 2, 4, 6, 2,       // left side
    1, 3, 5, 5, 3, 7,       // right side
    2, 6, 3, 6, 7, 3,       // floor
    0, 8, 4, 4, 8, 9,       // left trim
    1, 5, 10, 5, 11, 10,    // right trim
  ]);
  cockpitShellGeometry.addGroup(0, 6, 0);
  cockpitShellGeometry.addGroup(6, 6, 1);
  cockpitShellGeometry.addGroup(12, 6, 1);
  cockpitShellGeometry.addGroup(18, 6, 2);
  cockpitShellGeometry.addGroup(24, 6, 3);
  cockpitShellGeometry.addGroup(30, 6, 3);
  cockpitShellGeometry.computeVertexNormals();
  const cockpitShell = new THREE.Mesh(cockpitShellGeometry, [
    mahoganyMaterial,
    cockpitSideMaterial,
    darkCockpitMaterial,
    leatherCockpitMaterial,
  ]);
  boat.add(cockpitShell);

  // Chrome Bow Stem Guard
  const bowStemCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.04, 0.32, 8),
    chromeMaterial,
  );
  bowStemCap.position.set(0, 0.48, -2.55);
  boat.add(bowStemCap);

  return {
    root: boat,
    anchors: {
      helm: [0, 0, 0], windshield: [0, 0, 0], hardware: [0, 0, 0],
      flag: [0, 0.63, -2.55],
    },
    profile: {
      camera: { distance: 1.45, height: 1.5, lookAhead: 13, lookHeight: -1.15 },
      spray: { forward: 2.45, halfWidth: 0.32 },
      waterline: 0.18,
      physics: {
        lengthMeters: 4.1,
        beamMeters: 1.36,
        hullCenterForwardMeters: 0.53,
        massKg: 820,
        enginePowerKw: 74.6,
        idleRpm: 750,
        maxRpm: 5200,
        fuelCapacityLiters: 95,
        fullLoadFuelLitersPerHour: 28,
        maxSpeedKnots: 24,
        reverseSpeedKnots: 4.5,
        reverseThrustFactor: 0.8,
        anchorBrakeResponse: 1.5,
        propulsionFactor: 1,
        decelerationResponse: 0.72,
        throttleCurve: [0, 0.16, 0.34, 0.54, 0.76, 1],
        rudderResponse: 7,
        minSteerageKnots: 1.1,
        turnRateAtMax: 0.65,
        motion: {
          heave: 0.085,
          heaveFrequency: 2.1,
          pitch: 0.032,
          pitchFrequency: 1.65,
          accelerationPitch: 0.008,
          heel: 0.072,
          roll: 0.018,
          cameraHeave: 0.045,
        },
      },
    },
  };
}
