import * as THREE from "./three.js";
import { createClassicBoat } from "./classic/index.js";
import { createCargoBoat } from "./cargo/index.js";

export const boatModels = { classic: createClassicBoat, cargo: createCargoBoat };

function validateModel(model) {
  if (!model?.root?.isObject3D || typeof model.update !== "function"
      || typeof model.dispose !== "function") {
    throw new Error("Boat factory must return root, update, dispose, and profile");
  }
  const profile = model.profile;
  for (const value of [profile?.waterline, profile?.camera?.distance,
    profile?.camera?.height, profile?.camera?.lookAhead, profile?.camera?.lookHeight,
    profile?.spray?.forward, profile?.spray?.halfWidth]) {
    if (!Number.isFinite(value)) throw new Error("Boat profile coordinates must be finite numbers");
  }
}

// The stable root keeps position and heading when its model is replaced.
export function createBoatSlot(configuration, models = boatModels) {
  const root = new THREE.Group();
  root.name = "boat";
  let active;
  let currentConfiguration;
  let lastInput;
  let disposed = false;

  function replace(nextConfiguration) {
    if (disposed) throw new Error("Cannot replace a disposed boat slot");
    const config = structuredClone(nextConfiguration);
    if (!Object.hasOwn(models, config.model)) throw new Error(`Unknown boat model: ${config.model}`);
    const next = models[config.model](config);
    try {
      validateModel(next);
      if (lastInput) next.update(0, lastInput);
    } catch (error) {
      next?.dispose?.();
      throw error;
    }
    const previous = active;
    root.add(next.root);
    active = next;
    currentConfiguration = config;
    previous?.dispose();
  }

  replace(configuration);
  return {
    root,
    get profile() { return active.profile; },
    get configuration() { return structuredClone(currentConfiguration); },
    replace,
    update(dt, input) {
      if (disposed) return;
      lastInput = { ...input };
      active.update(dt, input);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      active.dispose();
      root.removeFromParent();
    },
  };
}
