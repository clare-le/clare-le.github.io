import * as THREE from "../boats/three.js";
import { createPortAssetLibrary } from "./port-assets.js";

export const KAOHSIUNG_PORT_LAYOUT = Object.freeze([
  {
    id: "kaohsiung-container-yard",
    name: "高雄港貨櫃區",
    longitude: 120.28,
    latitude: 22.603,
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
      [120.27171, 22.61849],
      [120.27336, 22.61597],
      [120.27492, 22.61345],
      [120.27648, 22.61094],
      [120.27804, 22.60842],
      [120.27960, 22.60590],
      [120.28116, 22.60338],
      [120.28281, 22.60086],
      [120.28437, 22.59835],
      [120.28593, 22.59583],
    ],
  },
  {
    id: "east-bank-cranes",
    name: "港內東岸吊機",
    rotationDegrees: 90,
    sites: [
      [120.29248, 22.62658],
      [120.29520, 22.62389],
      [120.29803, 22.62119],
      [120.30076, 22.61849],
      [120.30348, 22.61579],
      [120.30621, 22.61309],
      [120.30894, 22.61040],
      [120.31176, 22.60770],
      [120.31449, 22.60500],
      [120.31722, 22.60230],
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
