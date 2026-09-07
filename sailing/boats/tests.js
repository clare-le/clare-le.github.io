import * as THREE from "./three.js";
import { createBoatSlot, boatModels } from "./index.js";
import { boatPresets } from "./config.js";
import { createClassicBoat, classicParts } from "./classic/index.js";
import { disposeModel } from "./dispose.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function runBoatModuleTests() {
  const boatConfiguration = boatPresets.classic;
  const slot = createBoatSlot(boatConfiguration);
  const input = { rudder: 0.7, throttle: 0.6, gear: 1,
    speed: 4.5, speedRatio: 4.5 / 24, rpm: 2200,
    latitude: 22.605, longitude: 120.287, navigationMultiplier: 1,
    heading: 1, time: 2 };
  const root = slot.root;
  root.position.set(10, 0.3, -20);
  root.rotation.y = 0.4;
  slot.update(1 / 60, input);
  const original = root.children[0];
  const resources = new Set();
  original.traverse((node) => {
    if (node.geometry) resources.add(node.geometry);
    for (const material of node.material ? [].concat(node.material) : []) resources.add(material);
  });
  const disposals = new Map([...resources].map((resource) => [resource, 0]));
  for (const resource of resources) {
    resource.addEventListener("dispose", () => disposals.set(resource, disposals.get(resource) + 1));
  }
  slot.replace({ model: "classic", parts: { flag: "none", hardware: "none" } });
  assert(slot.root === root && root.position.x === 10 && root.rotation.y === 0.4,
    "Replacement must preserve the live boat transform");
  assert(root.children.length === 1, "Replacement must remove the old model");
  assert(root.getObjectByName("flag").children.length === 0, "Flag can be removed");
  assert(root.getObjectByName("hardware").children.length === 0, "Hardware can be removed");
  assert([...disposals.values()].every((count) => count === 1), "Free each old GPU resource exactly once");
  const wheel = root.getObjectByName("helm").children.find((node) => Math.abs(node.scale.x - 0.88) < 1e-8);
  assert(Math.abs(wheel.rotation.z + input.rudder * 0.82) < 1e-8, "Replacement must inherit current steering");
  const live = root.children[0];
  for (const bad of [{ model: "missing" }, { model: "classic", parts: { flag: "missing" } },
    { model: "classic", colors: { missing: 0xffffff } }]) {
    let rejected = false;
    try { slot.replace(bad); } catch { rejected = true; }
    assert(rejected && root.children[0] === live, "Invalid configuration must leave the current boat intact");
  }
  for (let i = 0; i < 8; i += 1) {
    slot.replace({ model: "classic", parts: { flag: i % 2 ? "none" : "pennant" } });
    slot.update(1 / 60, input);
    assert(root.children.length === 1, "Repeated swaps must not accumulate models");
  }
  slot.dispose();
  slot.dispose();
  assert(root.children.length === 0, "Disposing a slot must release its model");

  // An independently registered model supplies its own geometry and camera/spray profile.
  const alternate = () => {
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
    return {
      root,
      profile: { camera: { distance: 2, height: 2, lookAhead: 10, lookHeight: 0 },
        spray: { forward: 3, halfWidth: 0.8 }, waterline: 0.25,
        physics: {
          lengthMeters: 5, beamMeters: 1.7, hullCenterForwardMeters: 0.4,
          massKg: 1200, enginePowerKw: 60, idleRpm: 700, maxRpm: 3600,
          fuelCapacityLiters: 120, fullLoadFuelLitersPerHour: 18,
          maxSpeedKnots: 15,
          reverseSpeedKnots: 3, reverseThrustFactor: 0.8,
          anchorBrakeResponse: 1,
          propulsionFactor: 1, decelerationResponse: 0.5,
          throttleCurve: [0, 0.5, 1], rudderResponse: 5,
          minSteerageKnots: 1, turnRateAtMax: 0.4,
          motion: { heave: 0.05, heaveFrequency: 2, pitch: 0.02,
            pitchFrequency: 1.5, accelerationPitch: 0.005, heel: 0.05,
            roll: 0.01, cameraHeave: 0.03 },
        } },
      update() {},
      dispose() { disposeModel(root); },
    };
  };
  const alternateSlot = createBoatSlot(boatConfiguration, { ...boatModels, alternate });
  alternateSlot.replace({ model: "alternate" });
  assert(alternateSlot.profile.camera.distance === 2 && alternateSlot.profile.spray.forward === 3,
    "Whole-model replacement must change its mounting profile");
  alternateSlot.dispose();

  const custom = createClassicBoat({ parts: { flag: "custom" } }, {
    ...classicParts,
    flag: { custom: () => ({ root: new THREE.Group() }) },
  });
  assert(custom.root.getObjectByName("flag").position.z === -2.55,
    "A replacement part must use the hull mounting point");
  custom.dispose();

  const cargoSlot = createBoatSlot(boatPresets.cargo);
  assert(cargoSlot.configuration.model === "cargo", "Cargo preset must load the cargo model");
  assert(cargoSlot.root.getObjectByName("cargo-hull"), "Cargo model must contain its hull");
  assert(cargoSlot.root.getObjectByName("cargo-wheel"), "Cargo model must contain its animated helm");
  assert(cargoSlot.profile.spray.forward === 4.8,
    "Cargo model must supply its own camera and spray profile");
  assert(slot.profile.physics.maxSpeedKnots === 24
      && cargoSlot.profile.physics.maxSpeedKnots === 10.5,
    "Each boat model must supply its own performance profile");
  assert(slot.profile.physics.massKg < cargoSlot.profile.physics.massKg,
    "Cargo model must carry more simulated mass than the classic runabout");
  assert(slot.profile.physics.reverseSpeedKnots === 4.5
      && cargoSlot.profile.physics.reverseSpeedKnots === 3.5,
    "Each boat model must supply its reverse performance");
  cargoSlot.update(0, input);
  cargoSlot.dispose();
  const yachtSlot = createBoatSlot(boatPresets.yacht);
  assert(yachtSlot.configuration.model === "yacht", "Yacht preset must load the yacht model");
  assert(yachtSlot.root.getObjectByName("yacht-hull"), "Yacht model must contain its hull");
  assert(yachtSlot.root.getObjectByName("yacht-wheel"), "Yacht model must contain its animated helm");
  assert(yachtSlot.profile.physics.maxSpeedKnots === 70,
    "Yacht model must reach its 70 knot development speed");
  assert(yachtSlot.profile.physics.lengthMeters === 15.8
      && yachtSlot.profile.physics.massKg === 18500,
    "Yacht collision and acceleration must use its full-scale dimensions");
  assert(yachtSlot.profile.physics.enginePowerKw === 2684,
    "Yacht must use the twin-engine power profile");
  yachtSlot.update(0, input);
  const yachtNavigation = yachtSlot.root.getObjectByName("yacht-nav-screen")
    ?.userData.navigation;
  assert(yachtNavigation?.latitude === input.latitude
      && yachtNavigation.longitude === input.longitude
      && yachtNavigation.heading === input.heading,
    "Yacht navigation screen must receive live geography and heading");
  yachtSlot.dispose();
  return { passed: true, checkedResources: resources.size, repeatedSwaps: 8,
    models: ["classic", "cargo", "yacht"] };
}
