import * as THREE from "../boats/three.js";
import { PENGHU_MAIN, TAIWAN_MAIN } from "./coast-data.js";

export const MAP_COMPRESSION = 10;
export const KAOHSIUNG_SPAWN = Object.freeze({
  latitude: 22.605,
  longitude: 120.287,
  headingDegrees: 315,
});

const earthRadiusMeters = 6371008.8;
const radians = Math.PI / 180;
const originLatitudeRadians = KAOHSIUNG_SPAWN.latitude * radians;
const longitudeScale = earthRadiusMeters * Math.cos(originLatitudeRadians) * radians;
const latitudeScale = earthRadiusMeters * radians;
const nearCoastMeters = 2000;
const openWaterMeters = 12000;

const landMasses = [
  { id: "taiwan", name: "台灣本島", coordinates: TAIWAN_MAIN },
  { id: "penghu", name: "澎湖本島", coordinates: PENGHU_MAIN },
];

export function projectCoordinates(longitude, latitude) {
  return {
    x: (longitude - KAOHSIUNG_SPAWN.longitude) * longitudeScale / MAP_COMPRESSION,
    z: -(latitude - KAOHSIUNG_SPAWN.latitude) * latitudeScale / MAP_COMPRESSION,
  };
}

export function coordinatesFromWorld(x, z) {
  return {
    latitude: KAOHSIUNG_SPAWN.latitude - z * MAP_COMPRESSION / latitudeScale,
    longitude: KAOHSIUNG_SPAWN.longitude + x * MAP_COMPRESSION / longitudeScale,
  };
}

export function navigationMultiplier(distanceToCoastMeters) {
  const t = THREE.MathUtils.clamp(
    (distanceToCoastMeters - nearCoastMeters) / (openWaterMeters - nearCoastMeters),
    0,
    1,
  );
  const smooth = t * t * (3 - 2 * t);
  return 1 + 9 * smooth;
}

function projectedRing(coordinates) {
  return coordinates.map(([longitude, latitude]) => projectCoordinates(longitude, latitude));
}

function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, previous = ring.length - 1; i < ring.length; previous = i, i += 1) {
    const a = ring[i];
    const b = ring[previous];
    if ((a.z > z) !== (b.z > z)
      && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function nearestPointOnSegment(x, z, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0 ? 0 : THREE.MathUtils.clamp(
    ((x - a.x) * dx + (z - a.z) * dz) / lengthSquared,
    0,
    1,
  );
  const pointX = a.x + dx * t;
  const pointZ = a.z + dz * t;
  return { x: pointX, z: pointZ, distance: Math.hypot(x - pointX, z - pointZ) };
}

function createLandMesh(ring, index) {
  const shape = new THREE.Shape();
  ring.forEach((point, pointIndex) => {
    const method = pointIndex === 0 ? "moveTo" : "lineTo";
    shape[method](point.x, -point.z);
  });
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: index === 0 ? 1.45 : 0.9,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, [
    new THREE.MeshStandardMaterial({
      color: index === 0 ? 0x4f8156 : 0x66885a,
      roughness: 0.94,
      flatShading: true,
    }),
    new THREE.MeshStandardMaterial({
      color: 0xc7aa68,
      roughness: 0.9,
      flatShading: true,
    }),
  ]);
  mesh.name = landMasses[index].id;

  const coastGeometry = new THREE.BufferGeometry().setFromPoints(
    ring.map((point) => new THREE.Vector3(point.x, index === 0 ? 1.47 : 0.92, point.z)),
  );
  const coast = new THREE.LineLoop(
    coastGeometry,
    new THREE.LineBasicMaterial({ color: 0xe0c57e, transparent: true, opacity: 0.88 }),
  );
  coast.name = `${landMasses[index].id}-shoreline`;

  const group = new THREE.Group();
  group.add(mesh, coast);
  return group;
}

function addHarborBuoys(root) {
  const channel = [
    [120.2830, 22.6090],
    [120.2790, 22.6130],
    [120.2750, 22.6170],
    [120.2710, 22.6210],
    [120.2660, 22.6210],
    [120.2610, 22.6210],
  ];
  channel.forEach(([longitude, latitude], index) => {
    const center = projectCoordinates(longitude, latitude);
    const nextCoordinates = channel[Math.min(index + 1, channel.length - 1)];
    const previousCoordinates = channel[Math.max(index - 1, 0)];
    const next = projectCoordinates(...nextCoordinates);
    const previous = projectCoordinates(...previousCoordinates);
    const length = Math.max(0.001, Math.hypot(next.x - previous.x, next.z - previous.z));
    const sideX = -(next.z - previous.z) / length;
    const sideZ = (next.x - previous.x) / length;

    [-1, 1].forEach((side) => {
      const buoy = new THREE.Group();
      const color = side < 0 ? 0xd84b43 : 0x3d9f70;
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, 0.5, 8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.62 }),
      );
      body.position.y = 0.26;
      const top = new THREE.Mesh(
        new THREE.ConeGeometry(0.11, 0.22, 8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.62 }),
      );
      top.position.y = 0.62;
      buoy.add(body, top);
      buoy.position.set(center.x + sideX * 4.5, 0, center.z + sideZ * 4.5);
      buoy.name = `kaohsiung-channel-buoy-${index}-${side}`;
      root.add(buoy);
    });
  });
}

export function createCoastalWorld() {
  const root = new THREE.Group();
  root.name = "taiwan-coastal-world";
  const rings = landMasses.map((land, index) => {
    const ring = projectedRing(land.coordinates);
    root.add(createLandMesh(ring, index));
    return { ...land, ring };
  });
  addHarborBuoys(root);

  function closestShore(x, z) {
    let closest = null;
    for (const land of rings) {
      const inside = pointInRing(x, z, land.ring);
      for (let i = 0; i < land.ring.length - 1; i += 1) {
        const candidate = nearestPointOnSegment(x, z, land.ring[i], land.ring[i + 1]);
        if (closest && candidate.distance >= closest.distanceWorldMeters) continue;
        const distance = Math.max(candidate.distance, 0.0001);
        const direction = inside ? -1 : 1;
        closest = {
          landId: land.id,
          landName: land.name,
          insideLand: inside,
          distanceWorldMeters: candidate.distance,
          distanceActualMeters: candidate.distance * MAP_COMPRESSION,
          signedDistanceWorldMeters: candidate.distance * direction,
          normalX: (x - candidate.x) / distance * direction,
          normalZ: (z - candidate.z) / distance * direction,
          pointX: candidate.x,
          pointZ: candidate.z,
        };
      }
    }
    return closest;
  }

  return {
    root,
    rings,
    closestShore,
    coordinatesFromWorld,
    navigationMultiplier,
    mapCompression: MAP_COMPRESSION,
    spawn: KAOHSIUNG_SPAWN,
  };
}
