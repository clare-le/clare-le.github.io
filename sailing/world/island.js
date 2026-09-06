import * as THREE from "../boats/three.js";

const paint = (color, extra = {}) => new THREE.MeshStandardMaterial({
  color,
  roughness: 0.85,
  flatShading: true,
  ...extra,
});

export function createTestIsland() {
  const root = new THREE.Group();
  root.name = "test-island";
  root.position.set(1.5, 0, -24);

  const shallow = new THREE.Mesh(
    new THREE.RingGeometry(7.25, 12.25, 48),
    new THREE.MeshBasicMaterial({
      color: 0x55d2cf,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  shallow.rotation.x = -Math.PI / 2;
  shallow.position.y = 0.025;
  root.add(shallow);

  const sand = new THREE.Mesh(
    new THREE.CylinderGeometry(6.85, 7.8, 0.58, 18),
    paint(0xd9b868),
  );
  sand.position.y = 0.18;
  root.add(sand);

  const grass = new THREE.Mesh(
    new THREE.CylinderGeometry(4.9, 6.3, 0.58, 18),
    paint(0x50865b),
  );
  grass.position.y = 0.67;
  root.add(grass);

  const rockMaterial = paint(0x596a67);
  [
    [-5.8, 0.57, 1.6, 0.8],
    [5.2, 0.55, 2.8, 0.65],
    [-4.2, 0.62, -3.7, 0.72],
    [3.8, 0.66, -4.2, 0.9],
  ].forEach(([x, y, z, scale], index) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 0), rockMaterial);
    rock.position.set(x, y, z);
    rock.rotation.set(index * 0.37, index * 0.71, index * 0.19);
    root.add(rock);
  });

  const beaconWhite = paint(0xe9eee5);
  const beaconRed = paint(0xc94d3e);
  for (let i = 0; i < 3; i += 1) {
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19 - i * 0.018, 0.23 - i * 0.018, 0.62, 10),
      i % 2 ? beaconWhite : beaconRed,
    );
    stripe.position.set(-0.9, 1.12 + i * 0.61, -0.6);
    root.add(stripe);
  }
  const beaconTop = new THREE.Mesh(new THREE.ConeGeometry(0.31, 0.34, 10), beaconRed);
  beaconTop.position.set(-0.9, 2.82, -0.6);
  root.add(beaconTop);

  return {
    root,
    center: { x: root.position.x, z: root.position.z },
    shoreRadius: 7.25,
    shallowRadius: 12.25,
  };
}
