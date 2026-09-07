import * as THREE from "../boats/three.js";
import { createPortAssetLibrary } from "./port-assets.js";

export const KAOHSIUNG_PORT_LAYOUT = Object.freeze([
  {
    id: "qijin-container-terminal",
    name: "旗津貨櫃碼頭",
    longitude: 120.278,
    latitude: 22.6155,
    rotationDegrees: -38,
    quay: { width: 74, depth: 68 },
    cranes: [-24, 0, 24],
    yards: [
      { x: -18, z: 13, columns: 6, rows: 3, tiers: 5, seed: 1 },
      { x: 19, z: 13, columns: 6, rows: 3, tiers: 4, seed: 3 },
    ],
    buildings: [
      { x: -27, z: 26, width: 17, height: 8, depth: 9, warehouse: true },
      { x: 25, z: 27, width: 12, height: 11, depth: 8 },
    ],
  },
  {
    id: "mainland-container-terminal",
    name: "前鎮貨櫃碼頭",
    longitude: 120.2915,
    latitude: 22.6085,
    rotationDegrees: 42,
    quay: { width: 58, depth: 68 },
    cranes: [-15, 15],
    yards: [
      { x: 0, z: 13, columns: 7, rows: 3, tiers: 5, seed: 6 },
    ],
    buildings: [
      { x: -19, z: 27, width: 15, height: 7, depth: 9, warehouse: true },
      { x: 20, z: 25, width: 10, height: 13, depth: 8 },
    ],
  },
]);

function createTerminal(library, layout, projectCoordinates) {
  const root = new THREE.Group();
  root.name = layout.id;
  const projected = projectCoordinates(layout.longitude, layout.latitude);
  root.position.set(projected.x, 0, projected.z);
  root.rotation.y = THREE.MathUtils.degToRad(layout.rotationDegrees);
  const quay = library.createQuay(layout.quay);
  const surfaceY = quay.userData.surfaceY;
  root.add(quay);

  layout.cranes.forEach((x, index) => {
    const crane = library.createGantryCrane({
      height: index % 2 ? 25 : 23,
      span: 17,
      depth: 7,
      boom: 20,
    });
    crane.name = `${layout.id}-gantry-${index + 1}`;
    crane.position.set(x, surfaceY, -layout.quay.depth / 2 + 4.5);
    root.add(crane);
  });
  layout.yards.forEach((yard, index) => {
    const containers = library.createContainerYard(yard);
    containers.name = `${layout.id}-containers-${index + 1}`;
    containers.position.set(yard.x, surfaceY, yard.z);
    root.add(containers);
  });
  layout.buildings.forEach((building, index) => {
    const structure = library.createPortBuilding(building);
    structure.name = `${layout.id}-building-${index + 1}`;
    structure.position.set(building.x, surfaceY, building.z);
    root.add(structure);
  });
  return root;
}

function terminalCollisionRing(terminal, layout) {
  const halfWidth = layout.quay.width / 2;
  const halfDepth = layout.quay.depth / 2;
  terminal.updateMatrixWorld(true);
  const corners = [
    [-halfWidth, -halfDepth],
    [halfWidth, -halfDepth],
    [halfWidth, halfDepth],
    [-halfWidth, halfDepth],
    [-halfWidth, -halfDepth],
  ];
  return {
    id: `${layout.id}-apron`,
    name: `${layout.name}碼頭陸地`,
    ring: corners.map(([x, z]) => {
      const point = new THREE.Vector3(x, 0, z).applyMatrix4(terminal.matrixWorld);
      return { x: point.x, z: point.z };
    }),
  };
}

export function createKaohsiungPort(projectCoordinates, assetLibrary = createPortAssetLibrary()) {
  const root = new THREE.Group();
  root.name = "kaohsiung-port";
  const terminals = KAOHSIUNG_PORT_LAYOUT.map((layout) => {
    const terminal = createTerminal(assetLibrary, layout, projectCoordinates);
    root.add(terminal);
    return terminal;
  });
  return {
    root,
    facilities: KAOHSIUNG_PORT_LAYOUT.map(({ id, name, longitude, latitude }) => ({
      id, name, longitude, latitude,
    })),
    collisionRings: terminals.map((terminal, index) => (
      terminalCollisionRing(terminal, KAOHSIUNG_PORT_LAYOUT[index])
    )),
    assetLibrary,
  };
}
