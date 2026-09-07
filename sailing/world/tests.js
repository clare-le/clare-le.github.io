import * as THREE from "../boats/three.js";
import { projectCoordinates } from "./geography.js";
import { createKaohsiungPort, KAOHSIUNG_PORT_LAYOUT } from "./kaohsiung-port.js";

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

  assert(port.root.children.length === 2, "Kaohsiung should have two terminal layouts");
  assert(port.collisionRings.length === 2, "each terminal should expose a collision ring");
  assert(port.collisionRings.every(({ ring }) => ring.length === 5
    && ring[0].x === ring[4].x && ring[0].z === ring[4].z),
  "terminal collision rings should be closed rectangles");
  assert(cranes.length === 5, "Kaohsiung should reuse five gantry cranes");
  assert(buildings.length === 4, "Kaohsiung should reuse four port buildings");
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

  const result = {
    terminals: port.root.children.length,
    collisionRings: port.collisionRings.length,
    cranes: cranes.length,
    buildings: buildings.length,
    containerBatches: containerMeshes.length,
    containerInstances: containerMeshes.reduce((total, mesh) => total + mesh.count, 0),
    sharedContainerGeometries: new Set(containerMeshes.map((mesh) => mesh.geometry)).size,
    groundedFacilities: KAOHSIUNG_PORT_LAYOUT.reduce(
      (total, layout) => total + layout.cranes.length
        + layout.yards.length + layout.buildings.length,
      0,
    ),
  };
  port.root.clear();
  port.assetLibrary.dispose();
  return result;
}
