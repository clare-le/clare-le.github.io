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
models inside the land polygon shown by the simplified Kaohsiung map. Add another port by
creating a separate layout module and passing `projectCoordinates` into its
factory; do not duplicate the model-building code.

The terminal's paved apron sits on the existing coastal terrain rather than
creating new land in mapped water. Automated footprint sampling verifies the
whole apron against the authoritative land polygon. Buildings, container yards,
and gantry-crane supports must also fit entirely inside the apron.
