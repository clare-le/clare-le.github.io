import * as THREE from "../boats/three.js";

function paint(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...extra });
}

export function createPortAssetLibrary() {
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
  const containerGeometry = new THREE.BoxGeometry(2.44, 2.59, 6.06);
  const materials = {
    concrete: paint(0x879294, { roughness: 0.94 }),
    concreteSide: paint(0x505d60, { roughness: 0.98 }),
    concreteEdge: paint(0xd5b949, { roughness: 0.72 }),
    building: paint(0xb7c2be, { roughness: 0.9 }),
    warehouse: paint(0x849896, { roughness: 0.88 }),
    roof: paint(0xd9ddda, { metalness: 0.18, roughness: 0.62 }),
    windows: paint(0x183d49, { metalness: 0.18, roughness: 0.3 }),
    crane: paint(0xe7ae2e, { metalness: 0.2, roughness: 0.56 }),
    craneDark: paint(0x27363a, { metalness: 0.35, roughness: 0.42 }),
    cable: paint(0x263034, { metalness: 0.5, roughness: 0.5 }),
    light: paint(0xf2e8ba, { emissive: 0xd8bd61, emissiveIntensity: 0.7 }),
    container: [0xc74d3b, 0x2d7188, 0x42765b, 0xd39838, 0x8a5147]
      .map((color) => paint(color, { roughness: 0.79 })),
  };

  function box(root, material, size, position, name) {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.scale.set(...size);
    mesh.position.set(...position);
    if (name) mesh.name = name;
    root.add(mesh);
    return mesh;
  }

  function cylinder(root, material, radius, height, position, name) {
    const mesh = new THREE.Mesh(unitCylinder, material);
    mesh.scale.set(radius, height, radius);
    mesh.position.set(...position);
    if (name) mesh.name = name;
    root.add(mesh);
    return mesh;
  }

  function beam(root, material, start, end, thickness = 0.45) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const direction = b.clone().sub(a);
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.scale.set(thickness, direction.length(), thickness);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    root.add(mesh);
    return mesh;
  }

  function createContainerYard({ columns = 7, rows = 3, tiers = 4, seed = 0 } = {}) {
    const root = new THREE.Group();
    root.name = "container-yard";
    const instances = materials.container.map(() => []);
    let total = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const missing = (row * 3 + column * 5 + seed) % 5 === 0 ? 1 : 0;
        const stackHeight = Math.max(1, tiers - missing);
        for (let tier = 0; tier < stackHeight; tier += 1) {
          const colorIndex = (row * 2 + column + tier + seed) % instances.length;
          instances[colorIndex].push({
            x: (column - (columns - 1) / 2) * 2.7,
            y: 1.295 + tier * 2.68,
            z: (row - (rows - 1) / 2) * 6.38,
          });
          total += 1;
        }
      }
    }
    const helper = new THREE.Object3D();
    instances.forEach((positions, colorIndex) => {
      if (!positions.length) return;
      const mesh = new THREE.InstancedMesh(
        containerGeometry,
        materials.container[colorIndex],
        positions.length,
      );
      mesh.name = `container-stack-color-${colorIndex}`;
      positions.forEach((position, index) => {
        helper.position.set(position.x, position.y, position.z);
        helper.rotation.y = ((index + seed) % 7 === 0) ? Math.PI / 2 : 0;
        helper.updateMatrix();
        mesh.setMatrixAt(index, helper.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      root.add(mesh);
    });
    root.userData.containerCount = total;
    return root;
  }

  function createPortBuilding({ width = 16, height = 8, depth = 10, warehouse = false } = {}) {
    const root = new THREE.Group();
    root.name = warehouse ? "port-warehouse" : "port-building";
    const wallMaterial = warehouse ? materials.warehouse : materials.building;
    box(root, wallMaterial, [width, height, depth], [0, height / 2, 0]);
    box(root, materials.roof, [width + 0.7, 0.45, depth + 0.7],
      [0, height + 0.22, 0]);
    const floors = Math.max(1, Math.floor(height / 2.5));
    for (let floor = 0; floor < floors; floor += 1) {
      const y = 1.5 + floor * 2.35;
      box(root, materials.windows, [width * 0.72, 0.55, 0.08],
        [0, y, -depth / 2 - 0.045]);
      box(root, materials.windows, [0.08, 0.55, depth * 0.62],
        [width / 2 + 0.045, y, 0]);
    }
    if (warehouse) {
      for (const x of [-width * 0.3, 0, width * 0.3]) {
        box(root, materials.craneDark, [width * 0.2, height * 0.55, 0.1],
          [x, height * 0.3, -depth / 2 - 0.08]);
      }
    }
    return root;
  }

  function createGantryCrane({ height = 24, span = 18, depth = 8, boom = 22 } = {}) {
    const root = new THREE.Group();
    root.name = "ship-to-shore-gantry-crane";
    const lowerHalfSpan = span * 0.5;
    const upperHalfSpan = span * 0.32;
    for (const z of [-depth / 2, depth / 2]) {
      beam(root, materials.crane,
        [-lowerHalfSpan, 0, z], [-upperHalfSpan, height, z], 0.72);
      beam(root, materials.crane,
        [lowerHalfSpan, 0, z], [upperHalfSpan, height, z], 0.72);
      box(root, materials.crane, [span * 0.76, 1.05, 0.72],
        [0, height, z]);
      beam(root, materials.craneDark,
        [-lowerHalfSpan * 0.96, 3, z], [lowerHalfSpan * 0.96, 3, z], 0.42);
    }
    for (const x of [-upperHalfSpan, upperHalfSpan]) {
      box(root, materials.crane, [0.62, 0.62, boom + depth],
        [x, height + 1.05, (depth - boom) / 2]);
      beam(root, materials.crane,
        [x, height + 1.1, -boom], [x, height + 8, depth / 2], 0.38);
    }
    box(root, materials.crane, [span * 0.68, 0.75, 1.1], [0, height + 1.05, -boom]);
    const trolleyZ = -boom * 0.42;
    box(root, materials.craneDark, [4.1, 1.1, 2.1], [0, height + 0.25, trolleyZ]);
    box(root, materials.windows, [2.3, 1.8, 1.8], [2.6, height - 1.1, trolleyZ]);
    for (const x of [-2.2, 2.2]) {
      beam(root, materials.cable, [x, height, trolleyZ], [x, 5.4, trolleyZ], 0.08);
    }
    box(root, materials.craneDark, [6.2, 0.36, 1.4], [0, 5.1, trolleyZ]);
    for (const x of [-lowerHalfSpan, lowerHalfSpan]) {
      for (const z of [-depth / 2, depth / 2]) {
        cylinder(root, materials.craneDark, 0.72, 0.55, [x, 0.3, z]);
      }
    }
    return root;
  }

  function createQuay({ width = 70, depth = 60, surfaceY = 1.45, draft = 0.5 } = {}) {
    const root = new THREE.Group();
    root.name = "concrete-quay";
    const foundationHeight = surfaceY + draft;
    box(root, materials.concreteSide, [width, foundationHeight, depth],
      [0, (surfaceY - draft) / 2, 0], "quay-foundation");
    box(root, materials.concrete, [width, 0.12, depth],
      [0, surfaceY + 0.06, 0], "quay-apron");
    box(root, materials.concreteEdge, [width, 0.16, 0.5],
      [0, surfaceY + 0.16, -depth / 2], "quay-edge");
    for (let x = -width / 2 + 4; x < width / 2; x += 9) {
      cylinder(root, materials.craneDark, 0.34, 0.48,
        [x, surfaceY + 0.3, -depth / 2 + 1]);
    }
    root.userData.width = width;
    root.userData.depth = depth;
    root.userData.surfaceY = surfaceY + 0.12;
    return root;
  }

  function dispose() {
    unitBox.dispose();
    unitCylinder.dispose();
    containerGeometry.dispose();
    Object.values(materials).flat().forEach((material) => material.dispose());
  }

  return {
    createContainerYard,
    createPortBuilding,
    createGantryCrane,
    createQuay,
    dispose,
  };
}
