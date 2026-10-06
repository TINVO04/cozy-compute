# Vehicle art and gameplay record

The two-tier shrine shown in the reference is replaced by Gara Bạc Hà at (624, 784), south of the plaza. The eastern pagoda remains separate.

- Engine: Phaser 3 / Canvas textures; orthographic town view, 32 px tiles; desktop web.
- Showroom: 162 × 142 px, bottom-center pivot, existing 128 × 48 px collision footprint.
- Vehicles: 48 × 40 px transparent canvas, four directions, nearest filtering, bottom contact at 37 px. Mint and terracotta bodies, dark teal outlines, pale aqua glazing, warm cream lights.
- Traffic: four junctions matching the existing asphalt; server time drives three-light signals. Horizontal/vertical phases each have 10 s green, 2 s yellow, 2 s all-red clearance.
- Source: original code-native pixel rectangles in `apps/web/src/art/vehicle.ts`; no third-party bitmap assets or image-generation inputs. Existing project artwork is retained around the showroom. Created 2026-10-05.
- Runtime labels remain text. No baked lettering in the textures. Related variants share canvas size and palette roles.
- Verification: browser captures `output/vehicle-showroom.png` and `output/vehicle-intersection.png`; rendering smoke tests at 1280 × 720, 1440 × 900, 1920 × 1080.

## Play

Open Gara Bạc Hà with E at its forecourt or the garage button in the HUD. Buy and select a car, then press V on the road or driveway. WASD/arrows drive; releasing keys stops; V returns to walking. Cars are stored as persistent inventory; mounting is temporary town-room state and resets on room changes. Mini Mint costs 1,200 Coin (1.6× walking speed); Sunset costs 3,200 Coin (2×).

Red-light entry costs 80 Coin; driving off-road continuously for one second costs 40 Coin. The driveway is exempt. Off-road speed is 90 px/s. Fines cap at the current balance, never produce debt, and dismount the player. Pedestrians are exempt. No wrong-lane or speeding tickets are implemented.

Ownership, speed, violations and fine amounts are checked on the server. Purchases and fines use transactional ledger entries and idempotency keys. The realtime server retries failed fine settlement using the original ticket key and blocks mounting while settlement is pending.

## Runtime

### Showroom and headlights

The physical forecourt at (624, 824) now opens a shared, walkable 640 × 480 showroom. Town validates the doorway position and issues a short-lived one-use entry pass. The showroom uses authoritative walking collisions around four vehicle display plinths. Approach a display and press E to inspect, rotate, buy and equip that vehicle; leave with the exit button or Escape. Returning to town places the player on the garage forecourt.

Vehicle purchases require fresh server-published showroom presence. Existing purchase replay and balance locking remain in place. Equipped vehicles expose a persistent mount button and guidance in the town HUD; mounting is enabled on roads or the forecourt. Headlights follow replicated heading and position, with automatic brightness from the same weather/time lighting model as town streetlamps, plus a red rear light. Bicycle beams are shorter than motorcycle and car beams. Light objects are reused and disposed with their avatar.

### Two-wheel extension

Xe đạp Mây Xanh (bicycle_sky): 200 Coin, 195 px/s (1.3× walking). Xe máy San Hô (motorcycle_coral): 700 Coin, 270 px/s (1.8× walking). Both use the same persistent ownership, vehicle equipment slot, mount controls, and traffic fines as cars.

Their original code-native sprites use the same 48 × 40 canvas, with four directions and two wheel/pedal frames. Bicycle silhouettes use hollow wheels and a triangular sky-blue frame; the coral motorcycle uses a filled engine fairing and headlight. The player's existing avatar supplies the visible seated rider, preserving identity and clothing. Reduced-motion mode holds the wheel frame still. No external assets were added.

Run the normal API migration/startup (`pnpm migrate`) to apply `0007_vehicles.sql` and seed the two catalog entries; restart the realtime process to load the schema. Existing owned cars survive reconnects and server restarts.
