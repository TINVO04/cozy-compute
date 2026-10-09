# Handoff Report: Worker M1 — Transform Matrix Leakage & Left Drive Inversion Fix (Requirement R1)

## 1. Observation

### Codebase Observations
1. **`apps/web/src/art/vehicle.ts`**:
   - In 2-wheelers (`kind === 'bicycle' || kind === 'motorcycle'`), lines 47-51:
     ```ts
     if (dir === 1 || dir === 2) {
       if (dir === 1) {
         ctx.translate(48, 0);
         ctx.scale(-1, 1);
       }
     ```
     Horizontal flipping was applied for `dir === 1` without calling `ctx.save()` before the translation/scale or `ctx.restore()` after the horizontal draw operations.
   - In 4-wheelers (`kind === 'car'`), lines 278-282:
     ```ts
     if (dir === 1 || dir === 2) {
       if (dir === 1) {
         ctx.translate(48, 0);
         ctx.scale(-1, 1);
       }
     ```
     Similarly, `ctx.translate(48, 0); ctx.scale(-1, 1);` was applied without `ctx.save()` or `ctx.restore()`.
   - The returned `HTMLCanvasElement` left its 2D rendering context permanently in the transformed state `[a: -1, b: 0, c: 0, d: 1, e: 48, f: 0]`, causing any subsequent rendering onto that canvas context to inherit horizontal flipping.

2. **`apps/web/src/art/vehicle-loader.ts`**:
   - In `blitFrame()` (lines 230-244):
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
     Row 1 (`sy = 40`) of generated spritesheets (`assets/vehicles/**/spritesheet.png`) is already baked with horizontal inversion (facing Left). When `ensureVehicleTexture()` blitted the spritesheet onto a fallback canvas initialized with `vehicleCanvas(id, 1, frame)`, the unreset transformation matrix caused `ctx.drawImage` to apply a second horizontal flip: $(-1) \times (-1) = 1$ (double-inversion / "lật ngược 2 lần"), causing vehicles driving Left (`dir = 1`) to face Right.

3. **`apps/web/src/art/vehicle-loader.challenge.test.ts` & `apps/web/src/game/vehicles.challenge.test.ts`**:
   - Test mock contexts previously lacked implementations for `save`, `restore`, `setTransform`, and `resetTransform`.
   - Test assertions did not verify transform isolation for `dir = 1`, blitFrame transform resets, or avatar and vehicle orientation when driving left.

### Tool Commands & Results
- **Vitest Challenge Suite**:
  ```powershell
  pnpm --filter @cozy/web test run src/art/vehicle-loader.challenge.test.ts src/game/vehicles.challenge.test.ts
  ```
  Result: `2 passed (2)`, `35 passed (35)`.
- **TypeScript Typecheck**:
  ```powershell
  pnpm --filter @cozy/web typecheck
  ```
  Result: `tsc -p tsconfig.json` exited with code 0 (0 errors).
- **ESLint & Prettier**:
  ```powershell
  pnpm exec eslint apps/web/src/art/vehicle.ts apps/web/src/art/vehicle-loader.ts apps/web/src/art/vehicle-loader.challenge.test.ts apps/web/src/game/vehicles.challenge.test.ts
  pnpm exec prettier --check apps/web/src/art/vehicle.ts apps/web/src/art/vehicle-loader.ts apps/web/src/art/vehicle-loader.challenge.test.ts apps/web/src/game/vehicles.challenge.test.ts
  ```
  Result: ESLint exited with code 0 (0 errors, 0 warnings); Prettier check passed.
- **Broader Web & Game-Data Vitest Suites**:
  ```powershell
  pnpm --filter @cozy/web test
  pnpm --filter @cozy/game-data test
  pnpm exec tsx --test tests/e2e/vehicles/tier1-features.test.ts tests/e2e/vehicles/tier2-boundaries.test.ts tests/e2e/vehicles/tier3-combinations.test.ts tests/e2e/vehicles/tier4-scenarios.test.ts
  ```
  Result: 72/72 tests in `@cozy/web`, 157/157 tests in `@cozy/game-data`, 74/74 tests in vehicle e2e passed.

---

## 2. Logic Chain

1. **Transform Isolation in Fallback Canvas**:
   - In `apps/web/src/art/vehicle.ts`, wrapping horizontal drawing when `dir === 1` in `ctx.save()` before `ctx.translate(48, 0); ctx.scale(-1, 1);` and `ctx.restore()` after the horizontal draw calls guarantees that the canvas rendering state is strictly popped back to the identity matrix.
   - For non-inverted directions (`dir = 0, 2, 3`), no extraneous `ctx.save()` or `ctx.restore()` calls are made, avoiding canvas state stack overhead.
   - For all 18 models (16 canonical + 2 backward-compatible models), every render at `dir = 1` performs exactly 1 `save()` and 1 `restore()`, ensuring zero stack leaks.

2. **Explicit Transform Reset in `blitFrame()`**:
   - In `apps/web/src/art/vehicle-loader.ts`, `blitFrame()` now calls `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()` before `ctx.clearRect` and `ctx.drawImage`.
   - This ensures that regardless of whether the target canvas context was freshly created, reused, or previously modified, `ctx.drawImage` executes on a guaranteed identity matrix `[1, 0, 0, 1, 0, 0]`.
   - Because Row 1 of the spritesheet (`sy = 40`) already depicts the vehicle facing Left, drawing it with identity transform ensures the vehicle faces Left in game without double-inversion.

3. **Drive Orientation Invariants**:
   - For 2-wheelers driving left (`dir = 1`):
     - Rider avatar remains visible (`riding = true`), set to frame $1 \times 3 = 3$ (avatar facing left).
     - Rider torso is cropped at $(0, 0, 32, 40)$ and offset by $y = -4$ onto the saddle.
     - Vehicle sprite requests texture key `vehicle:<model>:1:<frame>` with `dir = 1`.
   - For 4-wheelers driving left (`dir = 1`):
     - Driver avatar is hidden inside the cabin (`this.sprite.visible = false`).
     - Vehicle sprite is visible with key `vehicle:<model>:1:<frame>` facing left.
     - Headlights (`VehicleLights`) point left at angle $\pi$ rad with beam front bulbs positioned at negative $x$ offset ($x - 20$) and rear taillight at positive offset ($x + 18$).

---

## 3. Caveats

- Spritesheet generation scripts (`scripts/generate_vehicles.py`) generate Row 1 with `transpose(Image.FLIP_LEFT_RIGHT)`. The fix in `blitFrame()` relies on this contract (Row 1 is pre-flipped left). This is fully consistent with the master plan and asset pipeline.
- No caveats regarding backwards compatibility or other vehicle models: all 18 models and all test suites pass without regression.

---

## 4. Conclusion

Requirement R1 is completely resolved:
1. Matrix transform leakage in `apps/web/src/art/vehicle.ts` is eliminated via `ctx.save()` and `ctx.restore()` for `dir === 1`.
2. Double inversion in `apps/web/src/art/vehicle-loader.ts` is prevented via explicit `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()`.
3. Challenge test suites in `apps/web/src/art/vehicle-loader.challenge.test.ts` and `apps/web/src/game/vehicles.challenge.test.ts` have been hardened and verified.
4. All quality gates (tests, typecheck, lint, formatting) pass with zero errors.

---

## 5. Verification Method

### Automated Commands
1. **Target Challenge Tests**:
   ```powershell
   pnpm --filter @cozy/web test run src/art/vehicle-loader.challenge.test.ts src/game/vehicles.challenge.test.ts
   ```
2. **TypeScript Typecheck**:
   ```powershell
   pnpm --filter @cozy/web typecheck
   ```
3. **Linter & Code Style**:
   ```powershell
   pnpm exec eslint apps/web/src/art/vehicle.ts apps/web/src/art/vehicle-loader.ts apps/web/src/art/vehicle-loader.challenge.test.ts apps/web/src/game/vehicles.challenge.test.ts
   pnpm exec prettier --check apps/web/src/art/vehicle.ts apps/web/src/art/vehicle-loader.ts apps/web/src/art/vehicle-loader.challenge.test.ts apps/web/src/game/vehicles.challenge.test.ts
   ```
4. **All Web Tests**:
   ```powershell
   pnpm --filter @cozy/web test
   ```
5. **Vehicle E2E Tests**:
   ```powershell
   pnpm exec tsx --test tests/e2e/vehicles/tier1-features.test.ts tests/e2e/vehicles/tier2-boundaries.test.ts tests/e2e/vehicles/tier3-combinations.test.ts tests/e2e/vehicles/tier4-scenarios.test.ts
   ```

### Files to Inspect
- `apps/web/src/art/vehicle.ts`: lines 47-52, 203-207 (2-wheelers), lines 282-288, 426-432 (4-wheelers).
- `apps/web/src/art/vehicle-loader.ts`: lines 240-241 (`blitFrame`).
- `apps/web/src/art/vehicle-loader.challenge.test.ts`: lines 52-60, 279-287, 330-394.
- `apps/web/src/game/vehicles.challenge.test.ts`: lines 27-35, 96-105, 552-723 (Section 6).
