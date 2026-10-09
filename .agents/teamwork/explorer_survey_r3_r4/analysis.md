# Master Vehicle Art Direction: Requirements R3 & R4 Investigation & Plan

> **Role**: Explorer R3 & R4 (Showroom, Shop UI, Storefront, Canvas Fallback Runtime & Asset Synchronization)  
> **Status**: Completed  
> **Target Milestones**: Requirements R3 & R4  
> **Authoritative Specification**: `.agents/teamwork/ORIGINAL_REQUEST.md` (Section `## 2026-10-08T14:57:19Z`) & `DISPATCH.md`

---

## 1. Executive Summary

This report delivers a thorough read-only investigation of **Requirement R3** (*Nâng cấp Showroom Gara Bạc Hà & VehicleShopPanel*) and **Requirement R4** (*Đồng bộ Canvas Fallback Runtime, Tủ kính Gara & Pipeline Assets*).

### Key Findings at a Glance:
1. **Showroom Pedestals (R3)**: Currently, `SHOWROOM_FEATURED_VEHICLES` contains an arbitrary mix of 4 vehicles (`motorcycle_ducati`, `car_mercedes`, `car_lamborghini`, `car_mint`) placed at NW, NE, SW, and SE. The pedestals are completely static with no cycling mechanism. When a player approaches a pedestal, pressing `E` immediately opens the shop panel rather than cycling the vehicle on the pedestal.
2. **Interactive Pedestal Cycling (R3)**: A complete architecture is needed to allow approaching each of the 4 specialized category pedestals, pressing `E` or `[◀]` `[▶]` (ArrowLeft/ArrowRight) to cycle across all 4 vehicles in that category, and updating the vehicle sprite, name, price, and speed ratio on the pedestal in real time.
3. **Vehicle Shop Panel (R3)**: `VehicleShopPanel.tsx` currently only toggles between "Xe đang xem trên bục" and "Tất cả các dòng xe". It lacks the 5 required category tabs (*Tất cả (16)*, *Siêu xe (4)*, *Xe sang & Cơ bắp (4)*, *Mô tô PKL (4)*, *Xe phố & Xe đạp (4)*) and only supports a simple single-direction toggle button rather than true 360-degree rotation preview controls.
4. **Storefront Window Display (R3 / R4)**: In `apps/web/src/art/vehicle.ts` (`paintVehicleDealer`), the two display windows are hardcoded to show `car_mint` (left) and `car_sunset` (right). It lacks variety and doesn't showcase the other 14 vehicles.
5. **Transform Matrix Isolation & Canvas Fallback (R4)**: `vehicleCanvas` in `apps/web/src/art/vehicle.ts` calls `ctx.translate(48, 0); ctx.scale(-1, 1);` when `dir === 1` without wrapping in `ctx.save()` / `ctx.restore()`. Additionally, in `apps/web/src/art/vehicle-loader.ts` (`blitFrame`), `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()` must be called explicitly before clearing and drawing spritesheet frames to prevent double-inversion.
6. **Asset Synchronization (R4)**: All 16 vehicle directories in `assets/vehicles/` and `apps/web/public/vehicles/` currently contain all 4 required files (128 total files) and pass `scripts/verify-vehicle-assets.mjs` and `scripts/audit_vehicle_geometry.py`. The generation and mirroring pipeline is established in `scripts/generate_vehicles.py`.

---

## 2. Canonical Vehicle Taxonomy & Pedestal Mapping

The project specifies 16 canonical vehicles organized into 4 specialized categories (4 vehicles per category), mapped to 4 cardinal showroom pedestals:

| Pedestal & Bay | Category ID | Category Name (VN) | Coordinates (x, y) | Vehicle Models (IDs & Brand Names) |
|---|---|---|---|---|
| **Pedestal 1 (NW)** | `supercars` | Siêu xe | `(168, 156)` | 1. **Ferrari F40 1987** (`car_ferrari_f40`)<br>2. **Lamborghini Aventador SVJ** (`car_lamborghini`)<br>3. **Porsche 911 GT3 RS** (`car_porsche`)<br>4. **Toyota Supra MK4 1994** (`car_toyota_supra_mk4`) |
| **Pedestal 2 (NE)** | `luxury_muscle` | Xe sang & Cơ bắp | `(472, 156)` | 1. **Rolls-Royce Phantom VIII** (`car_rolls_royce_phantom`)<br>2. **Mercedes-Benz G63 AMG** (`car_mint`)<br>3. **Ford Mustang Shelby GT500** (`car_ford_mustang`)<br>4. **Tesla Model S Plaid** (`car_tesla_model_s`) |
| **Pedestal 3 (SW)** | `sport_superbikes` | Mô tô PKL | `(168, 308)` | 1. **Ducati Panigale V4 S** (`motorcycle_ducati`)<br>2. **Kawasaki Ninja H2 Carbon** (`motorcycle_kawasaki_ninja_h2`)<br>3. **Yamaha YZF-R1M** (`motorcycle_yamaha_r1`)<br>4. **BMW R 1250 GS Adventure** (`motorcycle_bmw_r1250_gs`) |
| **Pedestal 4 (SE)** | `cruiser_heritage_bicycle` | Xe phố & Xe đạp | `(472, 308)` | 1. **Vespa Primavera 150** (`motorcycle_coral`)<br>2. **Honda Super Cub C125** (`motorcycle_honda_super_cub`)<br>3. **Harley-Davidson Fat Boy 114** (`motorcycle_harley_fat_boy`)<br>4. **Trek Marlin 7 Gen 3** (`bicycle_sky`) |

### Backward Compatibility Mapping:
- `car_mercedes` (Mercedes-AMG GT Coupe) maps to `cars/mercedes-benz-g63`.
- `car_sunset` (Lamborghini Huracán Tecnica) maps to `cars/lamborghini-aventador`.

---

## 3. Deep-Dive: Showroom Gara Bạc Hà (Requirement R3)

### 3.1 Current Code Structure
- **File**: `apps/web/src/game/showroom-art.ts`
  - Defines `SHOWROOM_PEDESTAL_WIDTH = 136`, `SHOWROOM_PEDESTAL_HEIGHT = 66`, `SHOWROOM_VEHICLE_SCALE = 2`.
  - `buildShowroomTexture(scene)`: Renders background and 4 plinths with neon rims, turntables, stanchions, velvet ropes, and info totems onto `showroom:interior:v2` canvas texture.
  - `populateShowroomElements(scene)`: Iterates over `VEHICLE_DISPLAYS`. For each display:
    - Adds `image(display.x, display.y - 6, texKey)`.
    - Adds idle hover tween (`y: display.y - 8`).
    - Adds static `labelContainer` with vehicle title and price string.
    - Adds static floating 'E' badge at `(display.x - 68, display.y + 22)`.
    - Creates receptionist NPC "Tư vấn viên Minh Quân" at `(563, 75)`.
- **File**: `apps/web/src/game/showroom-scene.ts`
  - `onSelfMove(x, y)`: Calls `useUi.getState().setShowroomVehicle(showroomDisplayAt(x, y))`.
  - `update(time, dt)`: Renders spotlight beams from ceiling track lamps down to pedestals; increases beam intensity when active.
- **File**: `apps/web/src/screens/panels/ShowroomHud.tsx`
  - Shows bottom bar prompt with vehicle name.
  - On key `'e'` press: opens `setPanel('shop-vehicles')`.
  - On key `'Escape'` press: calls `net.goTown()`.

### 3.2 Gaps vs Requirement R3
1. **Fixed Displays**: Pedestals display only 1 fixed vehicle each. The remaining 12 vehicles cannot be viewed or interacted with in the showroom room.
2. **Missing Interactive Pedestal Cycling**:
   - Approaching a pedestal should allow cycling through all 4 vehicles in that category.
   - Pressing `'E'` or navigation keys `[◀]` `[▶]` (ArrowLeft/ArrowRight) must cycle vehicles on that specific pedestal.
   - When cycled, the vehicle sprite texture on the turntable must swap immediately (`ensureVehicleTexture(scene, nextId, 2)`).
   - The illuminated label under the vehicle must update vehicle name, price, and speed multiplier in real time.
   - The HUD at the bottom must display category indicator (e.g. `Bục 1 · Siêu xe (1/4)`), previous/next controls, and an explicit action to open the shop or purchase (`Enter` or button).

### 3.3 Proposed Architecture for Interactive Pedestal Cycling

#### Data Definition (`packages/game-data/src/vehicles.ts`)
```ts
export interface ShowroomPedestalCategory {
  id: string;
  name: string;
  shortLabel: string;
  position: 'NW' | 'NE' | 'SW' | 'SE';
  x: number;
  y: number;
  vehicles: readonly string[];
  defaultVehicle: string;
}

export const SHOWROOM_PEDESTALS: readonly ShowroomPedestalCategory[] = [
  {
    id: 'supercars',
    name: 'Siêu xe',
    shortLabel: 'Siêu xe',
    position: 'NW',
    x: 168,
    y: 156,
    vehicles: ['car_ferrari_f40', 'car_lamborghini', 'car_porsche', 'car_toyota_supra_mk4'],
    defaultVehicle: 'car_ferrari_f40',
  },
  {
    id: 'luxury_muscle',
    name: 'Xe sang & Cơ bắp',
    shortLabel: 'Xe sang & Cơ bắp',
    position: 'NE',
    x: 472,
    y: 156,
    vehicles: ['car_rolls_royce_phantom', 'car_mint', 'car_ford_mustang', 'car_tesla_model_s'],
    defaultVehicle: 'car_rolls_royce_phantom',
  },
  {
    id: 'sport_superbikes',
    name: 'Mô tô PKL',
    shortLabel: 'Mô tô PKL',
    position: 'SW',
    x: 168,
    y: 308,
    vehicles: ['motorcycle_ducati', 'motorcycle_kawasaki_ninja_h2', 'motorcycle_yamaha_r1', 'motorcycle_bmw_r1250_gs'],
    defaultVehicle: 'motorcycle_ducati',
  },
  {
    id: 'cruiser_heritage_bicycle',
    name: 'Xe phố & Xe đạp',
    shortLabel: 'Xe phố & Xe đạp',
    position: 'SE',
    x: 472,
    y: 308,
    vehicles: ['motorcycle_coral', 'motorcycle_honda_super_cub', 'motorcycle_harley_fat_boy', 'bicycle_sky'],
    defaultVehicle: 'motorcycle_coral',
  },
] as const;

export const SHOWROOM_FEATURED_VEHICLES = SHOWROOM_PEDESTALS.map((p) => p.defaultVehicle) as const;

export const VEHICLE_DISPLAYS = SHOWROOM_PEDESTALS.map((p) => ({
  id: p.defaultVehicle,
  x: p.x,
  y: p.y,
}));

export const showroomPedestalAt = (x: number, y: number): number | null => {
  const idx = SHOWROOM_PEDESTALS.findIndex((p) => Math.hypot(x - p.x, y - p.y) <= 100);
  return idx >= 0 ? idx : null;
};
```

#### Showroom Art & Scene Cycling Controller (`apps/web/src/game/showroom-art.ts`)
Encapsulate pedestal elements into a manager that maintains dynamic display objects:
```ts
export interface PedestalController {
  pedestalIndex: number;
  vehicleIndex: number;
  category: ShowroomPedestalCategory;
  vehicleImg: Phaser.GameObjects.Image;
  titleText: Phaser.GameObjects.Text;
  priceText: Phaser.GameObjects.Text;
  badgeText: Phaser.GameObjects.Text;
  cycle: (delta: number) => string;
  setVehicle: (vehicleId: string) => void;
}
```
When `cycle(delta)` is invoked:
1. `vehicleIndex = (vehicleIndex + delta + 4) % 4`
2. `newVehicleId = category.vehicles[vehicleIndex]`
3. `texKey = ensureVehicleTexture(scene, newVehicleId, 2)`
4. `vehicleImg.setTexture(texKey); vehicleImg.texture?.setFilter?.(0)`
5. Tween bounce animation: `scene.tweens.add({ targets: vehicleImg, scale: { from: 1.85, to: 2.0 }, duration: 180, ease: 'Back.easeOut' })`
6. Update `titleText.setText(newVehicle.name)`
7. Update `priceText.setText(...)`
8. Update `useUi.getState().setShowroomVehicle(newVehicleId)`

#### Showroom HUD Interaction (`apps/web/src/screens/panels/ShowroomHud.tsx`)
- Detect active pedestal via `showroomPedestalAt(player.x, player.y)` or state.
- Listen for keyboard events:
  - Key `'e'` or `'E'`: calls `cycle(1)` (cycle to next vehicle on current pedestal).
  - Key `'ArrowLeft'` or `[`: calls `cycle(-1)` (cycle to previous vehicle).
  - Key `'ArrowRight'` or `]`: calls `cycle(1)`.
  - Key `'Enter'`: opens `setPanel('shop-vehicles')` focused on currently displayed vehicle.
  - Key `'Escape'`: exits to town (`net.goTown()`).
- Render HUD with interactive controls:
  - Header: `[Bục {idx + 1} · {category.name} ({current + 1}/4)]`
  - Name & Specs: `Ferrari F40 1987 · 4,200 Coin · ×2.2 tốc độ`
  - Action buttons:
    - `<Button onClick={() => cycle(-1)}>◀ Trước</Button>`
    - `<Button onClick={() => cycle(1)}><span className="kbd">E</span> Đổi xe ▶</Button>`
    - `<Button variant="primary" onClick={() => openShop()}><span className="kbd">Enter</span> Xem & Mua xe</Button>`
    - `<Button variant="secondary" onClick={() => net.goTown()}>Ra sân gara</Button>`

---

## 4. Deep-Dive: `VehicleShopPanel.tsx` (Requirement R3)

### 4.1 Current Code Structure
- **File**: `apps/web/src/screens/panels/VehicleShopPanel.tsx` (215 lines)
  - Line 30: `VehiclePreview({ id })` renders a 144x120 px image with a single button `Xoay xe` (`setDir((d) => (d + 1) % 4)`).
  - Line 51: `const [showAll, setShowAll] = useState(!displayId)`
  - Line 110: Only shows two buttons: "Xe đang xem trên bục" and "Tất cả các dòng xe (16 mẫu)".
  - Filters items: `(shop.data ?? []).filter((i) => i.type === 'vehicle' && (room !== 'showroom' || showAll || i.id === displayId))`.

### 4.2 Gaps vs Requirement R3
1. **Missing Category Tabs**: The prompt explicitly mandates 5 category tabs:
   - Tất cả (16)
   - Siêu xe (4)
   - Xe sang & Cơ bắp (4)
   - Mô tô PKL (4)
   - Xe phố & Xe đạp (4)
2. **Missing 360-Degree Preview Rotation**:
   - The current preview only has one generic "Xoay xe" button.
   - Users need true 360-degree rotation controls:
     - Left / Right directional rotation buttons `[◀ Xoay trái]` and `[Xoay phải ▶]`.
     - Direction compass indicator: e.g. `Hướng: Trước (Nam)`, `Hướng: Phải (Đông)`, `Hướng: Sau (Bắc)`, `Hướng: Trái (Tây)`.
     - Automatic 360° turntable mode toggle (`[🔄 Tự xoay 360°]`) cycling through 4 angles continuously (Down 0 → Right 2 → Up 3 → Left 1) with smooth intervals.
     - Pixel-perfect nearest filter with 3x integer scaling (`imageRendering: 'pixelated'`).
3. **Purchasing & Equipping All 16 Models**:
   - All 16 models must be easily browsed, filtered, purchased, and equipped directly from the tabs.

### 4.3 Proposed Category Tab Filtering & 360 Preview Architecture

```tsx
export type VehicleCategoryTab =
  | 'all'
  | 'supercars'
  | 'luxury_muscle'
  | 'sport_superbikes'
  | 'cruiser_heritage_bicycle';

export const CATEGORY_TABS: Array<{ id: VehicleCategoryTab; label: string; vehicleIds?: readonly string[] }> = [
  { id: 'all', label: 'Tất cả (16)' },
  {
    id: 'supercars',
    label: 'Siêu xe (4)',
    vehicleIds: ['car_ferrari_f40', 'car_lamborghini', 'car_porsche', 'car_toyota_supra_mk4'],
  },
  {
    id: 'luxury_muscle',
    label: 'Xe sang & Cơ bắp (4)',
    vehicleIds: ['car_rolls_royce_phantom', 'car_mint', 'car_ford_mustang', 'car_tesla_model_s'],
  },
  {
    id: 'sport_superbikes',
    label: 'Mô tô PKL (4)',
    vehicleIds: ['motorcycle_ducati', 'motorcycle_kawasaki_ninja_h2', 'motorcycle_yamaha_r1', 'motorcycle_bmw_r1250_gs'],
  },
  {
    id: 'cruiser_heritage_bicycle',
    label: 'Xe phố & Xe đạp (4)',
    vehicleIds: ['motorcycle_coral', 'motorcycle_honda_super_cub', 'motorcycle_harley_fat_boy', 'bicycle_sky'],
  },
];
```

#### Enhanced 360-Degree Preview Component
```tsx
const ROTATION_DIRECTIONS: Array<{ dir: number; label: string }> = [
  { dir: 0, label: 'Trước (Nam)' },
  { dir: 2, label: 'Nghiêng phải (Đông)' },
  { dir: 3, label: 'Sau (Bắc)' },
  { dir: 1, label: 'Nghiêng trái (Tây)' },
];

function Vehicle360Preview({ id }: { id: string }) {
  const [rotIndex, setRotIndex] = useState(1); // default right profile (dir 2)
  const [autoRotate, setAutoRotate] = useState(false);
  const currentDir = ROTATION_DIRECTIONS[rotIndex].dir;

  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      setRotIndex((prev) => (prev + 1) % ROTATION_DIRECTIONS.length);
    }, 1100);
    return () => clearInterval(interval);
  }, [autoRotate]);

  const src = useMemo(() => vehicleCanvas(id, currentDir).toDataURL(), [id, currentDir]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 144 }}>
      <img
        src={src}
        alt=""
        width={144}
        height={120}
        style={{ imageRendering: 'pixelated', objectFit: 'contain', display: 'block' }}
      />
      <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>
        {ROTATION_DIRECTIONS[rotIndex].label}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setRotIndex((i) => (i - 1 + 4) % 4)}
          title="Xoay trái"
        >
          ◀
        </Button>
        <Button
          variant={autoRotate ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setAutoRotate(!autoRotate)}
          title="Tự động xoay 360 độ"
        >
          🔄 360°
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setRotIndex((i) => (i + 1) % 4)}
          title="Xoay phải"
        >
          ▶
        </Button>
      </div>
    </div>
  );
}
```

---

## 5. Deep-Dive: Storefront Window Display in `paintVehicleDealer` (Requirements R3 & R4)

### 5.1 Current Implementation
- **File**: `apps/web/src/art/vehicle.ts`, lines 489–520:
```ts
export function paintVehicleDealer(): HTMLCanvasElement {
  // ...
  ctx.drawImage(vehicleCanvas('car_mint'), 20, 84);
  ctx.drawImage(vehicleCanvas('car_sunset', 1), 94, 84);
  // ...
}
```
- **File**: `apps/web/src/art/town-detail.ts`, line 895:
```ts
if (s.kind === 'dealer') return paintVehicleDealer();
```

### 5.2 Gaps & Diversification Strategy
- **Lack of Variety**: It always shows only `car_mint` (Mercedes G63) and `car_sunset` (Lamborghini Huracán facing left).
- **Diversification Plan**:
  1. Define a curated rotation schedule or accept optional parameters:
     ```ts
     export const DEALER_SHOWCASE_PAIRS: Array<[string, string]> = [
       ['car_ferrari_f40', 'car_lamborghini'],         // Red Ferrari F40 + Yellow Aventador
       ['car_porsche', 'car_mint'],                     // Blue Porsche 911 + Emerald G63
       ['car_rolls_royce_phantom', 'car_toyota_supra_mk4'], // Silver Rolls-Royce + Orange Supra
       ['motorcycle_ducati', 'car_ford_mustang'],       // Red Ducati Panigale + Blue Shelby Mustang
       ['car_tesla_model_s', 'motorcycle_kawasaki_ninja_h2'], // Pearl Tesla + Green Ninja H2
     ];
     ```
  2. Implement `paintVehicleDealer(leftVehicleId?: string, rightVehicleId?: string)`:
     - Defaults to a striking pair: e.g. `car_ferrari_f40` on the left window and `car_lamborghini` (facing left `dir = 1`) on the right window.
     - Add polished window reflection glints across the glass panes:
       ```ts
       // Angled showcase glass specular reflections
       line('rgba(255, 255, 255, 0.35)', x + 6, 78, x + 24, 118, 2);
       line('rgba(255, 255, 255, 0.15)', x + 16, 78, x + 34, 118, 1);
       ```
     - Overhead mini-spotlight beams inside the window bay.

---

## 6. Deep-Dive: Canvas Fallback Runtime & Transform Matrix Leakage (Requirement R4)

### 6.1 Transform Matrix Leakage Analysis
In `apps/web/src/art/vehicle.ts`:
- **Line 48–51** (2-wheelers):
  ```ts
  if (dir === 1 || dir === 2) {
    if (dir === 1) {
      ctx.translate(48, 0);
      ctx.scale(-1, 1);
    }
  ```
- **Line 279–282** (4-wheelers):
  ```ts
  if (dir === 1 || dir === 2) {
    if (dir === 1) {
      ctx.translate(48, 0);
      ctx.scale(-1, 1);
    }
  ```
- **The Issue**: There is no `ctx.save()` before `ctx.translate(48, 0); ctx.scale(-1, 1);` and no `ctx.restore()` after drawing. While `vehicleCanvas` creates a fresh canvas for its own output, if a caller passes a reused context or if `blitFrame` draws on top, lingering transformation state causes double-flip inversion.
- **The Solution**:
  1. Wrap directional flipping in `ctx.save()` and `ctx.restore()`:
     ```ts
     if (dir === 1 || dir === 2) {
       ctx.save();
       if (dir === 1) {
         ctx.translate(48, 0);
         ctx.scale(-1, 1);
       }
       // ... render vehicle ...
       ctx.restore();
     }
     ```
  2. In `apps/web/src/art/vehicle-loader.ts` in `blitFrame`:
     ```ts
     function blitFrame(
       ctx: CanvasRenderingContext2D,
       img: HTMLImageElement | CanvasImageSource,
       dir: number,
       frame: number,
     ): void {
       // Explicitly reset transformation matrix before clearing & blitting
       if (typeof ctx.setTransform === 'function') {
         ctx.setTransform(1, 0, 0, 1, 0, 0);
       }
       if (typeof ctx.resetTransform === 'function') {
         ctx.resetTransform();
       }
       const safeDir = ((dir % 4) + 4) % 4;
       const safeFrame = ((frame % 4) + 4) % 4;
       const sx = safeFrame * 48;
       const sy = safeDir * 40;
       if (typeof ctx.clearRect === 'function') {
         ctx.clearRect(0, 0, 48, 40);
       }
       ctx.drawImage(img, sx, sy, 48, 40, 0, 0, 48, 40);
     }
     ```

### 6.2 Proportions, Silhouettes & Materials Synchronization
In `apps/web/src/art/vehicle.ts`:
- **Wheel Ground Contact**: In side profiles (dir 1 & 2), the bottom pixel of the wheels in `vehicleCanvas` must reach `y = 37` px to match `contactY: 37` in `meta.json` and `audit_vehicle_geometry.py`.
- **Body Width Clearance**: Body width must remain `<= 40` px to avoid off-road traffic penalties on 40 px roads.
- **2-Wheeler Saddle Alignment**: Saddle pivot at `x = 24, y = 16..20` matches character avatar crop `(0, 0, 32, 40)` and mounting offset `-4` px.

---

## 7. Deep-Dive: Asset Synchronization Pipeline (Requirement R4)

### 7.1 Asset Inventory & Integrity
- **Canonical Storage**: `assets/vehicles/`
- **Web Public Mirror**: `apps/web/public/vehicles/`
- **16 Vehicle Models Verified**:
  - `bicycles/trek-marlin-7`
  - `motorcycles/vespa-primavera-150`
  - `motorcycles/ducati-panigale-v4`
  - `motorcycles/honda-super-cub`
  - `motorcycles/harley-davidson-fat-boy`
  - `motorcycles/kawasaki-ninja-h2`
  - `motorcycles/yamaha-yzf-r1`
  - `motorcycles/bmw-r1250-gs`
  - `cars/mercedes-benz-g63`
  - `cars/lamborghini-aventador`
  - `cars/porsche-911`
  - `cars/toyota-supra-mk4`
  - `cars/ferrari-f40`
  - `cars/ford-mustang`
  - `cars/rolls-royce-phantom`
  - `cars/tesla-model-s`
- **Files per model**: 4 (`spritesheet.png` [192x160], `preview.png` [144x120], `icon.png` [48x40], `meta.json`).
- **Total Files Verified**: 128 files across both directories (100% matched, 0 missing, 0 corrupt).

### 7.2 Verification Commands
- `node scripts/verify-vehicle-assets.mjs` — verifies PNG signatures, headers, dimensions, and JSON schema.
- `python scripts/audit_vehicle_geometry.py` — verifies pixel-level bounding box <= 40 px, wheel contact at y=37, and saddle pivot at x=24, y=16..20.

---

## 8. Concrete Implementation Strategy for Workers

Below is the concrete, file-by-file implementation plan for the worker agents.

### Step 1: Update Data Model in `packages/game-data/src/vehicles.ts`
1. Export `SHOWROOM_PEDESTALS` containing the 4 specialized categories with their 4 vehicle IDs, positions, and default models.
2. Update `SHOWROOM_FEATURED_VEHICLES` and `VEHICLE_DISPLAYS` to use `SHOWROOM_PEDESTALS`.
3. Export helper `showroomPedestalAt(x, y): number | null`.
4. Run `pnpm --filter @cozy/game-data test`.

### Step 2: Implement Interactive Pedestal Cycling in `showroom-art.ts` & `showroom-scene.ts`
1. In `apps/web/src/game/showroom-art.ts`:
   - Refactor `populateShowroomElements(scene)` to create `PedestalController` objects for the 4 pedestals.
   - Attach cycling handler that swaps texture via `ensureVehicleTexture`, triggers a brief bounce tween, and updates title and price text in real time.
2. In `apps/web/src/game/showroom-scene.ts`:
   - Store pedestal controllers.
   - In `onSelfMove(x, y)`: detect active pedestal and sync with `useUi`.
   - Provide scene-level `cyclePedestal(pedestalIdx, delta)` method.
3. In `apps/web/src/screens/panels/ShowroomHud.tsx`:
   - Connect keyboard listener: `'e'` or `'E'` cycles forward; `ArrowLeft`/`ArrowRight` cycles previous/next; `'Enter'` opens shop; `'Escape'` exits to town.
   - Render category tag (e.g. `Bục 1 · Siêu xe (1/4)`), real-time name and speed, and navigation buttons (`◀`, `Đổi xe (E)`, `▶`, `Xem & Mua (Enter)`).

### Step 3: Upgrade `VehicleShopPanel.tsx` with 5 Category Tabs & 360° Preview
1. In `apps/web/src/screens/panels/VehicleShopPanel.tsx`:
   - Add category tabs: *Tất cả (16)*, *Siêu xe (4)*, *Xe sang & Cơ bắp (4)*, *Mô tô PKL (4)*, *Xe phố & Xe đạp (4)*.
   - If opened from showroom near a pedestal, initialize the active tab to that pedestal's category.
   - Upgrade `VehiclePreview` to `Vehicle360Preview` with left/right rotation buttons, direction compass badge, and auto-rotation toggle (`🔄 360°`).
   - Filter `shop.data` according to the active tab.

### Step 4: Diversify Storefront Window Display in `paintVehicleDealer`
1. In `apps/web/src/art/vehicle.ts`:
   - Accept optional `leftVehicleId` and `rightVehicleId` with defaults to showcase supercars (e.g. `car_ferrari_f40` on left, `car_lamborghini` on right).
   - Add window glass diagonal specular streaks and showroom lighting.

### Step 5: Fix Transform Matrix Leakage in `vehicle.ts` & `vehicle-loader.ts`
1. In `apps/web/src/art/vehicle.ts`:
   - Wrap `ctx.translate(48, 0); ctx.scale(-1, 1);` in `ctx.save()` and `ctx.restore()` for both 2-wheelers and 4-wheelers.
2. In `apps/web/src/art/vehicle-loader.ts`:
   - In `blitFrame`, call `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()` prior to clearing and drawing.

### Step 6: Tests & Quality Gate Verification
1. Update `apps/web/src/game/showroom.test.ts`:
   - Add tests for 4 specialized pedestals and cycling mechanics.
2. Run test commands:
   - `pnpm --filter @cozy/game-data test`
   - `pnpm --filter @cozy/web test`
   - `node scripts/verify-vehicle-assets.mjs`
   - `pnpm format:check`
   - `pnpm lint`
   - `pnpm typecheck`
