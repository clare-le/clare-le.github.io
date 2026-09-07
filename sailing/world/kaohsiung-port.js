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
    cranes: [-18, 0, 18],
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

export function createKaohsiungPort(projectCoordinates, assetLibrary = createPortAssetLibrary()) {
  const root = new THREE.Group();
  root.name = "kaohsiung-port";
  KAOHSIUNG_PORT_LAYOUT.forEach((layout) => {
    const terminal = createTerminal(assetLibrary, layout, projectCoordinates);
    root.add(terminal);
  });
  return {
    root,
    facilities: KAOHSIUNG_PORT_LAYOUT.map(({ id, name, longitude, latitude }) => ({
      id, name, longitude, latitude,
    })),
    assetLibrary,
  };
}
