# Requirement R1 Investigation: Transform Matrix Leakage & Left Drive Bug

## 1. Executive Summary

When a player drives any vehicle to the left (`dir === 1`, triggered by pressing `A`), the vehicle sprite visual exhibits a severe orientation inversion bug ("lật ngược 2 lần" / double-flip) where the vehicle appears to reverse or face backwards (facing right while driving left).

This report identifies the dual root causes in `apps/web/src/art/vehicle.ts` and `apps/web/src/art/vehicle-loader.ts`, analyzes interaction with `apps/web/src/game/players.ts` (for both 2-wheelers and 4-wheelers), audits existing challenge tests, and details the complete architectural fix.

---

## 2. Root Cause Analysis (Evidence Chain)

### Root Cause A: Transform Matrix Leakage in `vehicleCanvas()` (`apps/web/src/art/vehicle.ts`)

In `apps/web/src/art/vehicle.ts`:
- **Line 6-10**:
  ```ts
  export function vehicleCanvas(id: string, dir = 2, frame = 0): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 48;
    c.height = 40;
    const ctx = c.getContext('2d')!;
  ```
- **Lines 47-51** (2-wheelers):
  ```ts
  if (dir === 1 || dir === 2) {
    if (dir === 1) {
      ctx.translate(48, 0);
      ctx.scale(-1, 1);
    }
  ```
- **Lines 278-282** (4-wheelers):
  ```ts
  if (dir === 1 || dir === 2) {
    if (dir === 1) {
      ctx.translate(48, 0);
      ctx.scale(-1, 1);
    }
  ```
- **Observation**:
  `vehicleCanvas` implements horizontal flipping for `dir === 1` by executing `ctx.translate(48, 0); ctx.scale(-1, 1);`.
  However, it **never calls `ctx.save()` prior to the transform, and never calls `ctx.restore()` after drawing**.
- **Consequence**:
  The returned canvas `c` has a dirty 2D rendering context whose active transformation matrix is permanently set to:
  $$\begin{bmatrix} a & c & e \\ b & d & f \\ 0 & 0 & 1 \end{bmatrix} = \begin{bmatrix} -1 & 0 & 48 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{bmatrix}$$
  Any subsequent drawing operations targeting `c.getContext('2d')` will inherit `scaleX = -1`.

---

### Root Cause B: Double Inversion ("Lật ngược 2 lần") in `blitFrame()` (`apps/web/src/art/vehicle-loader.ts`)

In `apps/web/src/art/vehicle-loader.ts`:
- **Lines 256-274**:
  ```ts
  export function ensureVehicleTexture(scene: Phaser.Scene, id: string, dir: number, frame = 0): string {
    const key = `vehicle:${id}:${dir}:${frame}`;
    if (scene.textures.exists(key)) return key;

    // Fallback canvas generated synchronously (zero downtime, no white screen)
    const canvas = vehicleCanvas(id, dir, frame);

    // Check if spritesheet is already cached in memory
    const assetPath = resolveVehicleAssetPath(id);
    const cachedImg = assetPath ? getCachedVehicleSpritesheet(assetPath) : null;

    if (cachedImg) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        blitFrame(ctx, cachedImg, dir, frame);
      }
      scene.textures.addCanvas(key, canvas);
      return key;
    }

    scene.textures.addCanvas(key, canvas);
    // Background async upgrade:
    if (assetPath) {
      loadVehicleSpritesheet(assetPath).then((img) => {
        ...
        const ctx = currentTex?.getContext() ?? canvas.getContext('2d');
        if (ctx) {
          blitFrame(ctx, img, dir, frame);
        }
        currentTex.refresh();
      });
    }
    return key;
  }
  ```
- **Lines 230-244** (`blitFrame`):
  ```ts
  function blitFrame(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement | CanvasImageSource,
    dir: number,
    frame: number,
  ): void {
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
- **Spritesheet Generation Invariant** (`scripts/generate_vehicles.py`):
  In lines 603, 791, 998:
  ```python
  if dir_idx == 1: # Left
      img = img.transpose(Image.FLIP_LEFT_RIGHT)
  ```
  The pre-baked PNG spritesheet in `assets/vehicles/<category>/<model>/spritesheet.png` already contains Row 1 (`sy = 40`) **pre-flipped horizontally to face Left**!
- **The Collision**:
  1. For `dir === 1`, `canvas` is initialized with procedural fallback from `vehicleCanvas(id, 1, frame)`.
  2. Because of Root Cause A, `canvas.getContext('2d')` retains `translate(48, 0); scale(-1, 1);`.
  3. When `blitFrame` executes (either from memory cache or async loader), it fails to reset the transform matrix.
  4. `ctx.drawImage` draws Row 1 of the spritesheet (which already faces left) **with `scaleX = -1` active**.
  5. The image is inverted a second time: $(\text{Left}) \times (-1) = \text{Right}$.
  6. The vehicle sprite now displays facing **RIGHT**, while the player is driving **LEFT**!

---

## 3. Analysis of Drive Direction & Avatar Mounting (`apps/web/src/game/players.ts`)

In `apps/web/src/game/players.ts`:

### 1. Drive Direction Input
- **Lines 1081-1086**:
  ```ts
  if (moving) {
    if (this.input.x < 0) av.dir = 1;
    else if (this.input.x > 0) av.dir = 2;
    else if (this.input.y < 0) av.dir = 3;
    else av.dir = 0;
  }
  ```
  When pressing `A`, `input.x < 0`, correctly setting `av.dir = 1` (Left).

### 2. Vehicle Lights Direction
- **Line 798**:
  ```ts
  this.vehicleLights?.update(driving ? this.vehicle : '', this.container.x, this.container.y, this.dir);
  ```
- In `apps/web/src/game/vehicle-lights.ts` lines 47-57:
  ```ts
  const angle = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][dir] ?? 0;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const frontX = x + dx * hdx;
  const rearX = x - dx * tdx;
  ```
  When `dir === 1`, `angle = Math.PI`. `dx = -1, dy = 0`.
  - Headlight beam rotates to $\pi$ rad (points straight left).
  - Headlight bulbs position at `x - 20` (left).
  - Taillight bulb positions at `x + 18` (right).
  - **Verdict**: VehicleLights is 100% correct and expects the vehicle to be facing left.

### 3. Avatar Mounting vs Vehicle Kind
- **Line 800-811**:
  ```ts
  const kind = def?.kind;
  const riding = driving && (kind === 'bicycle' || kind === 'motorcycle');
  ...
  this.sprite.setVisible(!driving || riding);
  ```
- **4-Wheelers (Cars & SUVs)**:
  - `riding = false`.
  - `this.sprite.setVisible(false)`: Avatar driver is completely hidden inside the vehicle cabin.
  - `this.vehicleSprite.setTexture(key).setVisible(true)`: Car sprite rendered alone.
  - When `dir === 1`, the car sprite must face left. Due to the double-flip bug, the car was facing right while moving left.
- **2-Wheelers (Bicycles & Motorcycles)**:
  - `riding = true`.
  - `this.sprite.setVisible(true)`: Avatar remains visible on the saddle.
  - `this.sprite.stop()` and `this.sprite.setFrame(this.dir * 3)` (line 850-851).
  - When `dir === 1`, avatar frame is `1 * 3 = 3`. In `apps/web/src/art/avatar.ts` and `apps/web/src/art/chibi.ts`, Row 1 (`dir = 1`) is rendered facing LEFT (`isMirror = dir === 2` is false).
  - Avatar crop: `cropAvatar: { x: 0, y: 0, width: 32, height: 40 }` crops legs above pedals/footpegs.
  - Avatar position offset: `avatarOffsetY: -4` positions avatar torso onto saddle (`seat: { x: 24, y: 18 }`).
  - Container order: `vehicleSprite` is child index 1, `this.sprite` (avatar) is child index 2. Avatar sits atop the 2-wheeler.
  - **The mismatch**: Avatar faces left, headlights face left, but the bike sprite beneath was flipped to face right due to transform leakage.

---

## 4. Audit of Existing Test Suites

1. `apps/web/src/art/vehicle-loader.challenge.test.ts`:
   - Contains tests for cache deduplication, in-flight coalescing, path traversal protection, and in-place upgrade.
   - **Gaps**:
     - `mockCtx` on line 48 and line 275 lacks `save`, `restore`, `setTransform`, `resetTransform`.
     - Test at line 318 only checks `dir = 2` (Right).
     - Does not assert that `blitFrame` calls `ctx.setTransform(1, 0, 0, 1, 0, 0)` or `ctx.resetTransform()`.
     - Does not verify that `dir = 1` blits Row 1 (`sy = 40`) without matrix leakage.

2. `apps/web/src/game/vehicles.challenge.test.ts`:
   - Contains tests for high-speed unmounting, headlight adaptation, reduced motion, and procedural canvas generation.
   - **Gaps**:
     - `mockCanvasElement.getContext` on line 14 and line 79 lacks `save`, `restore`, `setTransform`, `resetTransform`.
     - Permutation test at line 480 iterates all 288 permutations (18 vehicles $\times$ 4 dirs $\times$ 4 frames), but only checks `canvas.width === 48`, not transform matrix isolation.
     - Does not test avatar mounting orientation for `dir = 1` for both 2-wheelers and 4-wheelers.

---

## 5. Recommended Concrete Implementation Plan

### Fix 1: Isolate Transform Matrix in `apps/web/src/art/vehicle.ts`

In `apps/web/src/art/vehicle.ts`:
1. For 2-wheelers (`kind === 'bicycle' || kind === 'motorcycle'`):
   ```ts
   if (dir === 1 || dir === 2) {
     ctx.save();
     if (dir === 1) {
       ctx.translate(48, 0);
       ctx.scale(-1, 1);
     }
     // ... all 2-wheeler drawing code ...
     ctx.restore();
   }
   ```
2. For 4-wheelers (`kind === 'car'`):
   ```ts
   if (dir === 1 || dir === 2) {
     ctx.save();
     if (dir === 1) {
       ctx.translate(48, 0);
       ctx.scale(-1, 1);
     }
     // ... all 4-wheeler drawing code ...
     ctx.restore();
   }
   ```

### Fix 2: Reset Transform Matrix in `apps/web/src/art/vehicle-loader.ts`

In `apps/web/src/art/vehicle-loader.ts` in `blitFrame()`:
```ts
function blitFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | CanvasImageSource,
  dir: number,
  frame: number,
): void {
  const safeDir = ((dir % 4) + 4) % 4;
  const safeFrame = ((frame % 4) + 4) % 4;
  const sx = safeFrame * 48;
  const sy = safeDir * 40;
  if (typeof ctx.setTransform === 'function') {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  if (typeof ctx.resetTransform === 'function') {
    ctx.resetTransform();
  }
  if (typeof ctx.clearRect === 'function') {
    ctx.clearRect(0, 0, 48, 40);
  }
  ctx.drawImage(img, sx, sy, 48, 40, 0, 0, 48, 40);
}
```

### Fix 3: Enhance Test Suites

1. In `apps/web/src/art/vehicle-loader.challenge.test.ts`:
   - Add `save: vi.fn()`, `restore: vi.fn()`, `setTransform: vi.fn()`, `resetTransform: vi.fn()` to `mockCtx`.
   - Add test case verifying `blitFrame` explicitly calls `setTransform(1, 0, 0, 1, 0, 0)` and `resetTransform()` when blitting `dir = 1`.
2. In `apps/web/src/game/vehicles.challenge.test.ts`:
   - Add `save: vi.fn()`, `restore: vi.fn()`, `setTransform: vi.fn()`, `resetTransform: vi.fn()` to `mockCanvasElement.getContext` and `mockCtx`.
   - Add test case asserting `ctx.save` and `ctx.restore` are called when `dir = 1` in `vehicleCanvas`.
   - Add test case asserting Avatar orientation and vehicle texture key when driving left (`dir = 1`) for both 2-wheelers and 4-wheelers.
