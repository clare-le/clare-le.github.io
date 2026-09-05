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
