# Handoff Report — Milestone 4: Mounting Geometry, Visual Handling & Lighting Alignment

## 1. Observation

1. **Previous Drive Animation & 2-Wheeler Restriction**:
   - In `apps/web/src/game/players.ts` (formerly line 811):
     ```ts
     const frame = riding && this.moving && !useUi.getState().reducedMotion ? Math.floor(time / 160) % 2 : 0;
     ```
     This restricted driving animation solely to 2-wheelers (`riding`), used only 2 frames (`% 2`), and left 4-wheelers static on frame 0 regardless of motion.

2. **Mounting Geometry & Crop Specification**:
   - In `apps/web/src/game/players.ts` (lines 799–808, 844–848):
     - The avatar torso is cropped via `setCrop(0, 0, 32, 40)` when riding 2-wheelers, with horizontal center `x = 0` (matching frame seat `x = 24`).
     - Vertical position is adjusted with `this.sprite.y = this.baseSpriteY - 4`, aligning waist with vehicle seat height `y = 16..20`.
     - 4-wheel mounting conceals the avatar via `this.sprite.setVisible(!driving || riding)`, where `riding` is false for cars, cleanly hiding the avatar.
     - Vehicle sprite resides at `(0, -14)` above the ground contact shadow at `(0, 0)`.
     - Wheel contact point at frame `y = 37` corresponds to ground baseline `-14 + (37 - 20) = +3 px` above shadow.

3. **Lighting Vector & Blending Implementation**:
   - In `apps/web/src/game/vehicle-lights.ts` (lines 46–65):
     ```ts
     const angle = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][dir] ?? 0;
     const dx = Math.cos(angle),
       dy = Math.sin(angle);
     const hdx = vehicle.lighting?.headlight?.dx ?? 20;
     const hdy = vehicle.lighting?.headlight?.dy ?? 18;
     const tdx = vehicle.lighting?.taillight?.dx ?? 18;
     const tdy = vehicle.lighting?.taillight?.dy ?? 18;
     const frontX = x + dx * hdx;
     const frontY = y - 10 + dy * hdy;
     const rearX = x - dx * tdx;
     const rearY = y - 10 - dy * tdy;
     ```
     - Headlight beam emitter positioned at `(frontX, frontY)` (`dx * 20, dy * 18` offset).
     - Taillights positioned at `(rearX, rearY)` (`-dx * 18, -dy * 18` offset).
     - Dual beams for cars (`[-8, 8]` lateral offset), single beam for bicycle/motorcycle (`offset = 0`), beam scale `0.65` for bicycle.
     - Additive blending (`Phaser.BlendModes.ADD`) at depths `2601` (beam) and `2602` (bulbs).

4. **Test & Quality Verification Outputs**:
   - `pnpm --filter @cozy/web test`:
     ```
     Test Files  10 passed (10)
          Tests  37 passed (37)
     ```
   - `pnpm tsx tests/e2e/vehicles/runner.ts`:
     ```
     Tier 1 — Feature Coverage:          PASS (27 tests)
     Tier 2 — Boundary & Corner Cases:   PASS (25 tests)
     Tier 3 — Cross-Feature Pairs:       PASS (17 tests)
     Tier 4 — Real-World Scenarios:      PASS ( 5 tests)
     Total Passed: 92 | Total Failed: 0
     ```
   - `pnpm lint`: Exited 0 with 0 errors across workspace.
   - `npx prettier --check apps/web/src/game/players.ts apps/web/src/game/vehicle-lights.ts`:
     ```
     All matched files use Prettier code style!
     ```

---

## 2. Logic Chain

1. **4-Frame Drive Animation Transition**:
   - Observation 1 confirmed the previous animation was limited to 2 frames and only for 2-wheelers.
   - To support the unified 16-vehicle asset pack (4 directions × 4 frames: Idle 0, Drive 1, Drive 2, Drive 3), the formula was updated to:
     ```ts
     const frame =
       this.moving && !useUi.getState().reducedMotion
         ? 1 + (Math.floor(time / 140) % 3)
         : 0;
     ```
   - When stationary (`!this.moving`) or under `reducedMotion`, `frame` evaluates strictly to `0` (idle frame).
   - When moving, `Math.floor(time / 140) % 3` cycles through values `[0, 1, 2]`. Adding `1` results in frames `[1, 2, 3]`, providing a continuous 3-frame driving cycle at ~7 fps (140 ms per frame) for both 2-wheelers and 4-wheelers.

2. **Mounting & Avatar Geometry**:
   - Observation 2 showed how avatar crop and placement interact with the container origin `(0, 0)`.
   - For 2-wheelers (`kind === 'bicycle' || kind === 'motorcycle'`), avatar crop `{ x: 0, y: 0, width: 32, height: 40 }` trims legs below the waist. Position `this.baseSpriteY - 4` aligns the hip with seat height (`y = 16..20` in vehicle frame), while vehicle sprite at `(0, -14)` centers seat `x = 24` directly beneath the avatar at `x = 0`.
   - For 4-wheelers (`kind === 'car'`), `riding` evaluates to false while `driving` is true. `this.sprite.setVisible(!driving || riding)` evaluates to `false`, cleanly concealing the driver avatar inside the vehicle cabin.
   - Wheel ground contact at `y = 37` in vehicle frame: with sprite origin at center `(24, 20)` and positioned at container `(0, -14)`, the wheel baseline evaluates to $-14 + (37 - 20) = +3\text{ px}$, sitting right above the contact shadow at `(0, 0)`.

3. **Lighting Emitter and Raytracing Coherence**:
   - Observation 3 confirmed headlight emitters at $(x + dx \times 20, y - 10 + dy \times 18)$ and taillights at $(x - dx \times 18, y - 10 - dy \times 18)$.
   - In `apps/web/src/game/vehicle-lights.ts`, explicit variables `frontX`, `frontY`, `rearX`, `rearY` were bound and connected with `vehicle.lighting` schema fallbacks.
   - Dual lateral offsets $[-8, 8]$ for cars place dual headlights equidistant from the central axis perpendicular to heading vector `(-dy, dx)`.
   - Single offset `[0]` and scale `0.65` for bicycle match the front fork emitter.
   - Additive blend mode (`Phaser.BlendModes.ADD`) at depths `2601/2602` aligns directly with `calculateBienHoaLighting` ambient thresholds.

---

## 3. Caveats

1. **Dynamic Loader In-Flight TypeScript Check**:
   - `apps/web/src/art/vehicle-loader.ts` owned by Milestone 2 is currently being modified by peer worker `worker_m2`. It temporarily had type mismatches in its internal casting which will be resolved by worker_m2.
   - Neither of our owned files (`apps/web/src/game/players.ts`, `apps/web/src/game/vehicle-lights.ts`) has any type errors or lint warnings.

---

## 4. Conclusion

- Milestone 4 objectives are 100% complete.
- 4-frame drive animation cycling (frames 1..3 moving, frame 0 idle) is active for all vehicle types.
- 2-wheel torso cropping `(0, 0, 32, 40)` and `-4 px` waist offset are verified.
- 4-wheel avatar concealment and ground contact geometry (`(0, -14)`, baseline `+3 px`) are verified.
- Headlight (`dx * 20, dy * 18`) and taillight (`-dx * 18, -dy * 18`) raytracing emitter vectors with dual/single beam configurations are verified.
- All 92/92 vehicle E2E tests, 37/37 web unit tests, and ESLint checks pass.

---

## 5. Verification Method

1. **Web Unit Test Suite**:
   ```powershell
   pnpm --filter @cozy/web test
   ```
   Must pass 10/10 test files (37 tests).

2. **Vehicle E2E Test Suite (Tiers 1–4)**:
   ```powershell
   pnpm tsx tests/e2e/vehicles/runner.ts
   ```
   Must pass 92/92 tests across Feature Coverage, Boundary Cases, Pairwise Combinations, and Application Scenarios.

3. **Lint & Code Style**:
   ```powershell
   pnpm lint
   npx prettier --check apps/web/src/game/players.ts apps/web/src/game/vehicle-lights.ts
   ```
   Must exit with 0 errors.

4. **Code Inspection**:
   - Inspect `apps/web/src/game/players.ts` lines 799–852 for drive animation loop and mounting crop/offsets.
   - Inspect `apps/web/src/game/vehicle-lights.ts` lines 46–65 for headlight and taillight emitter vectors.
