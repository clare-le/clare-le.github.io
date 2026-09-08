Original prompt: 我想你在我的GitHub首頁最下面再加一個網頁，就叫做「電車Go」，系統就是模仿知名的日本遊戲「電車Go」，路線做新竹六家站到竹中站來回。是個遊戲雛形，貼圖不用這麼細節，但是沿途要有一些建物的方塊模型。

## Implementation
- Standalone static ES module game at /train-go/; vendored Three.js with license, no network dependencies.
- Original low-poly cab scenery inspired by train-driving games; simplified 1.2 km Liujia–Zhuzhong route, not a geographic reproduction.
- Planned: traction/braking notches, speed guidance, accurate stopping, return trip, scoring, keyboard/touch, pause/restart/fullscreen.

## Validation
- Pending browser gameplay, full round trip, failure/retry, mobile and deployment checks.

## Completed and verified — 2026-09-08
- Added user refinement: EMU500 four-car consist, silver/blue/orange low-poly bodies, three door pairs per side, roof equipment, exterior camera (C).
- Implemented static /train-go/ page and appended its link below sailing on the homepage.
- Keyboard and touch power/brake/coast/emergency, pause/resume, restart, fullscreen, optional synthesized horn.
- 1.2 km simplified route with instanced buildings, farmland, trees, viaducts, catenary, platforms and station signs.
- Complete outward/return browser test: both stops 1.4 m error and 93 points, stationary dwell interlock, same four physical cars after changing cabs, overspeed/overrun failure and retry all passed.
- Mobile 390 x 844: touch driving, exterior view, emergency stop and no horizontal overflow passed. Desktop fullscreen and optional sound passed. No console/page errors.
- Read and visually checked gameplay, exterior, arrival, completion, mobile and the standard skill-client captures. Fixed mirrored station signs, curved track/platform interference and mobile exterior framing.
- Standard skill client run from an unchanged local copy under project/tool/train-go-tests because the installed skill script could not resolve Playwright; reused existing local Playwright dependency.
- Final visual cleanup hides destination/message behind the start panel, and keeps EMU500 four-car identification visible on mobile.

## Scope / future work
- Prototype only: route geometry, distances, handling and car details are simplified. No real timetable or safety-system simulation.
- Future optional work: geographic alignment, more vehicle detailing and motor sounds. No pending gameplay blockers.

## Route refinement — 2026-09-08
- User supplied a Liujia–Zhuzhong map image and requested matching curvature, roads and rivers.
- Added route.js with shared 1,200 m arc-length sampling based on approximate screenshot geometry. Smooth westward alignment, main straight and gentle Zhuzhong approach replace the old sinusoidal track.
- Added Xinglong Road, Touqian River/wide water/sandbars, Highway 68, Yuanshan Road, plus Wenxing Road and Gaotie 5th Road near Liujia. Road and river strips cross obliquely in the screenshot order.
- Tracks, catenary, platform segments, car positions and both cameras now use shared tangent/normal vectors. Raised railway 6 m; road crossings retain vertical clearance and omit railway piers on roadways.
- Kept the existing same-consist return logic, speed, braking and scoring rules.
- Independent numeric review: minimum curve radius 120.18 m; 20.8 m arc car spacing gives 20.77974–20.80102 m chord spacing; endpoint extension continuous. Crossings: Xinglong ~343 m, river ~442 m, Highway 68 ~549 m, Yuanshan ~1,010 m. These are game units, not real distances.
- Browser verification passed: full outward/return stops both 93 points; pause, emergency braking, overshoot/retry, same-consist reversal, fullscreen, mobile controls all retained. No console/page errors.
- Inspected screenshots for Xinglong, river cab/exterior, Highway 68, Yuanshan, Zhuzhong curve, return approach and mobile river views. No track gaps, road/rail intersections or scenery inside the main river were observed.
- Standard skill-client run and numerical geometry review both passed. Changes ready for GitHub Pages publication.
