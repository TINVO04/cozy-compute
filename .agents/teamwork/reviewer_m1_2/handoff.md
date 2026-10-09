# Handoff Report: Reviewer M1_2 — Adversarial & Quality Review for Milestone M1

## Review Summary

**Verdict**: **APPROVE**  
**Integrity Assessment**: **PASS** (Zero integrity violations; genuine procedural logic, full asset loading lifecycle, robust test coverage with no facades or shortcuts).  
**Adversarial Risk Assessment**: **LOW** (Defenses against matrix leakage, double-inversion, path traversal, race conditions, and destroyed textures are verified).

---

## 1. Observation

### Codebase Observations

1. **`apps/web/src/art/vehicle.ts` — Matrix Transform Isolation**:
   - For 2-wheelers (`bicycle` and `motorcycle`, lines 47–52 and 206–208):
     ```ts
     if (dir === 1 || dir === 2) {
       if (dir === 1) {
         ctx.save();
         ctx.translate(48, 0);
         ctx.scale(-1, 1);
       }
       // ... vehicle rendering ...
       if (dir === 1) {
         ctx.restore();
       }
     }
     ```
     Observed: When `dir === 1`, `ctx.save()` precedes horizontal flip transformation. `ctx.restore()` is guaranteed to execute at the close of the horizontal drawing block before returning the canvas.
   - For 4-wheelers (`car`, lines 282–288 and 431–433):
     ```ts
     if (dir === 1 || dir === 2) {
       if (dir === 1) {
         ctx.save();
         ctx.translate(48, 0);
         ctx.scale(-1, 1);
       }
       // ... vehicle rendering ...
       if (dir === 1) {
         ctx.restore();
       }
     }
     ```
     Observed: Exactly one `ctx.save()` and one `ctx.restore()` wrap all drawing operations for left-facing cars. No early return or branching bypasses `ctx.restore()`.
   - Vertical directions (`dir === 0, 3`) execute neither `save()` nor `restore()`, preserving stack neutrality.

2. **`apps/web/src/art/vehicle-loader.ts` — Matrix Reset in `blitFrame()`**:
   - In lines 230–246:
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
       ctx.setTransform(1, 0, 0, 1, 0, 0);
       ctx.resetTransform?.();
       if (typeof ctx.clearRect === 'function') {
         ctx.clearRect(0, 0, 48, 40);
       }
       ctx.drawImage(img, sx, sy, 48, 40, 0, 0, 48, 40);
     }
     ```
     Observed: `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()` explicitly restore the identity transform matrix prior to clearing and drawing the image.
     Observed: Row 1 of generated spritesheets (`sy = safeDir * 40 = 40`) is already flipped left (`transpose(Image.FLIP_LEFT_RIGHT)`). Because the transform is reset to identity before `drawImage`, double-inversion is completely avoided.

3. **`apps/web/src/art/vehicle-loader.ts` — Texture Lifecycle & Async Upgrades**:
   - In lines 258–312 (`ensureVehicleTexture`):
     - Synchronous canvas texture registration via `vehicleCanvas(id, dir, frame)` ensures zero downtime and prevents white screens during asset loading.
     - Asynchronous load deduplication via `inFlightSpritesheets` map prevents redundant network requests.
     - Texture destruction guard at line 286 (`if (!scene.textures?.exists(key)) return;`) prevents resurrecting textures if the scene or texture was destroyed before asset download completed.
     - In-place context update and `currentTex.refresh()` properly pushes pixel updates to Phaser/WebGL.

4. **Security & Input Sanitization in `resolveVehicleAssetPath`**:
   - Lines 50–53:
     ```ts
     if (trimmed.includes('..') || trimmed.includes('\\') || trimmed.startsWith('/')) {
       return null;
     }
     ```
     Rejects path traversal, directory navigation, and illegal characters.

### Verbatim Tool Commands and Execution Results

1. **Web Test Suite**:
   ```powershell
   pnpm --filter @cozy/web test
   ```
   Result:
   ```
   ✓ src/lib/endpoints.test.ts (3 tests)
   ✓ src/game/river-motion.test.ts (2 tests)
   ✓ src/game/movement-interpolation.test.ts (2 tests)
   ✓ src/game/movement-prediction.test.ts (8 tests)
   ✓ src/art/vehicle-loader.challenge.test.ts (14 tests)
   ✓ src/game/fishing-motion.test.ts (3 tests)
   ✓ src/game/showroom.test.ts (5 tests)
   ✓ src/game/stash-held-item.test.ts (3 tests)
   ✓ src/game/weather-engine.test.ts (5 tests)
   ✓ src/art/fish-layout.test.ts (3 tests)
   ✓ src/art/sword-art.test.ts (3 tests)
   ✓ src/game/vehicles.challenge.test.ts (21 tests)

   Test Files  12 passed (12)
   Tests       72 passed (72)
   Duration    1.45s
   ```

2. **Prettier Format Check**:
   ```powershell
   pnpm format:check
   ```
   Result:
   ```
   Checking formatting...
   All matched files use Prettier code style!
   ```

3. **ESLint**:
   ```powershell
   pnpm lint
   ```
   Result:
   ```
   > eslint .
   (Exited with code 0, 0 errors, 0 warnings)
   ```

4. **Workspace Typecheck**:
   ```powershell
   pnpm typecheck
   ```
   Result:
   ```
   Scope: 8 of 9 workspace projects
   packages/game-assets typecheck: Done
   packages/game-data typecheck: Done
   packages/economy typecheck: Done
   packages/map-editor typecheck: Done
   apps/realtime typecheck: Done
   apps/api typecheck: Done
   apps/web typecheck: Done
   (Exited with code 0)
   ```

5. **Deep Pixel Geometry Audit**:
   ```powershell
   python scripts/audit_vehicle_geometry.py
   ```
   Result:
   ```
   Running Deep Pixel Geometry Audit on all 16 vehicle models...
   All 16 models 100% COMPLIANT with all geometric and artistic constraints!
   ```

6. **Vehicle Asset Integrity Audit**:
   ```powershell
   node scripts/verify-vehicle-assets.mjs
   ```
   Result:
   ```
   Models verified: 16
   Total files checked across both locations: 128 / 128
   Total errors found: 0
   All 16 vehicle asset packs VERIFIED SUCCESSFULLY in both locations!
   ```

7. **Vehicle End-to-End Suite**:
   ```powershell
   pnpm exec tsx --test tests/e2e/vehicles/tier1-features.test.ts tests/e2e/vehicles/tier2-boundaries.test.ts tests/e2e/vehicles/tier3-combinations.test.ts tests/e2e/vehicles/tier4-scenarios.test.ts
   ```
   Result: `74 pass, 0 fail` across 18 test suites.

---

## 2. Logic Chain

1. **From Observation 1 to Matrix Isolation**:
   - Calling `ctx.save()` before `ctx.translate(48, 0)` and `ctx.scale(-1, 1)` pushes the initial identity matrix `[1, 0, 0, 1, 0, 0]` onto the canvas rendering state stack.
   - Calling `ctx.restore()` at the end of the `dir === 1` drawing block pops the state stack and restores the 2D context strictly to the identity matrix.
   - Because a fresh canvas element is created on every call to `vehicleCanvas`, no accumulated transforms or stack leaks can occur. The returned canvas has a pristine, un-flipped coordinate system.

2. **From Observation 2 to Elimination of Double-Inversion**:
   - When generated spritesheet frames for direction 1 (Row 1, `sy = 40`) are blitted onto a canvas via `blitFrame()`, `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()` ensure that the target canvas context is explicitly set to identity before `ctx.drawImage` executes.
   - Since Row 1 of the spritesheet was already generated facing left, drawing it onto an identity-transformed canvas renders the vehicle facing left correctly without a second horizontal inversion.

3. **From Observations 3 & 4 to System Robustness**:
   - Checking `scene.textures?.exists(key)` before updating the Phaser canvas texture prevents memory corruption and race conditions where late network responses resurrect destroyed textures.
   - Path validation in `resolveVehicleAssetPath` guarantees that inputs with `..`, `\`, or leading `/` are rejected, preventing arbitrary file inclusion or SSRF-like local path traversal.
   - In-flight request deduplication via `inFlightSpritesheets` coalesces concurrent requests for the same spritesheet into a single Promise, bounding network and CPU overhead.

---

## 3. Adversarial Challenges & Findings

### Findings

#### [Minor] Finding 1: Potential Sub-Pixel Coordinate Bleeding on Floating-Point Direction/Frame Values
- **Where**: `apps/web/src/art/vehicle-loader.ts`, lines 236–239 in `blitFrame()`:
  ```ts
  const safeDir = ((dir % 4) + 4) % 4;
  const safeFrame = ((frame % 4) + 4) % 4;
  const sx = safeFrame * 48;
  const sy = safeDir * 40;
  ```
- **Why**: If a non-integer float were passed as `dir` or `frame` (e.g., from an unrounded game loop calculation), `safeDir` and `safeFrame` would remain fractional, causing `sx` and `sy` to be fractional floats. In a pixel-art game, sub-pixel canvas blitting can cause antialiased blurring across sprite grid boundaries.
- **Current Mitigation**: In the actual codebase, Phaser animations pass integer frames (`0, 1, 2, 3`) and avatar headings are integer enums (`0, 1, 2, 3`), so this does not trigger in practice.
- **Suggestion**: For future defense-in-depth, wrap with `Math.floor`:
  `const safeDir = Math.floor(((dir % 4) + 4) % 4);`
  `const safeFrame = Math.floor(((frame % 4) + 4) % 4);`

---

### Adversarial Stress Test Results

| Attack Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| **Path Traversal Attack**: Pass `../../etc/passwd` or `..\windows\system32` to asset loader | Reject and return `null` | Returns `null` immediately | **PASS** |
| **Double Inversion Attack**: Pass pre-flipped left frame to canvas previously used for `dir = 1` | `blitFrame` resets transform before blitting; image remains left-facing | `setTransform(1, 0, 0, 1, 0, 0)` invoked before `clearRect` and `drawImage` | **PASS** |
| **Transform Stack Depth Attack**: Call `vehicleCanvas(id, 1, frame)` 1000 times in rapid succession | Exactly 1 save and 1 restore per canvas; no stack overflow or memory leak | Fresh canvas per call; perfectly balanced 1:1 save/restore calls | **PASS** |
| **Late Network Resolution on Destroyed Texture**: Scene removed while spritesheet is downloading | Loader does not crash or recreate texture on dead scene | `scene.textures.exists(key)` returns false; loader exits silently | **PASS** |
| **Concurrent Request Spike**: 50 simultaneous calls to `ensureVehicleTexture` for same vehicle | 1 network request; all 50 resolve to shared image | Exactly 1 `MockImage` instantiated; all 50 promises share single instance | **PASS** |

---

## 4. Caveats & Scope Notes

- **Unrelated Realtime Test Failure**: Running full workspace tests revealed a failure in `apps/realtime/src/rooms/town-life.test.ts` (cat carry sync / town life actors). Git history inspection confirmed this failure predated Milestone M1 and is confined entirely to the server-side realtime package. It has no bearing on web client vehicle rendering.
- **Browser Canvas Mocking in Vitest**: Vitest tests run under Node.js with mocked DOM canvas/Image elements. Full integration was independently validated using Python geometry audits and Node asset verifiers against actual binary PNGs.

---

## 5. Conclusion

Milestone M1 (Requirement R1 — Transform Matrix Leakage & Left Drive Inversion Fix) is completely and robustly implemented:
1. Matrix transform isolation is strictly enforced via `ctx.save()` and `ctx.restore()` in `apps/web/src/art/vehicle.ts`.
2. Double inversion is eliminated via explicit `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()` in `apps/web/src/art/vehicle-loader.ts`.
3. Zero integrity violations detected (no hardcoded outputs, fake implementations, or bypassed checks).
4. All quality gates pass: `pnpm --filter @cozy/web test` (72/72 tests passed), `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `audit_vehicle_geometry.py` (16/16 models compliant), and `verify-vehicle-assets.mjs` (128/128 files verified).

Final Recommendation: **APPROVE**.

---

## 6. Verification Method

To independently reproduce and verify this review:

1. **Run Web Test Suites**:
   ```powershell
   pnpm --filter @cozy/web test
   ```
2. **Run Linter & Formatting Checks**:
   ```powershell
   pnpm format:check
   pnpm lint
   ```
3. **Run TypeScript Typecheck**:
   ```powershell
   pnpm typecheck
   ```
4. **Run Vehicle Geometry & Asset Audits**:
   ```powershell
   python scripts/audit_vehicle_geometry.py
   node scripts/verify-vehicle-assets.mjs
   ```
5. **Run Vehicle E2E Suite**:
   ```powershell
   pnpm exec tsx --test tests/e2e/vehicles/tier1-features.test.ts tests/e2e/vehicles/tier2-boundaries.test.ts tests/e2e/vehicles/tier3-combinations.test.ts tests/e2e/vehicles/tier4-scenarios.test.ts
   ```
