import * as THREE from '../three.js';

export function createHelm({ materials }) {
  const { mahoganyMaterial, chromeMaterial, goldBrassMaterial, leatherCockpitMaterial, darkCockpitMaterial } = materials;
  const boat = new THREE.Group();
  // 7. Dashboard & Instrument Panel
  const dashLeatherRoll = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 1.12, 16),
    leatherCockpitMaterial,
  );
  dashLeatherRoll.position.set(0, 0.815, -0.265);
  dashLeatherRoll.rotation.z = Math.PI / 2;
  boat.add(dashLeatherRoll);

  // 3 Classic Chrome Gauges
  const gaugeFaceMat = new THREE.MeshStandardMaterial({
    color: 0x17120f,
    roughness: 0.86,
    emissive: 0x241006,
    emissiveIntensity: 0.28,
  });
  const gaugeNeedleMat = new THREE.MeshBasicMaterial({ color: 0xff5a32 });
  const gaugeTickMat = new THREE.MeshBasicMaterial({ color: 0xffe2a6 });

  function createGauge(radius) {
    const group = new THREE.Group();
    const bezel = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.012, 10, 24),
      chromeMaterial,
    );
    group.add(bezel);
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(radius - 0.004, 24),
      gaugeFaceMat,
    );
    face.position.z = -0.005;
    group.add(face);
    const dialTicks = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.68, radius * 0.76, 24),
      gaugeTickMat,
    );
    dialTicks.position.z = -0.002;
    group.add(dialTicks);
    const needle = new THREE.Mesh(
      new THREE.BoxGeometry(0.007, radius * 0.82, 0.005),
      gaugeNeedleMat,
    );
    needle.position.y = (radius * 0.82) / 2;
    const needlePivot = new THREE.Group();
    needlePivot.add(needle);
    needlePivot.position.z = 0.004;
    group.add(needlePivot);
    return { group, needlePivot };
  }

  // Center Speedometer (Knots)
  const speedGauge = createGauge(0.062);
  speedGauge.group.position.set(0, 0.755, -0.205);
  speedGauge.group.rotation.x = -0.32;
  boat.add(speedGauge.group);

  // Left Tachometer
  const rpmGauge = createGauge(0.045);
  rpmGauge.group.position.set(-0.17, 0.735, -0.19);
  rpmGauge.group.rotation.x = -0.32;
  boat.add(rpmGauge.group);

  // Right Marine Heading Gauge
  const headingGauge = createGauge(0.045);
  headingGauge.group.position.set(0.17, 0.735, -0.19);
  headingGauge.group.rotation.x = -0.32;
  boat.add(headingGauge.group);

  // 8. Throttle Quadrant & Dynamic Lever
  const throttleBase = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.038, 0.075, 4, 10),
    chromeMaterial,
  );
  throttleBase.position.set(0.35, 0.69, -0.17);
  throttleBase.rotation.x = -0.3;
  boat.add(throttleBase);

  const throttleLever = new THREE.Group();
  throttleLever.position.set(0.35, 0.71, -0.17);
  const leverArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8),
    chromeMaterial,
  );
  leverArm.position.y = 0.08;
  throttleLever.add(leverArm);
  const leverKnob = new THREE.Mesh(
    new THREE.SphereGeometry(0.024, 16, 16),
    goldBrassMaterial,
  );
  leverKnob.position.y = 0.16;
  throttleLever.add(leverKnob);
  boat.add(throttleLever);

  const anchorBase = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.038, 0.075, 4, 10),
    chromeMaterial,
  );
  anchorBase.position.set(-0.35, 0.69, -0.17);
  anchorBase.rotation.x = -0.3;
  boat.add(anchorBase);

  const anchorLever = new THREE.Group();
  anchorLever.name = "anchor-control";
  anchorLever.position.set(-0.35, 0.71, -0.17);
  const anchorArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8),
    chromeMaterial,
  );
  anchorArm.position.y = 0.08;
  anchorLever.add(anchorArm);
  const anchorKnob = new THREE.Mesh(
    new THREE.SphereGeometry(0.024, 16, 16),
    goldBrassMaterial,
  );
  anchorKnob.position.y = 0.16;
  anchorLever.add(anchorKnob);
  const anchorHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.28, 0.15),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  anchorHit.name = "anchor-hit";
  anchorHit.position.y = 0.08;
  anchorLever.add(anchorHit);
  boat.add(anchorLever);

  // 9. Vintage Luxury 3-Spoke Wooden Steering Wheel (Open-top layout for gauges)
  const wheelAssembly = new THREE.Group();
  wheelAssembly.position.set(0, 0.67, 0.03);
  wheelAssembly.rotation.x = -0.22;
  wheelAssembly.scale.setScalar(0.88);

  const steeringColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.034, 0.042, 0.24, 16),
    chromeMaterial,
  );
  steeringColumn.position.set(0, 0.61, -0.07);
  steeringColumn.rotation.x = Math.PI / 2 - 0.22;
  boat.add(steeringColumn);

  const wheelRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.019, 14, 36),
    mahoganyMaterial,
  );
  wheelAssembly.add(wheelRim);

  const wheelHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.036, 20),
    chromeMaterial,
  );
  wheelHub.rotation.x = Math.PI / 2;
  wheelAssembly.add(wheelHub);

  const hornCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.04, 20),
    goldBrassMaterial,
  );
  hornCap.rotation.x = Math.PI / 2;
  wheelAssembly.add(hornCap);

  // Inverted 3-spoke design (down, up-right, up-left) leaving top open for gauges
  [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6].forEach((angle) => {
    const spokeGroup = new THREE.Group();
    spokeGroup.rotation.z = angle;
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.026, 0.13, 0.012),
      chromeMaterial,
    );
    spoke.position.y = 0.078;
    spokeGroup.add(spoke);
    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.018, 12),
      darkCockpitMaterial,
    );
    hole.position.y = 0.082;
    hole.rotation.x = Math.PI / 2;
    spokeGroup.add(hole);
    wheelAssembly.add(spokeGroup);
  });
  boat.add(wheelAssembly);

  function update(dt, input) {
    const wheelTarget = -input.rudder * 0.82;
    // A replacement receives dt=0 to adopt the current helm state immediately.
    const wheelResponse = dt === 0 ? 1 : 1 - Math.exp(-10 * dt);
    wheelAssembly.rotation.z = THREE.MathUtils.lerp(
      wheelAssembly.rotation.z, wheelTarget, wheelResponse,
    );
    throttleLever.rotation.x = THREE.MathUtils.lerp(
      throttleLever.rotation.x, -input.throttle * 0.48,
      dt === 0 ? 1 : 1 - Math.exp(-8 * dt),
    );
    anchorLever.rotation.x = THREE.MathUtils.lerp(
      anchorLever.rotation.x, input.anchor ? -0.48 : 0,
      dt === 0 ? 1 : 1 - Math.exp(-8 * dt),
    );
    speedGauge.needlePivot.rotation.z = -input.speedRatio * 2.3;
    rpmGauge.needlePivot.rotation.z =
      -(Math.abs(input.throttle) * 0.72 + input.speedRatio * 0.28) * 2.4;
    headingGauge.needlePivot.rotation.z =
      -((input.heading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  }

  return { root: boat, update };
}
