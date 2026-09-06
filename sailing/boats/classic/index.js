import * as THREE from "../three.js";
import { disposeModel } from "../dispose.js";
import { createMaterials } from "./materials.js";
import { createHull } from "./hull.js";
import { createHelm } from "./helm.js";
import { createWindshield } from "./windshield.js";
import { createHardware } from "./hardware.js";
import { createFlag } from "./flag.js";

const emptyPart = () => ({ root: new THREE.Group() });

// Factories use boat-local coordinates and return { root, update? }.
export const classicParts = {
  hull: { classic: createHull },
  helm: { classic: createHelm },
  windshield: { classic: createWindshield, none: emptyPart },
  hardware: { classic: createHardware, none: emptyPart },
  flag: { pennant: createFlag, none: emptyPart },
};

const defaults = {
  hull: "classic", helm: "classic", windshield: "classic", hardware: "classic", flag: "pennant",
};

export function createClassicBoat(configuration = {}, factories = classicParts) {
  const selected = { ...defaults, ...configuration.parts };
  // Validate before allocating any meshes, so a misspelled part cannot leak resources.
  for (const [slot, name] of Object.entries(selected)) {
    if (!Object.hasOwn(factories, slot) || !Object.hasOwn(factories[slot], name)) {
      throw new Error(`Unknown boat part: ${slot}/${name}`);
    }
  }
  const root = new THREE.Group();
  root.name = "classic";
  const materials = createMaterials();
  const modules = [];
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    disposeModel(root, Object.values(materials));
  }
  try {
    for (const [name, color] of Object.entries(configuration.colors || {})) {
      if (!Object.hasOwn(materials, name)) throw new Error(`Unknown boat material: ${name}`);
      materials[name].color.set(color);
    }
    let anchors;
    let profile;
    for (const [slot, name] of Object.entries(selected)) {
      const part = factories[slot][name]({ materials, anchors });
      part.root.name = slot;
      root.add(part.root);
      modules.push(part);
      if (slot === "hull") {
        anchors = part.anchors;
        profile = part.profile;
      } else {
        const anchor = anchors?.[slot];
        if (!Array.isArray(anchor) || anchor.length !== 3 || !anchor.every(Number.isFinite)) {
          throw new Error(`Hull is missing the ${slot} mounting point`);
        }
        part.root.position.fromArray(anchor);
      }
    }
    return {
      root,
      profile,
      update(dt, input) {
        if (!disposed) for (const part of modules) part.update?.(dt, input);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
