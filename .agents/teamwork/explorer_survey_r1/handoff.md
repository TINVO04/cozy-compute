# Handoff Report: Requirement R1 Transform Matrix Leakage & Left Drive Inversion

## 1. Observation

### Source Code Inspections

1. **`apps/web/src/art/vehicle.ts`**:
   - Lines 47–51 (2-wheelers):
     ```ts
     47:    if (dir === 1 || dir === 2) {
     48:      if (dir === 1) {
     49:        ctx.translate(48, 0);
     50:        ctx.scale(-1, 1);
     51:      }
     ```
   - Lines 278–282 (4-wheelers):
     ```ts
     278:  if (dir === 1 || dir === 2) {
     279:    if (dir === 1) {
     280:      ctx.translate(48, 0);
     281:      ctx.scale(-1, 1);
     282:    }
     ```
   - `ctx.save()` and `ctx.restore()` are absent across both branches. The canvas returned by `vehicleCanvas(id, 1, frame)` permanently retains `matrix: [-1, 0, 0, 1, 48, 0]`.

2. **`apps/web/src/art/vehicle-loader.ts`**:
   - Lines 230–244 (`blitFrame`):
     ```ts
     230: function blitFrame(
     231:   ctx: CanvasRenderingContext2D,
     232:   img: HTMLImageElement | CanvasImageSource,
     233:   dir: number,
     234:   frame: number,
     235: ): void {
     236:   const safeDir = ((dir % 4) + 4) % 4;
     237:   const safeFrame = ((frame % 4) + 4) % 4;
     238:   const sx = safeFrame * 48;
     239:   const sy = safeDir * 40;
     240:   if (typeof ctx.clearRect === 'function') {
     241:     ctx.clearRect(0, 0, 48, 40);
     242:   }
     243:   ctx.drawImage(img, sx, sy, 48, 40, 0, 0, 48, 40);
     244: }
     ```
   - Neither `ctx.setTransform(1, 0, 0, 1, 0, 0)` nor `ctx.resetTransform()` is called before `ctx.clearRect` or `ctx.drawImage`.
   - In lines 261–274 and 280–303, `blitFrame` is called directly on `canvas.getContext('2d')`, which was initialized with `vehicleCanvas(id, dir, frame)`.

3. **`scripts/generate_vehicles.py`**:
   - Lines 603, 791, 998:
     ```python
     if dir_idx == 1: # Left
         img = img.transpose(Image.FLIP_LEFT_RIGHT)
     ```
   - In `spritesheet.png`, Row 1 (`sy = 40`) is already flipped to face Left.

4. **`apps/web/src/game/players.ts`**:
   - Lines 1081–1086: `if (this.input.x < 0) av.dir = 1;`
   - Lines 798: `this.vehicleLights?.update(driving ? this.vehicle : '', this.container.x, this.container.y, this.dir);`
   - Lines 811: `this.sprite.setVisible(!driving || riding);` (avatar hidden for cars, visible for 2-wheelers).
   - Lines 817–822: Vehicle texture requested with `ensureVehicleTexture(this.scene, this.vehicle, this.dir, frame)`.
   - Lines 849–854: 2-wheeler avatar pinned to frame `this.dir * 3` (`frame = 3` for `dir = 1`, which is Left-facing).

5. **`apps/web/src/game/vehicle-lights.ts`**:
   - Lines 47–49: `const angle = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][dir] ?? 0;`
   - For `dir = 1`, `angle = Math.PI`, emitter at `x - 20`, taillight at `x + 18`.

### Tool Test Commands & Results
- Command: `pnpm --filter @cozy/web test run src/art/vehicle-loader.challenge.test.ts src/game/vehicles.challenge.test.ts`
  - Result: 28 passed.
  - Reason: Existing tests only tested `dir = 2` (Right) or checked canvas existence without asserting transform matrix state or `save`/`restore`/`setTransform`.

---

## 2. Logic Chain

1. In `vehicleCanvas(id, 1, frame)` (`apps/web/src/art/vehicle.ts`), `ctx.translate(48, 0)` and `ctx.scale(-1, 1)` are called without `ctx.save()` / `ctx.restore()`.
2. This permanently contaminates the canvas context with `scaleX = -1` (Root Cause A).
3. When `ensureVehicleTexture` creates a canvas for `dir = 1`, it registers `canvas` as a fallback.
4. When `blitFrame` updates that canvas with the static PNG spritesheet, it does not reset the context transform.
5. In the spritesheet, Row 1 (`sy = 40`) is already baked with `FLIP_LEFT_RIGHT` facing Left.
6. Blitting an image that already faces Left into a context that has `scaleX = -1` active flips the image horizontally a second time.
7. Consequently, the vehicle sprite renders facing Right (the "lật ngược 2 lần" bug), while `VehicleLights` points Left and the avatar (on 2-wheelers) faces Left.

---

## 3. Caveats

- **Scope boundaries**: This investigation focuses strictly on Requirement R1 (transform matrix leakage and drive orientation). Requirements R2 (asset generator upgrade), R3 (showroom pedestal cycling), and R4 (asset pipeline sync) are handled by parallel work streams.
- **Assumptions**: The pre-baked spritesheet structure (Row 0: Down, Row 1: Left, Row 2: Right, Row 3: Up) in `assets/vehicles/` remains the canonical 4x4 standard as verified in `scripts/generate_vehicles.py`.

---

## 4. Conclusion

The left-facing vehicle inversion bug is caused by transform matrix leakage in `apps/web/src/art/vehicle.ts` combined with missing transform reset in `apps/web/src/art/vehicle-loader.ts`.

### Actionable Fix Specification:
1. In `apps/web/src/art/vehicle.ts`:
   - Enclose `dir === 1 || dir === 2` in `ctx.save()` and `ctx.restore()` for both 2-wheelers and 4-wheelers.
2. In `apps/web/src/art/vehicle-loader.ts`:
   - In `blitFrame()`, call `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()` prior to `ctx.clearRect` and `ctx.drawImage`.
3. In tests:
   - Update `apps/web/src/art/vehicle-loader.challenge.test.ts` to assert that `blitFrame` resets transforms for `dir = 1`.
   - Update `apps/web/src/game/vehicles.challenge.test.ts` to verify matrix isolation in `vehicleCanvas` and player drive orientation for `dir = 1`.

---

## 5. Verification Method

1. **Unit Test Verification**:
   ```bash
   pnpm --filter @cozy/web test run src/art/vehicle-loader.challenge.test.ts src/game/vehicles.challenge.test.ts
   ```
2. **Transform Isolation Verification**:
   In a test inspecting `vehicleCanvas('car_lamborghini', 1)`:
   ```ts
   const c = vehicleCanvas('car_lamborghini', 1);
   const ctx = c.getContext('2d');
   // Verify ctx.save was called, ctx.restore was called
   // In real canvas: ctx.getTransform() should have a = 1, d = 1, e = 0, f = 0
   ```
3. **BlitFrame Verification**:
   In a test inspecting `blitFrame(ctx, img, 1, 0)`:
   Verify `setTransform(1, 0, 0, 1, 0, 0)` is called before `drawImage`.
4. **Invalidation Condition**:
   If `ctx.save()` / `ctx.restore()` is omitted, or if `blitFrame()` does not explicitly reset the transform, any canvas texture created for `dir = 1` will invert loaded spritesheet frames.
