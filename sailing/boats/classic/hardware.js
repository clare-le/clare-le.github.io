import * as THREE from '../three.js';

export function createHardware({ materials }) {
  const { chromeMaterial } = materials;
  const boat = new THREE.Group();
  // 10. Foredeck Accessories & Hardware

  // Teardrop Bow Navigation Light
  const navLightGroup = new THREE.Group();
  navLightGroup.position.set(0, 0.67, -2.35);
  const navHousing = new THREE.Mesh(
    new THREE.SphereGeometry(0.042, 16, 12),
    chromeMaterial,
  );
  navHousing.scale.set(1, 0.7, 1.8);
  navLightGroup.add(navHousing);
  const redPortLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0xff1122,
      emissive: 0xcc0011,
      emissiveIntensity: 0.8,
    }),
  );
  redPortLight.position.set(-0.025, 0.015, -0.02);
  navLightGroup.add(redPortLight);
  const greenStbdLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0x00ee55,
      emissive: 0x009933,
      emissiveIntensity: 0.8,
    }),
  );
  greenStbdLight.position.set(0.025, 0.015, -0.02);
  navLightGroup.add(greenStbdLight);
  boat.add(navLightGroup);

  // Dual Chrome Trumpet Air Horns
  const hornGroup = new THREE.Group();
  hornGroup.position.set(-0.28, 0.71, -1.05);
  hornGroup.rotation.y = 0.08;
  [-0.03, 0.03].forEach((offsetY, i) => {
    const hornTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012 + i * 0.003, 0.007, 0.22, 10),
      chromeMaterial,
    );
    hornTube.position.set(offsetY * 1.3, 0.02 + offsetY * 0.6, -0.04);
    hornTube.rotation.x = Math.PI / 2;
    hornGroup.add(hornTube);
    const hornBell = new THREE.Mesh(
      new THREE.ConeGeometry(0.028 + i * 0.004, 0.06, 12),
      chromeMaterial,
    );
    hornBell.position.set(offsetY * 1.3, 0.02 + offsetY * 0.6, -0.15);
    hornBell.rotation.x = -Math.PI / 2;
    hornGroup.add(hornBell);
  });
  boat.add(hornGroup);

  // Dual Chrome Engine Cowl Vents
  [-0.24, 0.24].forEach((x) => {
    const vent = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 12, 10),
      chromeMaterial,
    );
    vent.position.set(x, 0.71, -0.65);
    vent.scale.set(0.9, 0.6, 1.4);
    vent.rotation.x = -0.3;
    boat.add(vent);
  });

  // Chrome Mooring Cleats
  [
    new THREE.Vector3(-0.32, 0.69, -1.75),
    new THREE.Vector3(0.32, 0.69, -1.75),
  ].forEach((pos) => {
    const cleat = new THREE.Group();
    cleat.position.copy(pos);
    const cleatBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.018, 0.05),
      chromeMaterial,
    );
    cleat.add(cleatBase);
    const cleatBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.015, 0.11),
      chromeMaterial,
    );
    cleatBar.position.y = 0.015;
    cleat.add(cleatBar);
    boat.add(cleat);
  });

  // Classic Red & White Ring Lifebuoy (Hanging inside cockpit side)
  const lifebuoyGroup = new THREE.Group();
  lifebuoyGroup.position.set(-0.38, 0.56, 0.08);
  lifebuoyGroup.rotation.y = Math.PI / 2;
  lifebuoyGroup.scale.setScalar(0.72);
  const buoyTorus = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.028, 12, 24),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5 }),
  );
  lifebuoyGroup.add(buoyTorus);
  for (let b = 0; b < 4; b += 1) {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.111, 0.03, 10, 8, Math.PI / 6),
      new THREE.MeshStandardMaterial({ color: 0xdd2818, roughness: 0.4 }),
    );
    band.rotation.z = (b * Math.PI) / 2 - Math.PI / 12;
    lifebuoyGroup.add(band);
  }
  boat.add(lifebuoyGroup);

  return { root: boat };
}
