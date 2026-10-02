# Town rebuilt as independent game components

The reference in `town-reference.jpg` guides the town layout and pixel-art palette. It is documentation only: the game neither loads it nor extracts sprites from it. `town-overview.png` captures the playable scene; `town-components.png` shows individual transparent assets.

`apps/web/src/art/town-detail.ts` constructs the scene from cached Canvas textures. Buildings, houses, temple tiers, roof tiles, shutters, shop displays, food carts, scooters, palms, fruit trees and boats are drawn in code. Every building, scenery item, prop and tree is a separate Phaser object, with depth anchored to its ground position so avatars can walk behind and in front of it. The static ground painter draws roads, plaza stones, planted beds, water, dock planks and paths.

The town includes all 11 usable buildings, a four-tier Bửu Long pagoda with an enclosed garden and separate wooden entrance sign, a two-tier plaza shrine, western/eastern houses, seven distinct southern houses, Bún riêu and Nước mía carts, six scooters drawn from an oblique overhead angle, palms, a T-shaped dock and four boats. Fashion, furniture and apartment buildings have distinct facades. Existing detailed venue painters and indoor scenes remain connected to their entrances.

Main roads use a continuous grey asphalt surface with concrete sidewalks and curbs. Stone tile joints are restricted to the fountain square and courtyard details. Vehicles, courtyard gate and temple perimeter walls follow the additional close-up references supplied by the user. Roof tiles, eave shadows, dormer frames, glazing, chrome scooter details and tree foliage are drawn individually.

`packages/game-data/src/town-scenery.ts` defines the additional solid scenery footprints, shared by browser prediction and server movement. The connected promenade, entrance zones and fishing pier retain their gameplay roles. Keyboard input, room attachment, delivery indicators, fishing and reduced motion remain supported. Border foliage and boats stay inside existing blocked areas.

The result follows the supplied composition and materials, but is not a pixel-for-pixel reconstruction. Roof proportions, foliage density and some side structures differ. Labels use the actual game venue names rather than distorted lettering in the reference.

Browser verification covers supported desktop sizes, scene restart, reduced motion, Canvas-generated assets, absence of reference-image requests, separate scenery objects and avatar depth ordering. Live verification covers connection, keyboard movement and opening/dismissing the game panel. Required project gates are format, lint, typecheck and tests.
