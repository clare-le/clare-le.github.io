import * as THREE from "../boats/three.js";
import { createPortAssetLibrary } from "./port-assets.js";

export const KAOHSIUNG_PORT_LAYOUT = Object.freeze([
  {
    id: "kaohsiung-container-yard",
    name: "高雄港貨櫃區",
    longitude: 120.31,
    latitude: 22.61,
    rotationDegrees: -60,
    quay: { width: 58, depth: 52 },
    cranes: [],
    yards: [
      { x: -18, z: 9, columns: 6, rows: 3, tiers: 5, seed: 1 },
      { x: 18, z: 9, columns: 6, rows: 3, tiers: 4, seed: 3 },
    ],
    buildings: [
      { x: -19, z: 20, width: 15, height: 8, depth: 9, warehouse: true },
      { x: 20, z: 20, width: 12, height: 11, depth: 8 },
    ],
  },
]);

export const KAOHSIUNG_CRANE_BANKS = Object.freeze([
  {
    id: "west-bank-cranes",
    name: "港內西岸吊機",
    rotationDegrees: -90,
    sites: [
      [120.26770, 22.61400],
      [120.27144, 22.61000],
      [120.27834, 22.60600],
      [120.27770, 22.60200],
      [120.28064, 22.59800],
      [120.28260, 22.59400],
      [120.28690, 22.59000],
      [120.28988, 22.58600],
      [120.29284, 22.58200],
      [120.29646, 22.57800],
    ],
  },
  {
    id: "east-bank-cranes",
    name: "港內東岸吊機",
    rotationDegrees: 90,
    sites: [
      [120.29240, 22.62600],
      [120.29240, 22.62200],
      [120.29344, 22.61800],
      [120.29240, 22.61400],
      [120.29742, 22.61000],
      [120.29764, 22.60600],
      [120.29240, 22.60200],
      [120.29240, 22.59800],
      [120.29270, 22.59400],
      [120.29526, 22.59000],
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

function createCraneBank(library, bank, projectCoordinates) {
  const root = new THREE.Group();
  root.name = bank.id;
  bank.sites.forEach(([longitude, latitude], index) => {
    const position = projectCoordinates(longitude, latitude);
    const crane = library.createGantryCrane({
      height: 21 + index % 3 * 2,
      span: 17,
      depth: 7,
      boom: 18,
    });
    crane.name = `${bank.id}-gantry-${index + 1}`;
    crane.position.set(position.x, 1.48, position.z);
    crane.rotation.y = THREE.MathUtils.degToRad(bank.rotationDegrees);
    root.add(crane);
  });
  root.userData.craneCount = bank.sites.length;
  return root;
}

export function createKaohsiungPort(projectCoordinates, assetLibrary = createPortAssetLibrary()) {
  const root = new THREE.Group();
  root.name = "kaohsiung-port";
  KAOHSIUNG_PORT_LAYOUT.forEach((layout) => {
    const terminal = createTerminal(assetLibrary, layout, projectCoordinates);
    root.add(terminal);
  });
  KAOHSIUNG_CRANE_BANKS.forEach((bank) => {
    root.add(createCraneBank(assetLibrary, bank, projectCoordinates));
  });
  return {
    root,
    facilities: KAOHSIUNG_PORT_LAYOUT.map(({ id, name, longitude, latitude }) => ({
      id, name, longitude, latitude,
    })),
    assetLibrary,
  };
}
