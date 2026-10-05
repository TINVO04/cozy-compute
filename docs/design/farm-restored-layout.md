# Restored farm layout

The farm follows the original spatial arrangement: shop and warehouse to the north, pond to the northeast, livestock to the west and south, and 36 crop plots to the southeast. The goat enclosure has its own footprint instead of overlapping the cattle yard.

The 48 × 32 map uses 32px tiles. `FARM_POIS`, `FARM_PATHS`, `FARM_GARDEN`, `FARM_BLOCKERS` and `getFarmPlotRect` in game-data define both client placement and server collision. Pen entrances are 64px wide. Plot indices and stored progress are preserved.

The runtime generates a native Tiled Ground layer plus collision and POI object layers. It does not stack a painted background under an unrelated Sprout terrain map. Buildings, trees and the bench reuse the main town renderers and palette. Sprout chicken and cow sprites remain animated inside their corresponding pens. New art is limited to the terrain atlas, timber enclosure module, well and small shoreline details.

Validation: `farm-layout.test.ts` checks separation and traverses the actual movement function from the gate to every pen, both buildings and all 36 plots. `farm-render.spec.ts` checks the live Phaser scene, plot alignment, a single terrain layer, actual shop/warehouse clicks and browser errors at 1280×720, 1920×1080, 1440×900 and 1536×1024. Screenshots are written to `output/farm-restored-*.png`.
