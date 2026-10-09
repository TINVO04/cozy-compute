# Farm art direction — town continuity

The visual reference is the live town renderer in `apps/web/src/art/town-landscape.ts`.
The selected direction uses its muted meadow greens, limestone, cream plaster,
terracotta tiles, timber outlines and turquoise water. The farm has a working rural
identity: striped shop veranda, grain silo, fenced livestock yards, a kitchen garden
and a lotus pond. Buildings remain the focal points; ground texture has low contrast.

## Technical frame

- Phaser, orthogonal top-down terrain with front-facing building facades.
- World: 1536 × 1024; native tile grid: 32 × 32; nearest-neighbor filtering.
- Terrain is painted once and exposed through one native Tiled ground layer.
- Town trees are reused at the existing farm scale, with an authored fruit variant.
- Crops remain separate 56 × 48 state textures in the authoritative 36-plot grid.
- Upper-left highlights, warm muted shadows, 1px material details at native scale.
- New orchard trunks are defined in shared `FARM_GARDEN.trees`; both server and client
  derive their collision rectangles from that list. Southern trunks sit in the existing
  boundary strip so their canopies do not hide the livestock yards.

## Asset manifest and provenance

All changes are authored Canvas drawing code in this repository. No new external
images, downloads, fonts, generated raster assets or license dependencies were added.
Existing livestock assets and animations retain their existing provenance.

| Family           | Source                           | States / placement                                                        | Collision role                                            |
| ---------------- | -------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| Shared materials | `farm-detail.ts`, `TOWN_PALETTE` | Pixel boxes, scanline ellipses, flowers, tiles, rails                     | None; drawing helpers                                     |
| Farm terrain     | `farm-landscape.ts`              | Meadow, joined lanes, limestone square, garden gravel, pond and landing   | Existing shared map boundaries                            |
| Shop and silo    | `farm-scenery.ts`                | Town building base plus veranda, vines, cylinder, loading doors           | Existing building footprints                              |
| Livestock pens   | `farm-scenery.ts`                | Four ground materials, shelters, nest eggs, troughs, capped rails, labels | Existing shelter and rail footprints, open southern gates |
| Trees            | `farm-scenery.ts`, `map.ts`      | Town canopy and fruit variant; bottom-center anchor                       | Shared trunk rectangles                                   |
| Crop beds        | `farm-props.ts`                  | Locked, dry, watered, seed, sprout, blooming, mature; five crop species   | Existing plot interaction areas                           |

## Verification

The full farm was inspected in a running Phaser scene at native resolution alongside
the town reference. Browser coverage includes four viewport sizes (1280 × 720,
1440 × 900, 1920 × 1080 and 1536 × 1024), all terrain/building/plot textures,
shop and silo clicks, starter and locked plot clicks, livestock persistence and
night thunderstorms. Existing route tests cover every plot and facility from the gate.

Review artifacts: `output/farm-redesign-day.png`, `output/town-redesign-day.png`,
`output/live-farm-weather-verified.png`. The fixture uses deterministic clear daylight;
production weather remains live and weather tests explicitly exercise storms and night.
