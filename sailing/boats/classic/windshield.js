import * as THREE from '../three.js';

export function createWindshield({ materials }) {
  const { chromeMaterial, glassMaterial } = materials;
  const boat = new THREE.Group();
  // 6. Curved Wrap-Around Windshield
  const windshieldGroup = new THREE.Group();
  windshieldGroup.position.set(0, 0.71, -0.32);

  const glassGeo = new THREE.BufferGeometry();
  glassGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        // Bottom rim
        -0.54, 0.02, 0.06,
        -0.24, 0.04, -0.04,
        0.24, 0.04, -0.04,
        0.54, 0.02, 0.06,
        // Top rim (slanted back towards driver)
        -0.48, 0.28, 0.16,
        -0.22, 0.31, 0.09,
        0.22, 0.31, 0.09,
        0.48, 0.28, 0.16,
      ],
      3,
    ),
  );
  glassGeo.setIndex([
    0, 1, 5,  0, 5, 4,
    1, 2, 6,  1, 6, 5,
    2, 3, 7,  2, 7, 6,
  ]);
  glassGeo.computeVertexNormals();
  const windshieldGlass = new THREE.Mesh(glassGeo, glassMaterial);
  windshieldGroup.add(windshieldGlass);

  // Chrome Windshield Frame (Accurately tracing glass brow and pillars)
  const framePoints = [
    new THREE.Vector3(-0.54, 0.02, 0.06), // left base
    new THREE.Vector3(-0.48, 0.28, 0.16), // left top corner
    new THREE.Vector3(-0.22, 0.31, 0.09), // left brow
    new THREE.Vector3(0, 0.32, 0.08),     // center top
    new THREE.Vector3(0.22, 0.31, 0.09),  // right brow
    new THREE.Vector3(0.48, 0.28, 0.16),  // right top corner
    new THREE.Vector3(0.54, 0.02, 0.06),  // right base
  ];

  for (let i = 0; i < framePoints.length - 1; i += 1) {
    const p1 = framePoints[i];
    const p2 = framePoints[i + 1];
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, dir.length(), 8),
      chromeMaterial,
    );
    seg.position.copy(p1).add(p2).multiplyScalar(0.5);
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    windshieldGroup.add(seg);
  }

  // Center Chrome Support Divider
  const centerPillarP1 = new THREE.Vector3(0, 0.04, -0.04);
  const centerPillarP2 = new THREE.Vector3(0, 0.32, 0.08);
  const centerDir = new THREE.Vector3().subVectors(centerPillarP2, centerPillarP1);
  const centerPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0075, 0.0075, centerDir.length(), 8),
    chromeMaterial,
  );
  centerPillar.position.copy(centerPillarP1).add(centerPillarP2).multiplyScalar(0.5);
  centerPillar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), centerDir.normalize());
  windshieldGroup.add(centerPillar);

  // Chrome Center Rearview Mirror
  const mirrorStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.007, 0.04, 8),
    chromeMaterial,
  );
  mirrorStem.position.set(0, 0.34, 0.08);
  windshieldGroup.add(mirrorStem);
  const mirrorBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.038, 0.015),
    chromeMaterial,
  );
  mirrorBody.position.set(0, 0.365, 0.08);
  windshieldGroup.add(mirrorBody);
  boat.add(windshieldGroup);

  return { root: boat };
}
