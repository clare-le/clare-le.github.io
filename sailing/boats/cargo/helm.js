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

function radarTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#092b25";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(111, 237, 177, 0.52)";
  ctx.lineWidth = 2;
  for (const radius of [35, 65, 88]) {
    ctx.beginPath();
    ctx.arc(160, 98, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(160, 10);
  ctx.lineTo(160, 180);
  ctx.moveTo(72, 98);
  ctx.lineTo(248, 98);
  ctx.stroke();
  ctx.strokeStyle = "#a9f6c9";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(160, 98);
  ctx.lineTo(205, 48);
  ctx.stroke();
  ctx.fillStyle = "#ffd166";
  for (const [x, y] of [[118, 72], [215, 118], [188, 52]]) {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#e3fff0";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("RADAR", 14, 25);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCargoHelm(materials) {
  const root = new THREE.Group();
  root.name = "cargo-helm";
  const { metal, seal, floor, accent, consolePaint } = materials;

  box(root, consolePaint, [2.08, 0.22, 0.38], [0, 0.94, -0.27]);
  box(root, seal, [2.12, 0.035, 0.42], [0, 1.065, -0.27]);

  function gauge(x, radius, label, numbers) {
    const group = new THREE.Group();
    group.position.set(x, 0.96, -0.058);
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
  const temperature = gauge(0.05, 0.052, "TEMP", [40, 80, 120]);
  const rpm = gauge(0.23, 0.069, "RPM", [0, 1, 2, 3]);
  const oil = gauge(0.43, 0.052, "OIL", [0, 3, 6]);

  box(root, seal, [0.35, 0.225, 0.045], [-0.27, 0.955, -0.046]);
  const radar = new THREE.Mesh(
    new THREE.PlaneGeometry(0.29, 0.165),
    new THREE.MeshBasicMaterial({ map: radarTexture() }),
  );
  radar.position.set(-0.27, 0.965, -0.021);
  root.add(radar);

  const lampMaterials = [0xef476f, 0xffd166, 0x55d187, 0x69b7ff].map((color) =>
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 }));
  const warningLamps = lampMaterials.map((material, index) => {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), material);
    lamp.position.set(-0.39 + index * 0.08, 1.085, -0.18);
    root.add(lamp);
    return lamp;
  });

  const wheel = new THREE.Group();
  wheel.name = "cargo-wheel";
  wheel.position.set(0.23, 0.755, 0.055);
  wheel.rotation.x = -0.2;
  strut(root, metal, [0.23, 0.7, -0.08], [0.23, 0.755, 0.055], 0.035);
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.018, 12, 48), seal));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.045, 16), metal);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  for (let i = 0; i < 5; i += 1) {
    const angle = i * Math.PI * 2 / 5;
    strut(wheel, metal, [0, 0, 0], [Math.sin(angle) * 0.185, Math.cos(angle) * 0.185, 0], 0.009);
  }
  root.add(wheel);

  const throttleBase = box(root, floor, [0.105, 0.17, 0.07], [0.5, 0.855, -0.11]);
  throttleBase.rotation.x = 0.2;
  const lever = new THREE.Group();
  lever.name = "cargo-throttle";
  lever.position.set(0.5, 0.89, -0.05);
  strut(lever, metal, [0, 0, 0], [0, 0.16, 0], 0.009);
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.035, 4, 10), accent);
  grip.position.y = 0.16;
  grip.rotation.z = Math.PI / 2;
  lever.add(grip);
  root.add(lever);

  const anchorBase = box(root, floor, [0.105, 0.17, 0.07], [-0.5, 0.855, -0.11]);
  anchorBase.rotation.x = 0.2;
  const anchorLever = new THREE.Group();
  anchorLever.name = "anchor-control";
  anchorLever.position.set(-0.5, 0.89, -0.05);
  strut(anchorLever, metal, [0, 0, 0], [0, 0.16, 0], 0.009);
  const anchorGrip = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.035, 4, 10), accent);
  anchorGrip.position.y = 0.16;
  anchorGrip.rotation.z = Math.PI / 2;
  anchorLever.add(anchorGrip);
  const anchorHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.29, 0.17),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  anchorHit.name = "anchor-hit";
  anchorHit.position.y = 0.08;
  anchorLever.add(anchorHit);
  root.add(anchorLever);

  return {
    root,
    update(dt, input) {
      wheel.rotation.z = THREE.MathUtils.lerp(wheel.rotation.z, -input.rudder * 0.82,
        dt === 0 ? 1 : 1 - Math.exp(-10 * dt));
      lever.rotation.x = THREE.MathUtils.lerp(lever.rotation.x, input.throttle * 0.48,
        dt === 0 ? 1 : 1 - Math.exp(-8 * dt));
      anchorLever.rotation.x = THREE.MathUtils.lerp(anchorLever.rotation.x,
        input.anchor ? 0.48 : 0, dt === 0 ? 1 : 1 - Math.exp(-8 * dt));
      rpm.rotation.z = Math.PI * 0.75
        - (Math.abs(input.throttle) * 0.72 + input.speedRatio * 0.28) * Math.PI * 1.5;
      temperature.rotation.z = Math.PI * 0.45
        - (0.28 + input.speedRatio * 0.5) * Math.PI * 1.15;
      oil.rotation.z = Math.PI * 0.6
        - (0.18 + Math.abs(input.throttle) * 0.7) * Math.PI * 1.2;
      warningLamps[0].material.emissiveIntensity = input.anchor ? 1.8 : 0.18;
    },
  };
}
