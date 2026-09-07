import * as THREE from "../three.js";
import { box, strut } from "../cargo/geometry.js";

function displayTexture(mode) {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 240;
  const context = canvas.getContext("2d");
  context.fillStyle = "#071b23";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(80, 215, 229, 0.28)";
  context.lineWidth = 2;
  for (let x = 24; x < canvas.width; x += 48) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 24; y < canvas.height; y += 48) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
  context.fillStyle = "#d9fbff";
  context.font = "bold 26px sans-serif";
  context.fillText(mode === "nav" ? "NAV" : "VESSEL", 22, 38);
  if (mode === "nav") {
    context.strokeStyle = "#52e2ef";
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(38, 194);
    context.bezierCurveTo(110, 168, 144, 76, 330, 54);
    context.stroke();
    context.fillStyle = "#ffd166";
    context.beginPath();
    context.moveTo(175, 132);
    context.lineTo(153, 184);
    context.lineTo(197, 168);
    context.closePath();
    context.fill();
  } else {
    for (const [x, label, value] of [[74, "PORT", "650"], [252, "STBD", "650"]]) {
      context.strokeStyle = "#55e0b0";
      context.lineWidth = 9;
      context.beginPath();
      context.arc(x, 132, 48, Math.PI * 0.75, Math.PI * 2.25);
      context.stroke();
      context.fillStyle = "#d9fbff";
      context.font = "bold 30px sans-serif";
      context.fillText(value, x - 30, 142);
      context.font = "18px sans-serif";
      context.fillText(label, x - 26, 211);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, context };
}

function updateEngineDisplay(display, rpm) {
  const { context, texture } = display;
  context.fillStyle = "#071b23";
  context.fillRect(42, 115, 64, 36);
  context.fillRect(220, 115, 64, 36);
  context.fillStyle = "#d9fbff";
  context.font = "bold 27px sans-serif";
  context.textAlign = "center";
  context.fillText(String(rpm), 74, 142);
  context.fillText(String(rpm), 252, 142);
  context.textAlign = "start";
  texture.needsUpdate = true;
}

export function createYachtHelm(materials) {
  const root = new THREE.Group();
  root.name = "yacht-helm";
  const { consolePaint, carbon, metal, seal, accent, upholstery, trim, light } = materials;

  // Wide stitched fascia and the lower bridge tie both stations into one console.
  box(root, consolePaint, [3.34, 0.34, 0.52], [0, 0.93, -0.26]);
  const brow = box(root, carbon, [3.42, 0.08, 0.58], [0, 1.12, -0.25]);
  brow.rotation.x = -0.05;
  box(root, upholstery, [2.05, 0.08, 0.34], [0.12, 0.73, 0.17]);
  for (const x of [-1.5, -0.82, -0.14, 0.54, 1.22]) {
    box(root, trim, [0.012, 0.19, 0.02], [x, 0.94, 0.012]);
  }

  function screenPanel(x, mode) {
    box(root, seal, [0.7, 0.39, 0.045], [x, 0.985, 0.025]);
    const displaySurface = displayTexture(mode);
    const display = new THREE.Mesh(
      new THREE.PlaneGeometry(0.64, 0.32),
      new THREE.MeshBasicMaterial({ map: displaySurface.texture }),
    );
    display.position.set(x, 0.99, 0.051);
    root.add(display);
    return displaySurface;
  }
  screenPanel(-0.37, "nav");
  const engineDisplay = screenPanel(0.37, "engine");
  let displayedRpm = 650;

  const statusLights = [0x55e0b0, 0x55e0b0, 0x69b7ff, 0xffd166].map((color, index) => {
    const material = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.7, roughness: 0.25,
    });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), material);
    lamp.position.set(-1.37 + index * 0.11, 1.085, 0.055);
    root.add(lamp);
    return lamp;
  });

  const wheel = new THREE.Group();
  wheel.name = "yacht-wheel";
  wheel.position.set(0.18, 0.9, 0.48);
  wheel.rotation.x = -0.18;
  strut(root, metal, [0.18, 0.69, 0.08], [0.18, 0.9, 0.48], 0.045);
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.022, 14, 56), seal));
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.184, 0.007, 10, 48), metal));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.052, 20), carbon);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  for (let i = 0; i < 3; i += 1) {
    const angle = i * Math.PI * 2 / 3;
    strut(wheel, metal, [0, 0, 0],
      [Math.sin(angle) * 0.184, Math.cos(angle) * 0.184, 0], 0.011);
  }
  root.add(wheel);

  // Twin engine levers move together; the red port lever remains visually distinct.
  box(root, carbon, [0.34, 0.2, 0.19], [0.62, 0.77, 0.02]);
  const throttle = new THREE.Group();
  throttle.name = "yacht-throttle";
  throttle.position.set(0.62, 0.83, 0.08);
  for (const x of [-0.065, 0.065]) {
    strut(throttle, metal, [x, 0, 0], [x, 0.18, 0], 0.013);
    const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.06, 5, 12),
      x < 0 ? accent : seal);
    grip.position.set(x, 0.18, 0);
    grip.rotation.z = Math.PI / 2;
    throttle.add(grip);
  }
  root.add(throttle);

  box(root, carbon, [0.2, 0.19, 0.18], [-0.62, 0.77, 0.02]);
  const anchorLever = new THREE.Group();
  anchorLever.name = "anchor-control";
  anchorLever.position.set(-0.62, 0.83, 0.08);
  strut(anchorLever, metal, [0, 0, 0], [0, 0.17, 0], 0.013);
  const anchorGrip = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.055, 5, 12), accent);
  anchorGrip.position.y = 0.17;
  anchorGrip.rotation.z = Math.PI / 2;
  anchorLever.add(anchorGrip);
  const anchorHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.34, 0.24),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  anchorHit.name = "anchor-hit";
  anchorHit.position.y = 0.08;
  anchorLever.add(anchorHit);
  root.add(anchorLever);

  // Low helm seats and side bolsters remain visible when looking sideways.
  for (const x of [-0.72, 0.72]) {
    box(root, upholstery, [0.62, 0.16, 0.68], [x, 0.65, 1.23]);
    const back = box(root, upholstery, [0.65, 0.7, 0.16], [x, 0.93, 1.52]);
    back.rotation.x = -0.08;
    box(root, trim, [0.48, 0.018, 0.12], [x, 1.16, 1.425]);
  }
  box(root, light, [1.4, 0.02, 0.025], [0, 1.15, -0.008]);

  return {
    root,
    update(dt, input) {
      const response = dt === 0 ? 1 : 1 - Math.exp(-10 * dt);
      wheel.rotation.z = THREE.MathUtils.lerp(wheel.rotation.z, -input.rudder * 0.82, response);
      throttle.rotation.x = THREE.MathUtils.lerp(throttle.rotation.x, input.throttle * 0.5, response);
      anchorLever.rotation.x = THREE.MathUtils.lerp(
        anchorLever.rotation.x, input.anchor ? 0.5 : 0, response,
      );
      statusLights[3].material.emissiveIntensity = input.anchor ? 2 : 0.35;
      const rpmRatio = Math.min(1,
        Math.abs(input.throttle) * 0.82 + input.speedRatio * 0.18);
      const fallbackRpm = Math.round((650 + rpmRatio * 2950) / 50) * 50;
      const nextRpm = Number.isFinite(input.rpm) ? input.rpm : fallbackRpm;
      if (nextRpm !== displayedRpm) {
        displayedRpm = nextRpm;
        updateEngineDisplay(engineDisplay, displayedRpm);
      }
    },
  };
}
