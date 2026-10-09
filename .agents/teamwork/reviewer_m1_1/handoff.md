# Handoff Report: Reviewer M1_1 — Vehicle Transform Matrix Isolation & Inversion Review

## Review Summary

**Verdict**: **APPROVE**  
**Integrity Assessment**: **PASS** (Zero integrity violations detected; implementations are genuine, robust, and verified).

---

## 1. Observation

### Codebase Observations

1. **`apps/web/src/art/vehicle.ts` — Matrix Isolation on `dir === 1`**:
   - For 2-wheelers (`kind === 'bicycle' || kind === 'motorcycle'`, lines 47–52 & 206–208):
     ```ts
     if (dir === 1 || dir === 2) {
       if (dir === 1) {
         ctx.save();
         ctx.translate(48, 0);
         ctx.scale(-1, 1);
       }
       // ... drawing operations ...
       if (dir === 1) {
         ctx.restore();
       }
     }
     ```
     Observed: `ctx.save()` is called prior to `ctx.translate` and `ctx.scale`. Drawing executes without early exits, and `ctx.restore()` is called before leaving the horizontal block.
   - For 4-wheelers (`kind === 'car'`, lines 282–287 & 431–433):
     ```ts
     if (dir === 1 || dir === 2) {
       if (dir === 1) {
         ctx.save();
         ctx.translate(48, 0);
         ctx.scale(-1, 1);
       }
       // ... drawing operations ...
       if (dir === 1) {
         ctx.restore();
       }
     }
     ```
     Observed: Symmetrical and balanced `ctx.save()` and `ctx.restore()` wrapping for `dir === 1`.
   - For vertical directions (`dir === 0, 3`), no extraneous `ctx.save()` or `ctx.restore()` calls are made.

2. **`apps/web/src/art/vehicle-loader.ts` — Blit Transform Reset in `blitFrame()`**:
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
     Observed: Explicit `ctx.setTransform(1, 0, 0, 1, 0, 0)` and optional-chained `ctx.resetTransform?.()` are executed before `ctx.clearRect` and `ctx.drawImage`.
     Observed: `safeDir` and `safeFrame` perform safe wrapping for negative or out-of-range direction/frame values.

3. **`apps/web/src/art/vehicle-loader.challenge.test.ts` & `apps/web/src/game/vehicles.challenge.test.ts`**:
   - `vehicle-loader.challenge.test.ts` contains 14 rigorous tests covering path traversal defense, coalescing concurrent loads, metadata fallback, in-place texture update, transform reset order (`setTransform` before `clearRect` and `drawImage`), and destruction safety.
   - `vehicles.challenge.test.ts` Section 6 (lines 552–740) contains 6 comprehensive tests verifying strict matrix isolation, call ordering (`save < translate < scale < restore`), absence of save/restore on other directions, matrix balance across all 18 vehicle models at all 4 frames, and driver mounting/orientation for 2-wheelers and 4-wheelers.

### Tool Commands & Verbatim Execution Results

1. **Target Challenge Test Suite**:
   ```powershell
   pnpm --filter @cozy/web test run src/art/vehicle-loader.challenge.test.ts src/game/vehicles.challenge.test.ts
   ```
   Output:
   ```
   ✓ src/art/vehicle-loader.challenge.test.ts (14 tests) 25ms
   ✓ src/game/vehicles.challenge.test.ts (21 tests) 93ms
   Test Files  2 passed (2)
   Tests  35 passed (35)
   ```

2. **TypeScript Typecheck**:
   ```powershell
   pnpm --filter @cozy/web typecheck
   ```
   Output: Exited with code 0 (0 errors).

3. **Lint & Code Style**:
   ```powershell
   pnpm exec eslint apps/web/src/art/vehicle.ts apps/web/src/art/vehicle-loader.ts apps/web/src/art/vehicle-loader.challenge.test.ts apps/web/src/game/vehicles.challenge.test.ts
   pnpm exec prettier --check apps/web/src/art/vehicle.ts apps/web/src/art/vehicle-loader.ts apps/web/src/art/vehicle-loader.challenge.test.ts apps/web/src/game/vehicles.challenge.test.ts
   ```
   Output: ESLint exited with code 0 (0 errors, 0 warnings); Prettier checked: "All matched files use Prettier code style!".

4. **Full Workspace Regressions**:
   - `@cozy/web` unit tests: 12 test files, 72 passed, 0 failed.
   - `@cozy/game-data` tests: 20 test files, 157 passed, 0 failed.
   - Vehicle E2E test suite (`tier1`–`tier4`): 4 suites, 74 passed, 0 failed.

---

## 2. Logic Chain

1. **Matrix Leakage Prevention**:
   - In `apps/web/src/art/vehicle.ts`, any horizontal flip on `dir === 1` was previously executed directly on the canvas 2D rendering context without pushing/popping the state matrix.
   - By enclosing `ctx.translate(48, 0)` and `ctx.scale(-1, 1)` within `ctx.save()` and `ctx.restore()`, the context's CTM (Current Transformation Matrix) is guaranteed to revert back to identity `[1, 0, 0, 1, 0, 0]` when `vehicleCanvas` returns.
   - This prevents downstream operations (such as `paintVehicleDealer` or Phaser texture blitting) from inheriting an inverted coordinate space.

2. **Double Inversion Elimination**:
   - Spritesheet PNG assets in row 1 (`sy = 40`) are pre-baked with horizontal flipping (facing left).
   - If a canvas context retains `scale(-1, 1)`, executing `ctx.drawImage` onto it flips the image a second time: $(-1) \times (-1) = 1$, making left-driving vehicles face right.
   - By explicitly executing `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()` in `blitFrame()` before drawing, the canvas context is guaranteed to be in the identity coordinate system regardless of prior canvas state.
   - This eliminates the double inversion defect permanently.

3. **Integrity & Authenticity**:
   - Examined implementation code line by line for facade implementations, mock shortcuts, hardcoded test strings, or fake logic.
   - All code is functional, modular, cleanly typed, follows idiomatic HTML5 Canvas and Phaser patterns, and operates against real data.
   - No integrity violations exist.

---

## 3. Caveats

- **Spritesheet row contract**: Spritesheet generation scripts (`scripts/generate_vehicles.py`) generate row 1 (`sy = 40`) as pre-flipped left. `blitFrame`'s identity blit relies on this contract. This is intentional and adheres to the project art specification.
- No other caveats: all 18 vehicle models (16 canonical + 2 aliases) pass all tests without regressions.

---

## 4. Conclusion

Requirement R1 is completely verified and satisfies all specifications:
1. Matrix isolation for `dir === 1` via `ctx.save()` / `ctx.restore()` is correct, leak-free, and balanced.
2. Transform reset in `blitFrame()` via `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()` is correct and verified.
3. Test suites and typecheck pass 100% cleanly.
4. Final verdict: **APPROVE**.

---

## 5. Verification Method

To independently reproduce the verification results:

```powershell
# 1. Target Challenge Vitest Suite
pnpm --filter @cozy/web test run src/art/vehicle-loader.challenge.test.ts src/game/vehicles.challenge.test.ts

# 2. Typecheck
pnpm --filter @cozy/web typecheck

# 3. Linter & Prettier
pnpm exec eslint apps/web/src/art/vehicle.ts apps/web/src/art/vehicle-loader.ts apps/web/src/art/vehicle-loader.challenge.test.ts apps/web/src/game/vehicles.challenge.test.ts
pnpm exec prettier --check apps/web/src/art/vehicle.ts apps/web/src/art/vehicle-loader.ts apps/web/src/art/vehicle-loader.challenge.test.ts apps/web/src/game/vehicles.challenge.test.ts

# 4. Full Web Vitest Suite
pnpm --filter @cozy/web test

# 5. Full Game-Data Vitest Suite
pnpm --filter @cozy/game-data test

# 6. E2E Vehicle Integration Tests
pnpm exec tsx --test tests/e2e/vehicles/tier1-features.test.ts tests/e2e/vehicles/tier2-boundaries.test.ts tests/e2e/vehicles/tier3-combinations.test.ts tests/e2e/vehicles/tier4-scenarios.test.ts
```

Files to inspect:
- `apps/web/src/art/vehicle.ts`: lines 48–52, 206–208, 283–287, 431–433.
- `apps/web/src/art/vehicle-loader.ts`: lines 240–241.
- `apps/web/src/art/vehicle-loader.challenge.test.ts`: lines 341–402.
- `apps/web/src/game/vehicles.challenge.test.ts`: lines 552–740.

---

## Adversarial Challenge Report

### Challenge Summary
- **Overall risk assessment**: **LOW**
- **Integrity Violation Risk**: **NONE**

### Challenges & Stress Tests Evaluated

1. **Challenge 1: Reused / Dirty Canvas Rendering Context**:
   - *Attack scenario*: A caller passes a canvas context with arbitrary rotations, scales, or translations into `blitFrame()`.
   - *Result*: `blitFrame()` unconditionally calls `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()` before `ctx.clearRect` and `ctx.drawImage`. The transform matrix is reset to identity before drawing. **PASS**.

2. **Challenge 2: Out of Range Direction or Frame Index**:
   - *Attack scenario*: Caller invokes `blitFrame` with negative numbers (`dir = -1`) or numbers $> 3$ (`frame = 10`).
   - *Result*: The formula `((n % 4) + 4) % 4` mathematically constrains all inputs into $\{0, 1, 2, 3\}$. Verified with test coverage. **PASS**.

3. **Challenge 3: Asynchronous Destruction Race Condition**:
   - *Attack scenario*: Scene is destroyed or texture is unmounted while `loadVehicleSpritesheet` network request is in flight.
   - *Result*: `ensureVehicleTexture` checks `if (!scene.textures?.exists(key)) return;` before referencing `getContext()` or calling `refresh()`. No memory leak or ghost texture revival. **PASS**.

4. **Challenge 4: Save / Restore Balance Under Exceptions**:
   - *Attack scenario*: If an error were thrown inside `vehicleCanvas`, `ctx.restore()` might not execute.
   - *Result*: `vehicleCanvas` performs only synchronous integer arithmetic and Canvas `fillRect` calls without network or external dynamic evaluation. No exceptions can occur between `save()` and `restore()`. **PASS**.
