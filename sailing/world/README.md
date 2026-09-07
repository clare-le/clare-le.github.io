# Coastal world

`coast-data.js` retains only Taiwan main island and the largest Penghu polygon
from the geoBoundaries TWN ADM0 geometry. The rings are simplified for the
mobile game and remain in WGS84 longitude/latitude order.

Source: <https://www.geoboundaries.org/api/current/gbOpen/TWN/ADM0/>

`geography.js` projects those coordinates around the Kaohsiung Harbor spawn.
Geographic distances are rendered at 1:10 scale, while the WGS84 coordinates
remain the source of truth. Movement uses a smooth navigation multiplier:

- within 2 km of the nearest coast: 1x
- between 2 km and 12 km: smooth transition
- beyond 12 km: 10x

The coastline polygons are shared by rendering, nearest-shore distance, shallow
water resistance, and hull collision. Do not derive coordinates directly from
the compressed scene scale; use `projectCoordinates` and
`coordinatesFromWorld`.

## Reusable port models

`port-assets.js` owns the reusable geometry and material library for concrete
quays, container yards, port buildings, warehouses, and ship-to-shore gantry
cranes. Container yards use instanced meshes so a large stack remains cheap to
draw on mobile hardware.

`kaohsiung-port.js` is only a WGS84 layout. It places instances of those shared
models at the Qijin and Qianzhen container terminals. Add another port by
creating a separate layout module and passing `projectCoordinates` into its
factory; do not duplicate the model-building code.

Each terminal includes a full-depth reclaimed concrete apron that rises from
below sea level to the same height as the coastal land. Buildings and container
yards must fit entirely inside that footprint. Gantry crane legs remain on the
apron while only their loading booms project over the water.
The apron rectangles also participate in the shared shoreline collision query,
so a vessel cannot pass through the reclaimed terminal land.
