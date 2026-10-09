# Detailed Technical Survey: Vehicle Mounting, Lighting, UI Integration & Verification

## Executive Summary
This report analyzes the geometric mounting system, vehicle lighting calculations, showroom/shop UI integration, and verification resources for the 16-vehicle asset expansion in Cozy Compute Social MMO. The codebase contains highly structured, mature subsystems for vehicle handling, but requires specific expansions (such as expanding the 8 initial vehicles to 16, adding 4-frame drive animation support across all vehicle types, and connecting the dynamic asset loader with procedural fallback).

---

## 1. Mounting & Visual Geometry

### 1.1 'V' Key & Network Handling
- **Client Input Handler**: `apps/web/src/screens/panels/VehicleControls.tsx` (Lines 42–46).
  - Global `keydown` event listener monitors `e.key.toLowerCase() === 'v'`.
  - Filters out input elements, modals, backdrop, and ensures active room is `'town'` or `'farm'`.
  - Dispatches message: `net.send('vehicle:toggle', {})`.
  - Renders persistent HUD button `<button aria-label={driving ? 'Xuống xe (V)' : 'Lên xe (V)'}>` with mount tooltip guidance.
- **Server Authority**:
  - `TownRoom` (`apps/realtime/src/rooms/town.ts`, Lines 151–177):
    - Toggles mount state. If mounted, clears `p.vehicle = ''`.
    - If mounting: validates that the player owns an equipped vehicle (`this.sessionFor(client.sessionId)?.appearance.vehicle`).
    - Validates traffic enforcement rules: player cannot mount if there are pending fines or if the player is outside roads/driveway: `!onRoad(p.x, p.y) && !onDriveway(p.x, p.y)`.
    - Returns warning `'Đến lòng đường hoặc sân gara để lên xe.'` if attempted off-road.
    - Sets `p.vehicle = vehicle.id;` and initializes traffic position tracker (`this.traffic.set(...)`).
  - `FarmRoom` (`apps/realtime/src/rooms/farm.ts`, Lines 71–90):
    - Allows mounting anywhere on the player's farm without road restrictions.

### 1.2 Two-Wheel Mounting Geometry
- **Implementation File**: `apps/web/src/game/players.ts` (Lines 799–818, 844–848).
- **Avatar Sprite Cropping**:
  - When `riding = driving && (kind === 'bicycle' || kind === 'motorcycle')`:
    - `this.sprite.setCrop(0, 0, 32, 40)` (Line 803).
    - Avatar sprite native size is `32 × 56 px` (`AV_W = 16`, `AV_H = 28`, `AV_SCALE = 2`).
    - Cropping `(0, 0, 32, 40)` preserves the head, shoulders, chest, and waist while clipping off the bottom 16 px (legs and feet).
  - Avatar positioning:
    - Base sprite Y is `baseSpriteY = -AVATAR_FEET_OFFSET / 2 - 3 = -28 px`.
    - While riding: `this.sprite.y = this.baseSpriteY - 4 = -32 px` (Line 847).
    - Animation is halted on the idle frame for the current direction: `this.sprite.stop(); this.sprite.setFrame(this.dir * 3);`.
- **Vehicle Container & Layering**:
  - Container origin `(0, 0)` is at player foot level (ground contact point).
  - Vehicle sprite is added at `(0, -14)` (Line 814): `this.vehicleSprite = this.scene.add.image(0, -14, key)`.
  - Added at index 1: `this.container.addAt(this.vehicleSprite, 1)`.
  - Hierarchy inside `this.container`:
    - `[0]`: `this.shadow` (ground shadow ellipse)
    - `[1]`: `this.vehicleSprite` (vehicle image at `y = -14`)
    - `[2]`: `this.sprite` (cropped player avatar at `y = -32`)
    - `[3]`: `this.label` (floating player name tag)
- **Mathematical Seat Alignment**:
  - Vehicle frame is `48 × 40 px`, centered at `(0, -14)`.
  - In vehicle texture space, the seat center is at `x = 24, y = 16..20 px`.
  - In container coordinates: `y = -14 + ((16..20) - 20) = -18..-14 px`.
  - The cropped avatar extends from `y = -32 - 28 = -60 px` to `y = -60 + 40 = -20 px`.
  - The avatar's cropped waist/hip boundary at `-20 px` meets the vehicle seat at `-18..-14 px`, creating zero-gap alignment without legs clipping through the motorcycle engine or bicycle crankset.
  - Footpeg/pedal location is at `y = 28..33 px` in the vehicle frame, matching container `y = -6..-1 px`, aligning with the base of the rider's posture.

### 1.3 Four-Wheel Mounting Geometry
- **Avatar Visibility**:
  - In `apps/web/src/game/players.ts` (Line 806):
    `this.sprite.setVisible(!driving || riding);`
  - For four-wheel cars (`riding === false`), `this.sprite.setVisible(false)`. The avatar is completely hidden inside the car.
- **Cabin Glazing & Reflections**:
  - Current procedural cars in `apps/web/src/art/vehicle.ts` use pale cyan/sky blue reflections (`#93c5fd`) for windshields, side windows, and rear glass.
  - Pixel-art assets must preserve clean specular streaks across the A-pillar and roofline to evoke glass depth.
- **Contact Shadow & Ground Placement**:
  - Ground ellipse `this.shadow` (`22 × 8 px`, opacity 0.25) sits at `(0, 0)`.
  - Vehicle sprite bottom edge extends to container `y = -14 + 20 = +6 px`.
  - The vehicle wheel contact line is located at `y = 37 px` in the 40 px frame.
  - In container coordinates: `-14 + (37 - 20) = +3 px`, directly touching the ground shadow plane.

### 1.4 Vehicle Dimensions & Town Road Collision
- **Road Corridor Definition**:
  - `packages/game-data/src/vehicles.ts` (Lines 101–106):
    ```ts
    export const TOWN_ROADS: Rect[] = [
      { x: 32, y: 332, w: 1472, h: 40 },
      { x: 332, y: 320, w: 40, h: 576 },
      { x: 1036, y: 320, w: 72, h: 576 },
      { x: 96, y: 844, w: 1024, h: 40 },
    ];
    ```
  - The narrowest road width is `40 px`.
  - The vehicle body width is constrained to $\le 40\text{ px}$ (typically 36–38 px in the 48 px frame).
- **Traffic Enforcement & Off-Road Penalties**:
  - Evaluated on server tick in `apps/realtime/src/rooms/town.ts` (Lines 404–421):
    ```ts
    const moving = p.x !== prev.x || p.y !== prev.y;
    const offRoad = !onRoad(p.x, p.y) && !onDriveway(p.x, p.y);
    prev.offRoadMs = moving && offRoad ? prev.offRoadMs + this.trafficStepMs : 0;
    ```
  - If `prev.offRoadMs >= 1000` (1 continuous second of driving outside roads):
    - Violation: `'off_road'`.
    - Fine: 40 Coin (`TRAFFIC_FINES.off_road = 40`).
    - Vehicle is immediately dismounted: `p.vehicle = ''`.
    - 5-second fine cooldown is enforced.
    - Because `onRoad(p.x, p.y)` checks the player center `(p.x, p.y)`, maintaining vehicle width $\le 40\text{ px}$ guarantees that as long as the vehicle is visually within the asphalt, the player center remains within `TOWN_ROADS`, preventing accidental off-road tickets.

---

## 2. Vehicle Lighting & Raytracing

### 2.1 VehicleLights Implementation
- **Source File**: `apps/web/src/game/vehicle-lights.ts`.
- **Texture Generation**:
  - Generates a reusable 128 × 96 px canvas texture `'vehicle:headlight-beam'`.
  - Conical beam gradient from `rgba(255, 239, 175, 0.65)` to transparent at 128 px.
  - Image object rendered with `Phaser.BlendModes.ADD` at `depth = 2601`.
  - Bulbs graphics object rendered with `Phaser.BlendModes.ADD` at `depth = 2602`.

### 2.2 Vector Coordinate Calculation
- **Direction Angles**:
  - Down (0): $\pi/2$
  - Left (1): $\pi$
  - Right (2): $0$
  - Up (3): $-\pi/2$
- **Unit Vectors**: $dx = \cos(\text{angle})$, $dy = \sin(\text{angle})$.
- **Front Headlight Origin**:
  - $x_{\text{front}} = x + dx \times 20$
  - $y_{\text{front}} = y - 10 + dy \times 18$
- **Bulb Lateral Offsets**:
  - Cars: dual headlights with lateral offsets `offset in [-8, 8]`:
    - $bx = x_{\text{front}} - dy \times \text{offset}$
    - $by = y_{\text{front}} + dx \times \text{offset}$
    - Halo: 7 px radius, fill `0xffe8aa`, alpha `0.18 * brightness`.
    - Core bulb: 4 × 4 px rectangle, fill `0xfff6d7`, alpha `brightness`.
  - Bicycles & Motorcycles: single centered headlight (`offset = 0`).
- **Taillights**:
  - Position: $x - dx \times 18$, $y - 10 - dy \times 18$.
  - Red glow: radius 2 px, fill `0xff5544`, alpha `0.8 * brightness`.
- **Beam Scaling**:
  - Bicycle: `scale(0.65, 0.7)` (narrower, shorter beam).
  - Motorcycle: `scale(1.0, 0.7)` (standard length, narrower cone).
  - Car: `scale(1.0, 1.0)` (full wide beam).

### 2.3 Solar Time & Ambient Lighting Integration
- Evaluated via `calculateBienHoaLighting(weather.solarHour, weather).lampBrightness` in `apps/web/src/game/weather-engine.ts`.
- Lights automatically engage when `lampBrightness > 0.05` (night, dusk, dawn).
- Additive blending creates soft volumetric lighting against ground textures and environmental props without requiring custom WebGL fragment shaders.

---

## 3. Showroom & Shop UI Integration

### 3.1 Showroom Pedestals
- **Source Files**:
  - `packages/game-data/src/vehicles.ts` (Lines 115–126).
  - `apps/web/src/game/showroom-art.ts` (Lines 443–534, 635–712).
  - `apps/web/src/game/showroom-scene.ts`.
- **Pedestal Dimensions**:
  - Width: `pw = 136 px`.
  - Height: `ph = 66 px`.
  - Centered at display coordinates:
    - Display 0: `(168, 156)`
    - Display 1: `(472, 156)`
    - Display 2: `(168, 308)`
    - Display 3: `(472, 308)`
- **Display Vehicle Rendering**:
  - Placed at `(display.x, display.y - 6)` with direction 2 (profile view).
  - Scale: `.setScale(2)` (2x crisp integer scaling).
  - Subtle hover tween: `y: display.y - 8`, period 2200 ms.
  - Floating spec nameplate at `display.y + 36` and interactive 'E' kiosk badge at `display.x - 68, display.y + 22`.

### 3.2 VehicleShopPanel UI
- **Source File**: `apps/web/src/screens/panels/VehicleShopPanel.tsx`.
- **Preview Component**:
  - `VehiclePreview`:
    - Rendered via `<img width={144} height={120} style={{ imageRendering: 'pixelated', objectFit: 'contain' }} />`.
    - Native texture is `48 × 40 px` $\implies$ `144 × 120 px` is exactly **3x scale**.
    - "Xoay xe" button increments `dir = (dir + 1) % 4` across all 4 directions (Down, Left, Right, Up).
- **Economy Integration**:
  - Purchase uses `POST /shop/buy` with idempotency key.
  - Equipping uses `POST /inventory/equip` (`slot: 'vehicle'`).
  - Requires valid player position inside Showroom or Town.

### 3.3 Inventory Icons & Item Definitions
- **Item Definitions**:
  - `packages/game-data/src/items.ts` maps `VEHICLES` into `ITEM_SEEDS` with `slot: 'vehicle'`, `type: 'vehicle'`, `sprite: v.id`.
- **Icon Generation**:
  - `apps/web/src/art/items.ts` (`itemIcon` function, Lines 20–24):
    - When `type === 'vehicle'`, calls `vehicleCanvas(sprite).toDataURL()`.
    - For static assets, each vehicle pack directory (`assets/vehicles/<category>/<id>/`) provides `icon.png` (32x32 or 48x40) alongside `preview.png` and `spritesheet.png`.

---

## 4. Existing Verification Resources

| Resource | File Path | Scope & Functionality |
|---|---|---|
| **Town Preview Script** | `output/vehicle-preview.mjs` | Playwright script that navigates to `/e2e/fixtures/town.html`, verifies camera centering on showroom forecourt (`624, 740`) and intersection (`1072, 352`), and captures screenshots. |
| **Vehicle UI Check** | `output/vehicle-ui-check.mjs` | End-to-end integration test: registers user, grants coins via Postgres, launches browser, buys vehicle, equips, walks to road (`y >= 816`), mounts with `V`, verifies "Xuống xe (V)", and dismounts with `V`. |
| **Showroom UI Check** | `output/showroom-ui-check.mjs` | Walks from town to showroom door (`624, 816`), presses `E`, enters showroom, walks to pedestal, rotates vehicle with "Xoay xe", buys, equips, exits to forecourt, and tests night lighting. |
| **Showroom E2E Spec** | `apps/web/e2e/showroom.spec.ts` | Vitest/Playwright test verifying 4 vehicle pedestals, spotlight overlays, particle effects, and capturing `output/showroom-luxury-vehicles.png`. |
| **Game Data Test Suite** | `packages/game-data/src/vehicles.test.ts` | Unit tests for traffic signals, red-light detection, driving speeds on/off road, and anti-tunneling wall collisions. |
| **Showroom Unit Tests** | `apps/web/src/game/showroom.test.ts` | Unit tests for 640x480 showroom bounds, corridor clearance, interaction radius, and procedural texture generation. |
| **Realtime Room Tests** | `apps/realtime/src/rooms/vehicles.test.ts` | Tests mounting on roads, rejection off-road, red-light ticket issuance and retry mechanisms. |
| **API Test Suite** | `apps/api/test/vehicles.test.ts` | Tests `/shop/buy`, idempotency key replay, `/inventory/equip`, and appearance persistence. |

---

## 5. Architectural Recommendations for Implementation Agents

1. **Expanding Vehicle Definitions**:
   - `packages/game-data/src/vehicles.ts` currently defines 8 vehicles (`bicycle_sky`, `motorcycle_coral`, `motorcycle_ducati`, `car_mint`, `car_mercedes`, `car_sunset`, `car_lamborghini`, `car_porsche`).
   - Must be expanded to all 16 vehicles specified in the project prompt, with aliases preserving backward compatibility for existing accounts.
2. **Dynamic Asset Loader with Seamless Fallback**:
   - Create a loader module (`apps/web/src/art/vehicle-loader.ts` or within `apps/web/src/art/vehicle.ts`) that checks for PNG spritesheets in `assets/vehicles/` (or `apps/web/public/vehicles/`).
   - If spritesheet is loaded, register frames `[Down, Left, Right, Up] × [Idle, Drive 1, Drive 2, Drive 3]`.
   - If not loaded, immediately fall back to `vehicleCanvas()` so that there are zero frame drops, white screens, or crashes.
3. **Driving Animation Frames**:
   - In `apps/web/src/game/players.ts` (Line 811), currently only two-wheelers animate and only alternate between 2 frames (`Math.floor(time / 160) % 2`).
   - When 4-frame spritesheets are integrated (1 idle + 3 driving frames), moving vehicles should cycle through driving frames 1..3, and idle when stationary (`frame = 0`).
