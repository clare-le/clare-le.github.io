// Keep both finished models available for side-by-side testing.
export const boatPresets = {
  classic: {
    model: "classic",
    parts: {
      hull: "classic",
      helm: "classic",
      windshield: "classic",
      hardware: "classic",
      flag: "pennant",
    },
    colors: {},
  },
  cargo: { model: "cargo", colors: {} },
};

export const boatConfiguration = boatPresets.cargo;

export function selectBoatConfiguration(search = "") {
  const id = new URLSearchParams(search).get("boat");
  return structuredClone(Object.hasOwn(boatPresets, id) ? boatPresets[id] : boatConfiguration);
}
