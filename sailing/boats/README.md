# Modular Boats

`config.js` selects the boat loaded by the game. The default is currently the
small cargo boat; the original classic runabout remains available.

- Small cargo boat: `/sailing/?boat=cargo`
- Classic runabout: `/sailing/?boat=classic`

## Configuration

```js
export const boatConfiguration = {
  model: "classic",
  parts: {
    hull: "classic",
    helm: "classic",
    windshield: "classic", // "none" also supported
    hardware: "classic",   // "none" also supported
    flag: "pennant",       // "none" also supported
  },
  colors: {
    // mahoganyMaterial: 0x752b14,
  },
};
```

Omitted parts use their defaults. Unknown models, part names, or material names
throw an error. There are currently two finished models: `classic` and `cargo`.
The classic model supports the interchangeable parts shown above. Cargo currently
uses its matched workboat hull, wheelhouse, and helm assembly.

## Files and Ownership

- `index.js`: model registry and stable boat slot; replacement and disposal.
- `classic/index.js`: compatible part registry, assembly, and animation dispatch.
- `classic/hull.js`: connected hull, deck, cockpit shell, mounting points, and profile.
- `classic/helm.js`: instruments, throttle lever, steering column, and wheel animations.
- `classic/windshield.js`: windshield, frame, and mirror.
- `classic/flag.js`: local flagstaff assembly and fixed-root pennant animation.
- `classic/hardware.js`: navigation lights, horns, vents, cleats, and lifebuoy.
- `classic/materials.js`: a fresh material palette for each boat instance.
- `cargo/hull.js`: workboat hull, connected cabin shell, windows, and cargo hatch.
- `cargo/helm.js`: five-spoke wheel, working gauges, throttle, and radio.
- `three.js`: shared Three.js version for the game and every model module.
- `tests.js`: browser-side contract and replacement tests.

## Replacing a Part

A part factory receives `{ materials, anchors }` and returns
`{ root: THREE.Object3D, update?: (dt, input) => void }`.
Register it under the appropriate slot in `classicParts`, then select its name
in `config.js`. Each slot has a separate registry, so a flag cannot accidentally
be used as a hull.

The hull is built first and supplies `anchors` and `profile`. The assembler
positions each other part's root at `anchors[slot]`. Coordinates use x right,
y up, and negative z forward. Anchor arrays contain `[x, y, z]`.
The default helm, windshield, and hardware use the boat origin; the flag uses
the bow mounting point. Model each replacement around its designated origin.

Keep the hull, deck, cockpit floor, and side-wall boundaries in the hull module.
They form the connected structural shell. A new hull must supply compatible
mounting points and space for its chosen parts; sharing an anchor alone cannot
guarantee that arbitrary shapes will fit without gaps or intersections.

Animation input is read-only and contains:

```js
{ rudder, throttle, gear, speed, speedRatio, heading, time }
```

`rudder` is -1 to 1; throttle is -1 in reverse and 0 to 1 from neutral through
forward; gear is -1, 0, or 1; speed is signed knots; speedRatio is the absolute
speed divided by forward maximum speed. Heading is clockwise radians; time and
dt are seconds.
On replacement, `update(0, lastInput)` initializes the new model to current
controls immediately. Parts must support this zero-duration initialization.

## Replacing an Entire Boat

Add an independent factory to `boatModels` in `index.js` and select its model id
in `config.js`. It must return:

```js
{
  root,                  // fresh Object3D, with boat-local geometry
  profile: {
    camera: { distance, height, lookAhead, lookHeight },
    spray: { forward, halfWidth },
    waterline,
    physics: {
      lengthMeters, massKg, enginePowerKw, maxSpeedKnots,
      reverseSpeedKnots, reverseThrustFactor,
      propulsionFactor, decelerationResponse, throttleCurve,
      rudderResponse, minSteerageKnots, turnRateAtMax,
      motion: {
        heave, heaveFrequency, pitch, pitchFrequency,
        accelerationPitch, heel, roll, cameraHeave,
      },
    },
  },
  update(dt, input) {},
  dispose() {},
}
```

The profile defines the helm view, bow-spray origins, base floating height, and
the boat-specific performance model. The gameplay code derives acceleration
response from engine power per tonne, applies the model's propulsion factor,
converts displayed knots to metres per second, and reads the remaining steering,
deceleration, and motion values directly from the profile.

Current values are gameplay estimates based on the meshes' metre-scale lengths,
not manufacturer specifications:

| Model | Length | Simulated mass | Engine | Forward max | Reverse max |
| --- | ---: | ---: | ---: | ---: | ---: |
| Classic runabout | 4.1 m | 820 kg | 74.6 kW / 100 hp | 24 kn | 4.5 kn |
| Small cargo boat | 7.1 m | 4,800 kg | 110 kW / 148 hp | 10.5 kn | 3.5 kn |

The shared control has one reverse detent below neutral: `R, 0, 1, 2, 3, 4, 5`.
A direction change first applies active braking to zero, then builds speed in the
new direction. Rudder yaw and visual heel reverse with signed boat speed.

The gameplay code owns movement, boat motion, water effects, and controls.
The model owns meshes and their animations. A different model can use its own
internal structure without using the classic part registry.

The boat slot also supports runtime replacement for future selection interfaces:

```js
const vessel = createBoatSlot({ model: "classic" });
scene.add(vessel.root);
vessel.replace({ model: "classic", parts: { flag: "none", hardware: "none" } });
```

`replace` receives a complete configuration, not a patch. It builds and validates
the next model before replacing the old one. A failed replacement leaves the
current model in place. The stable root preserves position and rotation; the
game keeps its current speed and control state. Read `vessel.profile` after a
replacement rather than caching the previous profile.

Each model must own its resources. Do not share disposable geometries, materials,
or textures across separate boat instances. `disposeModel` deduplicates resources
within a model before freeing them. Custom animated parts must not install
independent animation loops, DOM listeners, or other external resources; animate
through `update`. More elaborate model factories must handle their own cleanup.

## Verification

With the game served over HTTP, run in a browser module context:

```js
const { runBoatModuleTests } = await import("./boats/tests.js");
runBoatModuleTests();
```

The tests cover part toggles, hull anchors, whole-model replacement, profile
changes, preserved steering and pose, invalid-configuration rollback, repeated
swaps, and one-time GPU resource disposal. Also inspect mobile and desktop
screenshots and check acceleration, turning, stopping, gauges, flag flutter,
and water effects after changes. Real iPhone Safari remains the final check for
touch ergonomics and sustained performance.
