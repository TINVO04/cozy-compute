# Town life artwork

Authored in `apps/web/src/game/town-life.ts` using Phaser Graphics, with no external assets or additional license requirements. Visual target: existing town pixel characters, warm cream highlights, charcoal edges and muted terracotta/teal accents. Orthographic town view, integer pixel clusters, ground-centered pivots, transparent background and nearest-neighbor canvas rendering. Original vector/pixel primitives are retained as source; no generated raster or atlas dependency.

| Family          | Variants                                       | Native footprint | States                                         | Collision                                   |
| --------------- | ---------------------------------------------- | ---------------- | ---------------------------------------------- | ------------------------------------------- |
| Bicycle vendors | Bread, coffee, fruit, ice cream, flowers, corn | 62 × 52 px       | Pedaling wheels/legs, waiting, talking         | Road route; yield to nearby players         |
| Kittens         | Five fur colors                                | 28 × 22 px       | Walking, scampering, grooming, tail motion     | Server ground blockers                      |
| Pigeons         | Three flocks, three birds each                 | 30 × 32 px       | Pecking, walking, flapping, ascending, landing | Server ground blockers on foot; free flight |

Shared silhouette and palette are chosen to fit the existing code-drawn town. Cargo and shirt colors distinguish vendors; small cats remain clearly smaller than avatars; raised wings and separated ground shadows signal pigeon flight. Dialogue stays live text with a keyboard button and screen-reader status.

Verification: ten-minute simulation checks road/ground containment; browser test exercises dialogue, movement, takeoff, landing and restart cleanup. Captures: `output/town-life-vendor.png`, `output/town-life-flock.png`.

Vendors are passing visits: spawn 128 px beyond either main-street gate, travel east at y=362 or west at y=342, and despawn beyond the opposite edge. Arrivals are spaced 18–32 seconds apart, capped at four concurrent visitors, with no duplicate vendor identity in town. Each visit has a fresh ID. Traffic stops and conversations pause the journey; departed IDs are removed from both room snapshots and client display objects. Cats and pigeons remain local wildlife.
