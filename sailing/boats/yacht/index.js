import * as THREE from "../three.js";
import { disposeModel } from "../dispose.js";
import { createYachtHull } from "./hull.js";
import { createYachtHelm } from "./helm.js";

export function createYachtBoat(configuration = {}) {
  if (Object.keys(configuration.parts || {}).length) {
    throw new Error("Yacht currently uses its matched hull and helm assembly");
  }
  const paint = (color, extra = {}) => new THREE.MeshStandardMaterial({
    color, roughness: 0.5, side: THREE.DoubleSide, ...extra,
  });
  const materials = {
    hull: paint(0xf2f5f3, { roughness: 0.3 }),
    hullAccent: paint(0x123848, { metalness: 0.12, roughness: 0.28 }),
    deck: paint(0xdce5e1, { roughness: 0.44 }),
    teak: paint(0xa77443, { roughness: 0.67 }),
    cabin: paint(0xeff3f1, { roughness: 0.32 }),
    upholstery: paint(0xd9d5c9, { roughness: 0.76 }),
    consolePaint: paint(0x263b40, { roughness: 0.42 }),
    carbon: paint(0x101719, { metalness: 0.35, roughness: 0.32 }),
    metal: paint(0xc9d2d2, { metalness: 0.82, roughness: 0.2 }),
    glass: paint(0x4f8291, { transparent: true, opacity: 0.28, depthWrite: false }),
    seal: paint(0x101719, { roughness: 0.48 }),
    trim: paint(0xe0caa1, { roughness: 0.58 }),
    accent: paint(0xb94131, { roughness: 0.42 }),
    light: paint(0xaaf8ff, { emissive: 0x6cecf5, emissiveIntensity: 1.1 }),
  };
  const root = new THREE.Group();
  root.name = "yacht";
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    disposeModel(root, Object.values(materials));
  };
  try {
    for (const [name, color] of Object.entries(configuration.colors || {})) {
      if (!Object.hasOwn(materials, name)) throw new Error(`Unknown yacht material: ${name}`);
      materials[name].color.set(color);
    }
    const hull = createYachtHull(materials);
    const helm = createYachtHelm(materials);
    root.add(hull.root, helm.root);
    return {
      root,
      profile: hull.profile,
      update(dt, input) { if (!disposed) helm.update(dt, input); },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
