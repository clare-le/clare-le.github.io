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
