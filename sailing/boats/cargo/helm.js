import * as THREE from "../three.js";
import { box, strut } from "./geometry.js";

function dialTexture(label, numbers) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#17211f";
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "#dae6dc";
  for (let i = 0; i <= 30; i += 1) {
    const angle = -Math.PI * 0.75 + i / 30 * Math.PI * 1.5;
    const length = i % 5 === 0 ? 17 : 8;
    ctx.lineWidth = i % 5 === 0 ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(128 + Math.sin(angle) * (106 - length), 128 - Math.cos(angle) * (106 - length));
    ctx.lineTo(128 + Math.sin(angle) * 106, 128 - Math.cos(angle) * 106);
    ctx.stroke();
  }
  ctx.fillStyle = "#e2ede4";
  ctx.font = "22px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  numbers.forEach((number, i) => {
    const angle = -Math.PI * 0.75 + i / (numbers.length - 1) * Math.PI * 1.5;
    ctx.fillText(String(number), 128 + Math.sin(angle) * 75, 128 - Math.cos(angle) * 75);
  });
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(label, 128, 171);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCargoHelm(materials) {
  const root = new THREE.Group();
  root.name = "cargo-helm";
  const { metal, seal, floor, accent, screen } = materials;

  function gauge(x, radius, label, numbers) {
    const group = new THREE.Group();
    group.position.set(x, 0.932, -0.307);
    group.rotation.x = -Math.atan(0.15 / 0.61);
    const face = new THREE.Mesh(new THREE.CircleGeometry(radius, 40),
      new THREE.MeshBasicMaterial({ map: dialTexture(label, numbers) }));
    group.add(face);
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.007, 10, 40), metal);
    group.add(bezel);
    const pivot = new THREE.Group();
    pivot.position.z = 0.006;
    box(pivot, accent, [0.005, radius * 0.78, 0.003], [0, radius * 0.33, 0]);
    group.add(pivot);
    root.add(group);
    return pivot;
  }
  const speed = gauge(0, 0.073, "KN", [0, 2, 4, 6, 8, 10]);
  const rpm = gauge(-0.21, 0.062, "RPM", [0, 1, 2, 3]);
  const heading = gauge(0.21, 0.062, "HDG", [0, 90, 180, 270, 360]);

  const wheel = new THREE.Group();
  wheel.name = "cargo-wheel";
  wheel.position.set(0, 0.775, 0.04);
  wheel.rotation.x = -0.2;
  strut(root, metal, [0, 0.72, -0.27], [0, 0.775, 0.04], 0.035);
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.018, 12, 48), seal));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.045, 16), metal);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  for (let i = 0; i < 5; i += 1) {
    const angle = i * Math.PI * 2 / 5;
    strut(wheel, metal, [0, 0, 0], [Math.sin(angle) * 0.2, Math.cos(angle) * 0.2, 0], 0.009);
  }
  root.add(wheel);

  const throttleBase = box(root, floor, [0.105, 0.17, 0.07], [0.53, 0.845, -0.25]);
  throttleBase.rotation.x = -0.2;
  const lever = new THREE.Group();
  lever.name = "cargo-throttle";
  lever.position.set(0.53, 0.88, -0.19);
  strut(lever, metal, [0, 0, 0], [0, 0.16, 0], 0.009);
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.035, 4, 10), accent);
  grip.position.y = 0.16;
  grip.rotation.z = Math.PI / 2;
  lever.add(grip);
  root.add(lever);

  const radio = box(root, seal, [0.19, 0.105, 0.045], [-0.52, 0.92, -0.28]);
  radio.rotation.x = -0.24;
  box(radio, screen, [0.116, 0.024, 0.006], [-0.018, 0.018, 0.026]);
  for (const x of [-0.062, 0.057]) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.018, 12), metal);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(x, -0.022, 0.031);
    radio.add(knob);
  }

  return {
    root,
    update(dt, input) {
      wheel.rotation.z = THREE.MathUtils.lerp(wheel.rotation.z, -input.rudder * 0.82,
        dt === 0 ? 1 : 1 - Math.exp(-10 * dt));
      lever.rotation.x = THREE.MathUtils.lerp(lever.rotation.x, -input.throttle * 0.48,
        dt === 0 ? 1 : 1 - Math.exp(-8 * dt));
      speed.rotation.z = Math.PI * 0.75
        - Math.min(Math.abs(input.speed) / 10, 1) * Math.PI * 1.5;
      rpm.rotation.z = Math.PI * 0.75
        - (Math.abs(input.throttle) * 0.72 + input.speedRatio * 0.28) * Math.PI * 1.5;
      heading.rotation.z = Math.PI * 0.75
        - (((input.heading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * 0.75;
    },
  };
}
