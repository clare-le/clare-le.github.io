import * as THREE from "../boats/three.js";
import { isPointOnMappedLand, projectCoordinates } from "./geography.js";
import {
  createKaohsiungPort,
  KAOHSIUNG_CRANE_BANKS,
  KAOHSIUNG_PORT_LAYOUT,
} from "./kaohsiung-port.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function runPortAssetTests() {
  const port = createKaohsiungPort(projectCoordinates);
  const containerMeshes = [];
  const cranes = [];
  const buildings = [];

  port.root.traverse((object) => {
    if (object instanceof THREE.InstancedMesh && object.name.startsWith("container-stack")) {
      containerMeshes.push(object);
    }
    if (object.name.includes("-gantry-")) cranes.push(object);
    if (object.name.includes("-building-")) buildings.push(object);
  });

  assert(port.root.children.length === 3,
    "Kaohsiung should have one terminal and two crane banks");
  assert(KAOHSIUNG_CRANE_BANKS.every((bank) => bank.sites.length === 10),
    "each harbor bank should contain ten gantry cranes");
  assert(cranes.length === 20, "Kaohsiung should reuse twenty gantry cranes");
  assert(buildings.length === 2, "Kaohsiung should reuse two port buildings");
  assert(containerMeshes.length > 3, "container stacks should be color-batched instanced meshes");
  assert(
    new Set(containerMeshes.map((mesh) => mesh.geometry)).size === 1,
    "all container stacks should share one geometry",
  );
  assert(
    containerMeshes.every((mesh) => mesh.instanceMatrix.count > 0),
    "every container batch should contain instances",
  );
  assert(
    port.facilities.every((facility) => Number.isFinite(facility.longitude)
      && Number.isFinite(facility.latitude)),
    "port layouts should retain WGS84 coordinates",
  );
  KAOHSIUNG_PORT_LAYOUT.forEach((layout) => {
    const halfWidth = layout.quay.width / 2;
    const halfDepth = layout.quay.depth / 2;
    const center = projectCoordinates(layout.longitude, layout.latitude);
    const rotation = THREE.MathUtils.degToRad(layout.rotationDegrees);
    for (let xStep = -5; xStep <= 5; xStep += 1) {
      for (let zStep = -5; zStep <= 5; zStep += 1) {
        const x = xStep * layout.quay.width / 10;
        const z = zStep * layout.quay.depth / 10;
        const worldX = center.x + Math.cos(rotation) * x + Math.sin(rotation) * z;
        const worldZ = center.z - Math.sin(rotation) * x + Math.cos(rotation) * z;
        assert(isPointOnMappedLand(worldX, worldZ),
          `${layout.id} footprint should remain inside mapped land`);
      }
    }
    layout.buildings.forEach((building) => {
      assert(Math.abs(building.x) + building.width / 2 <= halfWidth,
        `${layout.id} building should remain on the quay width`);
      assert(Math.abs(building.z) + building.depth / 2 <= halfDepth,
        `${layout.id} building should remain on the quay depth`);
    });
    layout.yards.forEach((yard) => {
      const yardHalfWidth = (yard.columns - 1) * 2.7 / 2 + 3.03;
      const yardHalfDepth = (yard.rows - 1) * 6.38 / 2 + 3.03;
      assert(Math.abs(yard.x) + yardHalfWidth <= halfWidth,
        `${layout.id} container yard should remain on the quay width`);
      assert(Math.abs(yard.z) + yardHalfDepth <= halfDepth,
        `${layout.id} container yard should remain on the quay depth`);
    });
    layout.cranes.forEach((x) => {
      assert(Math.abs(x) + 8.5 <= halfWidth,
        `${layout.id} crane legs should remain on the quay width`);
      assert(Math.abs(-halfDepth + 4.5) + 3.5 <= halfDepth,
        `${layout.id} crane legs should remain on the quay depth`);
    });
  });
  KAOHSIUNG_CRANE_BANKS.forEach((bank) => {
    const rotation = THREE.MathUtils.degToRad(bank.rotationDegrees);
    bank.sites.forEach(([longitude, latitude]) => {
      const center = projectCoordinates(longitude, latitude);
      for (const x of [-8.5, 0, 8.5]) {
        for (const z of [-3.5, 0, 3.5]) {
          const worldX = center.x + Math.cos(rotation) * x + Math.sin(rotation) * z;
          const worldZ = center.z - Math.sin(rotation) * x + Math.cos(rotation) * z;
          assert(isPointOnMappedLand(worldX, worldZ),
            `${bank.id} crane supports should remain inside mapped land`);
        }
      }
    });
    for (let index = 1; index < bank.sites.length; index += 1) {
      const previous = projectCoordinates(...bank.sites[index - 1]);
      const current = projectCoordinates(...bank.sites[index]);
      assert(Math.hypot(current.x - previous.x, current.z - previous.z) >= 18,
        `${bank.id} cranes should be visibly dispersed`);
    }
  });

  const result = {
    terminals: KAOHSIUNG_PORT_LAYOUT.length,
    craneBanks: KAOHSIUNG_CRANE_BANKS.length,
    sceneGroups: port.root.children.length,
    cranes: cranes.length,
    buildings: buildings.length,
    containerBatches: containerMeshes.length,
    containerInstances: containerMeshes.reduce((total, mesh) => total + mesh.count, 0),
    sharedContainerGeometries: new Set(containerMeshes.map((mesh) => mesh.geometry)).size,
    groundedFacilities: KAOHSIUNG_PORT_LAYOUT.reduce(
      (total, layout) => total + layout.cranes.length
        + layout.yards.length + layout.buildings.length,
      KAOHSIUNG_CRANE_BANKS.reduce((total, bank) => total + bank.sites.length, 0),
    ),
  };
  port.root.clear();
  port.assetLibrary.dispose();
  return result;
}
