# Handoff Report — Challenger M2_1: Frame Animation Diffs & Geometry Invariants

**Milestone**: M2  
**Agent**: challenger_m2_1 (Empirical Challenger)  
**Verdict**: **CONFIRM**

---

## 1. Observation

### Verification Harness Execution
Executed automated empirical harness `scripts/verify_m2_challenger_invariants.py`:
- Command: `python scripts/verify_m2_challenger_invariants.py`
- Result: Exited with code 0.

```
STARTING CHALLENGER M2_1 EMPIRICAL VERIFICATION HARNESS
============================================================
TEST 1: Frame Animation Byte Diffs (Frame 0 vs Frame 1)
============================================================
  [PASS] bicycles/trek-marlin-7 | Down (row 0): diff_bytes=72, diff_pixels=24
  [PASS] bicycles/trek-marlin-7 | Left (row 1): diff_bytes=475, diff_pixels=133
  [PASS] bicycles/trek-marlin-7 | Right (row 2): diff_bytes=475, diff_pixels=133
  [PASS] bicycles/trek-marlin-7 | Up (row 3): diff_bytes=57, diff_pixels=19
  [PASS] motorcycles/vespa-primavera-150 | Down (row 0): diff_bytes=99, diff_pixels=33
  [PASS] motorcycles/vespa-primavera-150 | Left (row 1): diff_bytes=667, diff_pixels=201
  [PASS] motorcycles/vespa-primavera-150 | Right (row 2): diff_bytes=667, diff_pixels=201
  [PASS] motorcycles/vespa-primavera-150 | Up (row 3): diff_bytes=75, diff_pixels=25
  [PASS] motorcycles/ducati-panigale-v4 | Down (row 0): diff_bytes=99, diff_pixels=33
  [PASS] motorcycles/ducati-panigale-v4 | Left (row 1): diff_bytes=522, diff_pixels=155
  [PASS] motorcycles/ducati-panigale-v4 | Right (row 2): diff_bytes=522, diff_pixels=155
  [PASS] motorcycles/ducati-panigale-v4 | Up (row 3): diff_bytes=75, diff_pixels=25
  [PASS] motorcycles/honda-super-cub | Down (row 0): diff_bytes=99, diff_pixels=33
  [PASS] motorcycles/honda-super-cub | Left (row 1): diff_bytes=633, diff_pixels=189
  [PASS] motorcycles/honda-super-cub | Right (row 2): diff_bytes=633, diff_pixels=189
  [PASS] motorcycles/honda-super-cub | Up (row 3): diff_bytes=75, diff_pixels=25
  [PASS] motorcycles/harley-davidson-fat-boy | Down (row 0): diff_bytes=99, diff_pixels=33
  [PASS] motorcycles/harley-davidson-fat-boy | Left (row 1): diff_bytes=642, diff_pixels=194
  [PASS] motorcycles/harley-davidson-fat-boy | Right (row 2): diff_bytes=642, diff_pixels=194
  [PASS] motorcycles/harley-davidson-fat-boy | Up (row 3): diff_bytes=75, diff_pixels=25
  [PASS] motorcycles/kawasaki-ninja-h2 | Down (row 0): diff_bytes=99, diff_pixels=33
  [PASS] motorcycles/kawasaki-ninja-h2 | Left (row 1): diff_bytes=563, diff_pixels=168
  [PASS] motorcycles/kawasaki-ninja-h2 | Right (row 2): diff_bytes=563, diff_pixels=168
  [PASS] motorcycles/kawasaki-ninja-h2 | Up (row 3): diff_bytes=75, diff_pixels=25
  [PASS] motorcycles/yamaha-yzf-r1 | Down (row 0): diff_bytes=99, diff_pixels=33
  [PASS] motorcycles/yamaha-yzf-r1 | Left (row 1): diff_bytes=583, diff_pixels=175
  [PASS] motorcycles/yamaha-yzf-r1 | Right (row 2): diff_bytes=583, diff_pixels=175
  [PASS] motorcycles/yamaha-yzf-r1 | Up (row 3): diff_bytes=75, diff_pixels=25
  [PASS] motorcycles/bmw-r1250-gs | Down (row 0): diff_bytes=99, diff_pixels=33
  [PASS] motorcycles/bmw-r1250-gs | Left (row 1): diff_bytes=669, diff_pixels=198
  [PASS] motorcycles/bmw-r1250-gs | Right (row 2): diff_bytes=669, diff_pixels=198
  [PASS] motorcycles/bmw-r1250-gs | Up (row 3): diff_bytes=75, diff_pixels=25
  [PASS] cars/mercedes-benz-g63 | Down (row 0): diff_bytes=303, diff_pixels=101
  [PASS] cars/mercedes-benz-g63 | Left (row 1): diff_bytes=1159, diff_pixels=367
  [PASS] cars/mercedes-benz-g63 | Right (row 2): diff_bytes=1159, diff_pixels=367
  [PASS] cars/mercedes-benz-g63 | Up (row 3): diff_bytes=369, diff_pixels=123
  [PASS] cars/lamborghini-aventador | Down (row 0): diff_bytes=291, diff_pixels=97
  [PASS] cars/lamborghini-aventador | Left (row 1): diff_bytes=1068, diff_pixels=334
  [PASS] cars/lamborghini-aventador | Right (row 2): diff_bytes=1068, diff_pixels=334
  [PASS] cars/lamborghini-aventador | Up (row 3): diff_bytes=348, diff_pixels=116
  [PASS] cars/porsche-911 | Down (row 0): diff_bytes=294, diff_pixels=98
  [PASS] cars/porsche-911 | Left (row 1): diff_bytes=1047, diff_pixels=328
  [PASS] cars/porsche-911 | Right (row 2): diff_bytes=1047, diff_pixels=328
  [PASS] cars/porsche-911 | Up (row 3): diff_bytes=390, diff_pixels=130
  [PASS] cars/toyota-supra-mk4 | Down (row 0): diff_bytes=294, diff_pixels=98
  [PASS] cars/toyota-supra-mk4 | Left (row 1): diff_bytes=1050, diff_pixels=328
  [PASS] cars/toyota-supra-mk4 | Right (row 2): diff_bytes=1050, diff_pixels=328
  [PASS] cars/toyota-supra-mk4 | Up (row 3): diff_bytes=336, diff_pixels=112
  [PASS] cars/ferrari-f40 | Down (row 0): diff_bytes=294, diff_pixels=98
  [PASS] cars/ferrari-f40 | Left (row 1): diff_bytes=1069, diff_pixels=335
  [PASS] cars/ferrari-f40 | Right (row 2): diff_bytes=1069, diff_pixels=335
  [PASS] cars/ferrari-f40 | Up (row 3): diff_bytes=348, diff_pixels=116
  [PASS] cars/ford-mustang | Down (row 0): diff_bytes=276, diff_pixels=92
  [PASS] cars/ford-mustang | Left (row 1): diff_bytes=1156, diff_pixels=371
  [PASS] cars/ford-mustang | Right (row 2): diff_bytes=1156, diff_pixels=371
  [PASS] cars/ford-mustang | Up (row 3): diff_bytes=342, diff_pixels=114
  [PASS] cars/rolls-royce-phantom | Down (row 0): diff_bytes=294, diff_pixels=98
  [PASS] cars/rolls-royce-phantom | Left (row 1): diff_bytes=972, diff_pixels=306
  [PASS] cars/rolls-royce-phantom | Right (row 2): diff_bytes=972, diff_pixels=306
  [PASS] cars/rolls-royce-phantom | Up (row 3): diff_bytes=360, diff_pixels=120
  [PASS] cars/tesla-model-s | Down (row 0): diff_bytes=294, diff_pixels=98
  [PASS] cars/tesla-model-s | Left (row 1): diff_bytes=984, diff_pixels=310
  [PASS] cars/tesla-model-s | Right (row 2): diff_bytes=984, diff_pixels=310
  [PASS] cars/tesla-model-s | Up (row 3): diff_bytes=360, diff_pixels=120

Test 1 Result: 64/64 checks passed.

============================================================
TEST 2: Wheel Contact Baseline Strictly Locked at y = 37
============================================================
All 16 models passed (128/128 checks):
max_solid_y (alpha > 128) == 37 and max_opaque_y (alpha == 255) == 37 across frames 0..3 in row 1 (Left) and row 2 (Right).
Below y = 37: only ground contact shadows exist (y=38: alpha ~75, y=39: alpha ~28). No solid or wheel pixels exist at y >= 38.

============================================================
TEST 3: Two-Wheeler Saddle Position (x=24, y in 16..20)
============================================================
All 8 two-wheelers passed (128/128 checks):
- `meta.json` anchorPoints.seat:
  - `trek-marlin-7`: (24, 18)
  - `vespa-primavera-150`: (24, 18)
  - `ducati-panigale-v4`: (24, 17)
  - `honda-super-cub`: (24, 18)
  - `harley-davidson-fat-boy`: (24, 19)
  - `kawasaki-ninja-h2`: (24, 17)
  - `yamaha-yzf-r1`: (24, 17)
  - `bmw-r1250-gs`: (24, 18)
- Spritesheet raster: solid saddle pixels (alpha > 128) exist strictly at x=24 with y in [16..20] across all 4 directions (Down, Left, Right, Up) and all 4 frames (cols 0..3).

OVERALL VERDICT: CONFIRM
```

### Quality Gate Checks
- `pnpm --filter @cozy/game-data test`: 20 test files passed (157 tests).
- `pnpm --filter @cozy/web test`: 14 test files passed (111 tests).
- `pnpm typecheck`: Exit code 0 (all 8 workspace projects clean).
- `pnpm lint`: Exit code 0 (clean).
- `pnpm format:check`: Exit code 0 (clean).

---

## 2. Logic Chain

1. **Premise 1 (Animation byte diffs)**: The requirement mandates that all 16 vehicle spritesheets exhibit non-zero diff bytes between frame 0 (Idle) and frame 1 (Drive 1) in all four rows (0: Down, 1: Left, 2: Right, 3: Up).
   - *Observation*: Byte diff counters and pixel diff counters evaluated by Pillow RGBA extraction show diff_bytes ranging from 57 to 1159 bytes, with zero instances of diff == 0.
   - *Inference*: Frame 0 and Frame 1 are genuinely distinct across all directions and models. Test 1 passes.

2. **Premise 2 (Wheel contact baseline)**: The requirement specifies that the lowest wheel contact pixel in row 1 (Left) and row 2 (Right) must be strictly locked at y = 37 across all 4 frames.
   - *Observation*: In all 16 models across frames 0..3 in both horizontal rows, `max_y` for solid pixels (alpha > 128) is exactly 37, and `max_y` for fully opaque wheel rubber (alpha == 255) is exactly 37. Contact pixels span the wheel base at y=37, while y=38 and y=39 contain only soft contact shadow (alpha <= 75).
   - *Inference*: The ground plane alignment is mathematically invariant at y = 37 across all frames and models. Test 2 passes.

3. **Premise 3 (Two-wheeler saddle anchoring)**: The requirement mandates that the 2-wheeler saddle must reside at x = 24 with y in 16..20 across all frames.
   - *Observation*: For all 8 two-wheeler models (1 bicycle, 7 motorcycles), `meta.json` specifies seat anchor coordinates with x = 24 and y in {17, 18, 19}. Furthermore, raster pixel inspection of every frame across all 4 directions confirms solid pixels at x = 24 in range y in [16..20], capturing both idle pose and subtle ±0.5px suspension deflection.
   - *Inference*: Saddle geometry complies strictly with the mounting avatar system requirements. Test 3 passes.

---

## 3. Caveats

- For `bicycles/trek-marlin-7` in Row 3 (Up direction only), frame 3 and frame 0 have identical byte content (`b3 == b0`), forming a 3-step loop cycle. However, between frame 0 and frame 1, diff_bytes is 57 bytes (19 differing pixels), which satisfies the explicit condition `frame 0 vs frame 1 > 0 bytes`.
- Assets in `assets/vehicles/` and mirrored in `apps/web/public/vehicles/` are verified 100% identical.

---

## 4. Conclusion

**Verdict**: **CONFIRM**.
All 16 models in `assets/vehicles/` satisfy:
1. Frame 0 vs Frame 1 diff bytes > 0 across ALL 4 directions (64/64 PASS).
2. Wheel contact pixel strictly locked at y = 37 across ALL 4 frames in Left and Right directions (128/128 PASS).
3. Two-wheeler saddle geometry strictly locked at x = 24, y in [16..20] across all frames and directions (128/128 PASS).

No regressions or violations detected.

---

## 5. Verification Method

To independently verify these results:
1. Run the challenger verification harness:
   ```powershell
   python scripts/verify_m2_challenger_invariants.py
   ```
2. Run the geometry auditor:
   ```powershell
   python scripts/audit_vehicle_geometry.py
   ```
3. Run the asset integrity checker:
   ```powershell
   node scripts/verify-vehicle-assets.mjs
   ```
4. Run workspace tests:
   ```powershell
   pnpm --filter @cozy/game-data test
   pnpm --filter @cozy/web test
   ```
