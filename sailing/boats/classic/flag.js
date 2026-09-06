import * as THREE from '../three.js';

export function createFlag({ materials }) {
  const { chromeMaterial, goldBrassMaterial } = materials;
  const boat = new THREE.Group();
  // Bow Flagstaff with Fluttering Yacht Club Pennant
  const bowFlagGroup = new THREE.Group();

  const flagSocket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.03, 0.07, 12),
    goldBrassMaterial,
  );
  flagSocket.position.y = 0.035;
  bowFlagGroup.add(flagSocket);

  const flagPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.009, 0.34, 10),
    chromeMaterial,
  );
  flagPole.position.y = 0.22;
  bowFlagGroup.add(flagPole);

  const flagFinial = new THREE.Mesh(
    new THREE.SphereGeometry(0.016, 10, 10),
    goldBrassMaterial,
  );
  flagFinial.position.set(0, 0.4, 0);
  bowFlagGroup.add(flagFinial);

  const pennantGeo = new THREE.BufferGeometry();
  pennantGeo.setAttribute(
    "position",
      new THREE.Float32BufferAttribute(
        [
          0, 0.38, 0,
          0, 0.27, 0,
          0.24, 0.325, 0,
        ],
        3,
      ),
  );
  pennantGeo.setIndex([0, 1, 2]);
  pennantGeo.computeVertexNormals();
  const pennantMesh = new THREE.Mesh(
    pennantGeo,
    new THREE.MeshStandardMaterial({
      color: 0x1d4e89,
      roughness: 0.6,
      side: THREE.DoubleSide,
    }),
  );
  bowFlagGroup.add(pennantMesh);
  boat.add(bowFlagGroup);

  function update(dt, input) {
    // Keep the pennant root fixed to the pole and animate only its free tip.
    const flutterFreq = 5.5 + input.speed * 1.4;
    const pennantPositions = pennantGeo.attributes.position;
    pennantPositions.setY(
      2,
      0.325 + Math.cos(input.time * flutterFreq * 0.8) * 0.012,
    );
    pennantPositions.setZ(2, Math.sin(input.time * flutterFreq) * 0.045);
    pennantPositions.needsUpdate = true;
    pennantGeo.computeVertexNormals();
  }

  return { root: boat, update };
}
