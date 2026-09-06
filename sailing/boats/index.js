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
  const physics = profile?.physics;
  const motion = physics?.motion;
  for (const value of [profile?.waterline, profile?.camera?.distance,
    profile?.camera?.height, profile?.camera?.lookAhead, profile?.camera?.lookHeight,
    profile?.spray?.forward, profile?.spray?.halfWidth,
    physics?.lengthMeters, physics?.beamMeters, physics?.hullCenterForwardMeters,
    physics?.massKg, physics?.enginePowerKw, physics?.idleRpm, physics?.maxRpm,
    physics?.fuelCapacityLiters, physics?.fullLoadFuelLitersPerHour,
    physics?.maxSpeedKnots, physics?.reverseSpeedKnots, physics?.reverseThrustFactor,
    physics?.anchorBrakeResponse,
    physics?.propulsionFactor, physics?.decelerationResponse,
    physics?.rudderResponse, physics?.minSteerageKnots, physics?.turnRateAtMax,
    motion?.heave, motion?.heaveFrequency, motion?.pitch, motion?.pitchFrequency,
    motion?.accelerationPitch, motion?.heel, motion?.roll, motion?.cameraHeave]) {
    if (!Number.isFinite(value)) throw new Error("Boat profile values must be finite numbers");
  }
  for (const value of [physics.lengthMeters, physics.beamMeters, physics.massKg,
    physics.enginePowerKw, physics.idleRpm, physics.maxRpm,
    physics.fuelCapacityLiters, physics.fullLoadFuelLitersPerHour,
    physics.maxSpeedKnots, physics.reverseSpeedKnots, physics.reverseThrustFactor,
    physics.anchorBrakeResponse,
    physics.propulsionFactor, physics.decelerationResponse,
    physics.rudderResponse, physics.minSteerageKnots, physics.turnRateAtMax]) {
    if (value <= 0) throw new Error("Boat physical values must be positive");
  }
  if (physics.hullCenterForwardMeters < 0
      || physics.hullCenterForwardMeters >= physics.lengthMeters / 2) {
    throw new Error("Boat hull center must stay within its measured length");
  }
  if (physics.maxRpm <= physics.idleRpm) {
    throw new Error("Boat maximum RPM must exceed idle RPM");
  }
  const throttleCurve = physics.throttleCurve;
  if (!Array.isArray(throttleCurve) || throttleCurve.length < 2
      || throttleCurve[0] !== 0 || throttleCurve.at(-1) !== 1
      || throttleCurve.some((value, index) => !Number.isFinite(value)
        || value < 0 || value > 1 || (index && value <= throttleCurve[index - 1]))) {
    throw new Error("Boat throttle curve must increase from 0 to 1");
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
