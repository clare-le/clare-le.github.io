Original prompt: 在 https://clare-le.github.io 首頁最下面新增一個叫做「航海小英雄」的按鈕，進入可在手機直立畫面操作的 3D 航海程式。

## 2026-09-04

- Added the `sailing/` GitHub Pages game with animated sea and sky, a centered helm view, speed and heading displays, and touch/keyboard steering controls.
- Added the `航海小英雄` entry as the last item on the existing project homepage.
- Updated the homepage footer date to `2026-09-05` as requested.
- Verified the homepage on a 390x844 mobile viewport: `航海小英雄` is the seventh and final link, and the footer date is `2026-09-05`.
- Verified the complete click-through to `/sailing/`, nonblank WebGL output, acceleration, braking, left/right steering, responsive canvas sizing, and zero captured browser errors.
- Next: tune steering feel and cockpit proportions from real iPhone Safari feedback.
- Real iPhone Safari feedback: the original parallel side rails looked like two sticks projecting away from the hull.
- Changed both rails into low, dark wooden gunwales that follow the narrowing edges of the bow; sailing controls and camera remain unchanged.
- Verified at 393 x 852 mobile portrait and 1280 x 720 desktop: gunwales remain aligned with the bow, controls respond and release normally, and no console errors were reported.
- Started the driving-feel prototype: persistent 0-5 throttle steps, speed-dependent steering, smoothed rudder/wheel response, and clearer speed/throttle/heading HUD labels.
- Verified real pointer input through the full sequence: throttle up to level 3, hold left, release, hold right, release, then throttle down to level 2; final target speed was 2.8 kn with no stuck controls or console errors.
- Verified layouts at 375 x 667, 393 x 852, and 1280 x 720. HUD now shows speed, throttle step, heading degrees, and an eight-point Chinese bearing.

## 2026-09-05

- Upgraded boat model to a classic vintage wooden runabout yacht (Riva / Chris-Craft retro style).
- Implemented deep polished mahogany topsides with a V-bottom marine navy planing hull and crowned teak foredeck with classic cream racing pinstripe.
- Added curved wrap-around aero windshield with polished chrome frame, tinted glass, and center chrome rearview mirror.
- Added detailed dashboard with padded saddle-tan leather coaming, mahogany fascia, and 3 chrome-bezel instrument gauges (speedometer, tachometer, heading) featuring animated sweeping needles.
- Added retro 3-spoke wood-rimmed sports steering wheel with slotted chrome spokes and gold horn button.
- Added dynamic chrome throttle lever that tilts forward under throttle and backward during braking.
- Added authentic foredeck chrome fittings: dual trumpet air horns, cowl engine vents, deck cleats, teardrop ruby/emerald navigation light, cockpit ring lifebuoy, and a fluttering bow yacht club pennant.
- Hotfix: renamed the second `speedRatio` variable in the update loop so the upgraded boat scene can load instead of stopping on a duplicate-identifier syntax error.
- Refined the cockpit hierarchy for mobile: warmer cabin material and leather trim, smaller wheel, larger warm-lit gauges, slimmer windshield frame, rounded throttle base, and an inset lifebuoy.
- Removed the boxy cockpit-side coaming and raised chrome gunwale rails after viewport review showed they still read as floating sticks.
- Verified the final cockpit at 393 x 852, 375 x 667, and 1280 x 720; throttle and steering remained functional and no browser errors were captured.
- Real-device direction correction: removing both side structures left the cockpit visually open. Added solid tapered mahogany cockpit side panels with flush leather top trim, avoiding detached rail geometry.
- Iterated the new side panels from vertical planes to inward-sloped surfaces so they have visible width from the helm; narrowed and darkened the leather trim after desktop review.
- Verified the filled cockpit at 393 x 852 and 1280 x 720 with working throttle/steering and no browser errors.
- Rebuilt the cockpit from the shared-boundary prompt: dashboard, floor, both side walls, and both top trims now use one indexed `BufferGeometry` with shared seam vertices and material groups instead of overlapping independent meshes.
- Extended the same floor and side-wall boundary vertices beneath the camera so the cockpit remains visually closed at the bottom edge.
- Verified the connected shell at 375 x 667, 393 x 852, and 1280 x 720. Acceleration and both steering directions update correctly, with no browser errors.
- Rebuilt the bow flagstaff around one vertical anchor: the stem cap reaches the deck, the socket overlaps the pole base, and the pennant root intersects the pole. Flutter now deforms only the free tip so the attached edge cannot drift away.
- Moved only the chase camera forward, reducing its trailing distance from 1.78 to 1.45 boat units. The boat model and its parts remain unchanged, while the full steering wheel stays above the throttle buttons on portrait phones.
- Lowered only the camera height from 1.58 to 1.50 boat units, preserving the forward distance and all boat geometry.

## 2026-09-06

- Added world-position sea ripples with distance fading, preserving the existing sea lighting. Wave heights now use the same world coordinates so surface detail travels past the boat consistently.
- Added a fixed pool of 240 bow-spray particles in one draw call. Actual speed controls emission and spray strength; existing particles move independently of steering and fade after stopping. Boat geometry and camera settings remain unchanged.
- Tuned spray height and spread from portrait screenshots to keep droplets visible beside the bow without obscuring the helm or controls.
- Verified Chromium at 393 x 852, 375 x 667, and 1280 x 720, plus Playwright WebKit at 393 x 852: idle, 1.3 kn, 8.5 kn, turning, and braking to rest. Canvas pixel checks passed; no console errors; spray count increases with speed and returns to zero after stopping. Also ran the game skill's action/screenshot client.
- Next: real iPhone Safari feedback on motion, spray intensity, and sustained performance; no real-device performance claim yet.
- Extracted the classic boat into hull, helm, windshield, flag, hardware, and material modules under `boats/`. Kept the connected cockpit shell together in the hull module.
- Added `boats/config.js`, compatible part/model registries, hull mounting points, and model-owned camera/spray profiles. The default boat remains visually identical; optional windshield, flag, and hardware can be disabled or replaced through configuration.
- Added a stable boat slot with validated replacement, current-control initialization, invalid-configuration rollback, and deduplicated GPU resource disposal. The gameplay no longer references internal wheel, gauge, throttle, or flag meshes.
- Chromium and WebKit contract tests passed: 64 default meshes exactly match pre-extraction geometry, materials, and world transforms; 85 allocated mesh resources disposed once; eight repeated swaps, custom part anchors, alternate model/profile, and failure rollback passed. Contract tests and authoring instructions are retained in `boats/tests.js` and `boats/README.md`.
- Compared all animated mesh transforms/attributes against the pre-extraction model after 20 update steps in both browsers; they match. Rechecked throttle, steering, stopping, spray cleanup, canvas pixels, and screenshots at both portrait sizes and desktop, with no browser errors.
- Added a second complete `cargo` model: green workboat hull, forward cargo hatch, enclosed wheelhouse with front/side glass, metal console, five-spoke wheel, three animated gauges, throttle, and radio. It supplies cargo-specific camera and bow-spray positions.
- Kept the original wooden runabout available with `?boat=classic`; `?boat=cargo` and the default URL load the small cargo boat for review.
- Tuned the cargo cabin palette and ceiling light after portrait/desktop review. Raised the connected cabin shell 0.015 units above the underlying deck to remove coplanar z-fighting while retaining shared floor/side-wall boundary vertices.
- Verified cargo at 375 x 667, 393 x 852, and 1280 x 720, including WebKit portrait. Idle through full speed, left/right steering, braking to rest, animated wheel/gauges/throttle, model-specific spray, canvas pixels, and console errors all passed. Rechecked classic via `?boat=classic` after cargo became the default.
- Added center-screen drag look: horizontal pointer movement rotates the driver's view up to 90 degrees port or starboard. Releasing the pointer returns the view toward the bow with exponential damping; HUD and bottom control regions do not start the gesture.
- Verified the drag look in Chromium and WebKit at 393 x 852 for both cargo and classic boats: limits reached +90/-90 degrees, release eased to 27 degrees after 0.5 seconds and centered after 3 seconds, throttle controls remained independent, and no page or console errors appeared.
- Closed the cargo boat's bow bulwarks by extending both side panels and their top rails to the shared bow-tip vertex. Rechecked the forward view plus both camera-look directions in Chromium and WebKit; cargo and classic remained error-free.
- Added per-model physics profiles. The 4.1 m / 820 kg / 74.6 kW classic runabout now reaches 21.8 kn after 6 seconds and 23.9 kn after 15 seconds; the 7.1 m / 4,800 kg / 110 kW cargo boat reaches 6.2 kn and 9.4 kn. Knots now convert to world metres per second, while acceleration response derives from power per tonne and model propulsion efficiency.
- Separated deceleration, steering response, turn rate, heave, pitch, heel, camera motion, and speed-relative spray. In Chromium and WebKit, a two-second full-speed turn produced 69 degrees for classic versus 21 degrees for cargo; three seconds after idle command left 2.8 kn versus 5.0 kn. Both models, module replacement tests, center drag look, control isolation, screenshots, and console checks passed.
