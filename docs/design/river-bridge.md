# Living Hóa An bridge

The twin bridge is 176 world pixels wide (two 78 px decks and a 20 px gap), twice its earlier width. Shared geometry in `river-bridge.ts` drives the art, physical piers, deck occlusion, water exclusion, and traffic lanes. The boat channel between the four piers remains open.

Artwork is authored with canvas/Phaser primitives, using the existing orthographic pixel palette: blue steel rails, charcoal asphalt, light stone sidewalks, cream headlights, and muted vehicle colors. No external media or license dependencies. Integer coordinates, nearest sampling, transparent traffic layers. Existing bridge is the visual target; vehicles are removed from the baked landscape.

| Family      | Variants and size                                                | Motion and anchoring                                                 |
| ----------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| Vehicles    | Cars 32×17, buses 48×17, trucks 60×17, bikes 19×9 px; six colors | Center pivot; four one-way lanes, headlights at night                |
| Pedestrians | 16×24 px; six outfits; 26×36 with umbrella                       | Feet pivot; two sidewalk lanes, alternating steps, umbrellas in rain |
| Bridge      | 1536×176 px deck plus rail/sign/pier details                     | Static geometry, dynamic night lamps                                 |

Traffic visits are derived deterministically from the room's server clock. Randomized gaps, cargo and colors agree across clients; visits start and finish beyond the map edge. The renderer uses two reusable Graphics buffers, without accumulating sprites.

Weather uses the application's shared `/world/weather` polling and clock in `GameCanvas`. River lighting, precipitation, umbrellas, lamps, headlights and waves consume that same telemetry. Rain impacts distinguish deck pavement from river water. Browser verification covers moving traffic, rain/night-to-day transitions, clock advancement and restart cleanup. Captures: `output/river-bridge-night-rain.png`, `output/river-bridge-day.png`.
