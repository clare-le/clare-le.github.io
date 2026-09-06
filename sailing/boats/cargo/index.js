import * as THREE from "../three.js";
import { disposeModel } from "../dispose.js";
import { createCargoHull } from "./hull.js";
import { createCargoHelm } from "./helm.js";

export function createCargoBoat(configuration = {}) {
  if (Object.keys(configuration.parts || {}).length) {
    throw new Error("Cargo currently uses its matched hull and helm assembly");
  }
  const paint = (color, extra = {}) => new THREE.MeshStandardMaterial({
    color, roughness: 0.68, side: THREE.DoubleSide, ...extra,
  });
  const materials = {
    hull: paint(0x28685c), deck: paint(0x608378), cabin: paint(0x91a49d),
    consolePaint: paint(0x697e7d), floor: paint(0x303f3e, { flatShading: true }),
    metal: paint(0xb6c5c4, { metalness: 0.55, roughness: 0.35 }),
    glass: paint(0xa6d6dc, { transparent: true, opacity: 0.075, depthWrite: false }),
    seal: paint(0x1e292b), safety: paint(0xd1b657), accent: paint(0xc9533f),
    screen: paint(0x6ba78a, { emissive: 0x37694e, emissiveIntensity: 0.25 }),
  };
  const root = new THREE.Group();
  root.name = "cargo";
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    disposeModel(root, Object.values(materials));
  };
  try {
    for (const [name, color] of Object.entries(configuration.colors || {})) {
      if (!Object.hasOwn(materials, name)) throw new Error(`Unknown cargo material: ${name}`);
      materials[name].color.set(color);
    }
    const hull = createCargoHull(materials);
    root.add(hull.root);
    const helm = createCargoHelm(materials);
    root.add(helm.root);
    return {
      root, profile: hull.profile,
      update(dt, input) { if (!disposed) helm.update(dt, input); },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
