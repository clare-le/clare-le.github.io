import * as THREE from "../boats/three.js";
import { projectCoordinates } from "./geography.js";
import { createKaohsiungPort } from "./kaohsiung-port.js";

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

  const result = {
    terminals: port.root.children.length,
    cranes: cranes.length,
    buildings: buildings.length,
    containerBatches: containerMeshes.length,
    containerInstances: containerMeshes.reduce((total, mesh) => total + mesh.count, 0),
    sharedContainerGeometries: new Set(containerMeshes.map((mesh) => mesh.geometry)).size,
  };
  port.root.clear();
  port.assetLibrary.dispose();
  return result;
}
