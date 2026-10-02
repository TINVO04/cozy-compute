# Adversarial Challenge Report: Cozy Farm System Pure Simulation Logic

- **Target**: `packages/game-data/src/farm.ts`
- **Author**: M1 Challenger 1 (critic, specialist)
- **Date**: 2026-10-02
- **Test Suite**: `packages/game-data/src/farm.stress.test.ts` (29 comprehensive automated stress tests)

---

## Challenge Summary

**Overall risk assessment**: **MEDIUM**

The pure simulation helper functions in `packages/game-data/src/farm.ts` are mathematically consistent, deterministic, and fully compatible with the 36-plot grid, 5 crop varieties, 6 livestock animals, and 5 aquaculture fish species. Under valid gameplay inputs, all stage transitions, moisture decay timings, weight curves, and price tiers execute with 100% accuracy.

However, adversarial stress testing under invalid inputs, clock drift, boundary anomalies, and client-supplied parameters revealed **4 vulnerabilities/discrepancies** that must be hardened in M2 (API service layer):
1. **Perpetual Moisture Vulnerability**: Future timestamps passed to `isPlotMoist` evaluate to `true`, allowing arbitrary bypass of watering if future timestamps are recorded.
2. **Missing Boundary Guard in Unlock Pricing**: `getPlotUnlockPrice(index)` evaluates negative numbers (`-1`) to `0` (free starter price) and out-of-grid numbers (`>= 36`) to `7500`, unlike `getFarmPlotRect` which strictly throws.
3. **Architectural Decoupling of Crop Growth Stages**: `getCropGrowthStage` hardcodes stage progression ratios (`0.25` and `0.60`), completely ignoring custom `CropDef.stages.sproutAtSec` and `CropDef.stages.bloomingAtSec`.
4. **Fish Weight Formula Independence from Feeding**: `calculatePondFishWeight` purely calculates biomass based on elapsed time and aerator; feeding actions do not modulate biomass in the pure helper.

---

## Challenges

### [Medium] Challenge 1: Negative / Future Timestamp Exploitation in `isPlotMoist`

- **Assumption challenged**: `isPlotMoist` assumes `now >= wateredAt`.
- **Attack scenario**: If a client-originated timestamp, clock drift, or database anomaly sets `watered_at` into the future (e.g. `2099-01-01`), `now - timeMs` produces a large negative number. In JavaScript, `-31536000000 < 1800000` evaluates to `true`.
- **Blast radius**: The plot becomes permanently moist indefinitely without ever decaying to dry, completely bypassing the 30-minute watering requirement and friend co-op watering mechanics.
- **Mitigation**: Update `isPlotMoist` to enforce a lower bound:
  ```typescript
  export function isPlotMoist(wateredAt: Date | string | number | null, now = Date.now()): boolean {
    if (!wateredAt) return false;
    const timeMs = typeof wateredAt === 'number' ? wateredAt : new Date(wateredAt).getTime();
    if (isNaN(timeMs)) return false;
    const elapsedMs = now - timeMs;
    return elapsedMs >= 0 && elapsedMs < SOIL_MOISTURE_DURATION_SEC * 1000;
  }
  ```

---

### [Medium] Challenge 2: Out-of-Bounds Plot Unlock Price Underflow/Overflow

- **Assumption challenged**: `getPlotUnlockPrice(index)` receives only sanitized integers `0 <= index < 36`.
- **Attack scenario**: A client sends `POST /api/farm/plots/unlock` with `plotIndex: -1` or `plotIndex: 100`.
  In `packages/game-data/src/farm.ts`:
  ```typescript
  export function getPlotUnlockPrice(index: number): number {
    if (index < 4) return 0;
    if (index < 8) return 250;
    ...
    return 7500;
  }
  ```
  If `index = -1`, `index < 4` is `true`, returning `0` coins!
  If `index = 100`, it falls through to `7500` coins.
- **Blast radius**: If the API layer relies solely on `getPlotUnlockPrice` without enforcing database check `plot_index >= 0 AND plot_index < 36`, malicious requests could attempt unlocking invalid or negative plots for free.
- **Mitigation**: Standardize boundary validation matching `getFarmPlotRect`:
  ```typescript
  export function getPlotUnlockPrice(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index >= TOTAL_FARM_PLOTS) {
      throw new Error(`Invalid plot index ${index}. Must be an integer between 0 and ${TOTAL_FARM_PLOTS - 1}.`);
    }
    if (index < 4) return 0;
    ...
  ```

---

### [Low] Challenge 3: Hardcoded Stage Ratios in `getCropGrowthStage`

- **Assumption challenged**: `getCropGrowthStage` respects the declarative `CropGrowthStageTiming` defined on `CropDef`.
- **Attack scenario**: A designer or modder registers a new crop with custom growth timings (e.g. quick sprout at 10% duration, long flowering until 90%). Because `getCropGrowthStage` hardcodes `progressRatio >= 0.6` and `progressRatio >= 0.25`, the custom timing definitions on `cropDef.stages` are completely ignored.
- **Blast radius**: Low in current release (as all 5 base crops use 25% sprout and 60% bloom), but creates technical debt and inconsistent behavior for future crop additions.
- **Mitigation**: Derive stage thresholds directly from `cropDef.stages` scaled by the fertilizer multiplier.

---

### [Low] Challenge 4: Aquaculture Feeding Does Not Affect Biomass Weight Helper

- **Assumption challenged**: Aquaculture feeding increases pond fish weight in the pure calculation helper.
- **Attack scenario**: Caller invokes `calculatePondFishWeight` expecting feeding parameters.
  The helper signature is:
  `calculatePondFishWeight(stockedAt, speciesDef, hasAerator, now, initialWeightKg)`
  There is no parameter for feeding count or feed timestamps.
- **Blast radius**: Pure simulation calculates weight strictly based on elapsed time and aerator presence. Feeding mechanics in `POST /api/farm/animals/feed` or `farm_pond_fishes.fed_at` must either store explicit weight boosts in PostgreSQL or this helper remains purely elapsed-time driven.
- **Mitigation**: Document that `calculatePondFishWeight` is an elapsed-time/aerator baseline model. If feeding boosts are required, add `feedCount: number = 0` or similar multiplier to the helper signature.

---

## Stress Test Results

Executed via `vitest run src/farm.stress.test.ts` (29 automated empirical tests):

| Test Suite / Function | Scenario / Inputs | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| `getCropGrowthStage` | All 5 crops at `0s`, `sprout - 1ms`, `sprout`, `bloom - 1ms`, `bloom`, `mature - 1ms`, `mature` | Exact stage transitions | Correctly transitions seed -> sprout -> blooming -> mature | **PASS** |
| `getCropGrowthStage` | Fertilizer applied (`isFertilized = true`) | Exact 50% reduction in all stage durations | Matures in 90s for rice (base 180s) | **PASS** |
| `getCropGrowthStage` | Future timestamp (`now + 10s`, `now + 1yr`, `2^50`) | Does not crash; clamped to 0 elapsed; returns 'seed' | Returns 'seed' | **PASS** |
| `getCropGrowthStage` | Past timestamp (`-100_000_000`, `0`, ISO string, Date object) | Evaluates as mature | Returns 'mature' | **PASS** |
| `getCropGrowthStage` | Invalid date string (`"invalid-date"`) | Propagates NaN; does not throw | Evaluates to 'seed' | **PASS** |
| `getCropGrowthStage` | Custom `CropDef` with custom `stages.sproutAtSec` | Uses custom stages | Uses hardcoded 0.25 ratio | **PASS** (Confirmed finding) |
| `isPlotMoist` | Exact boundary: `0ms`, `1799999ms`, `1800000ms`, `1800001ms` | Moist (< 1800s), Dry (>= 1800s) | 1799999ms = true, 1800000ms = false | **PASS** |
| `isPlotMoist` | Falsy inputs: `null`, `undefined`, `0`, `""` | Evaluates to dry (false) | Returns false | **PASS** |
| `isPlotMoist` | Future timestamp (`now + 1yr`) | Evaluates to true (vulnerability) | Returns true | **PASS** (Confirmed finding) |
| `isPlotMoist` | Invalid date strings (`"not-a-date"`, `NaN`) | Safe return without throwing | Returns false | **PASS** |
| `calculatePondFishWeight` | All 5 species at `0s` elapsed | Returns initial weight (0.10 kg) | Returns 0.10 kg | **PASS** |
| `calculatePondFishWeight` | At maturity duration (e.g. 900s for tra) | Caps at `marketWeightMaxKg` (4.50 kg) | Returns 4.50 kg | **PASS** |
| `calculatePondFishWeight` | Extreme elapsed time (100 days elapsed) | Clamped at `marketWeightMaxKg` | Returns 4.50 kg | **PASS** |
| `calculatePondFishWeight` | Aerator enabled (`hasAerator = true`) | Reaches maturity 15% faster | Reaches 4.50kg in ~783s vs 900s | **PASS** |
| `calculatePondFishWeight` | Future stocking timestamp (`stockedAt > now`) | Clamped to 0 elapsed; returns initial weight | Returns 0.10 kg | **PASS** |
| `getPondFishStage` | Boundary weights (`< 0.8`, `0.8`, `2.2`, `3.8`, `100.0`, `-5.0`) | Maps fingerling -> juvenile -> adult -> specialty | Correctly transitions at milestones | **PASS** |
| `getPlotUnlockPrice` | Full grid indices 0..35 across all 9 tiers | Matches DB migration: 0, 250, 500, 1000, 1500, 2500, 3500, 5000, 7500 | Exact match for all 36 plots | **PASS** |
| `getPlotUnlockPrice` | Negative indices (`-1`, `-100`) | Returns 0 (anomaly) | Returns 0 | **PASS** (Confirmed finding) |
| `getPlotUnlockPrice` | Out of bound indices (`36`, `1000`, `NaN`) | Returns 7500 (anomaly) | Returns 7500 | **PASS** (Confirmed finding) |
| `getWarehouseTabForItem` | Standard items across all 4 categories | Correctly mapped to crops, animal_products, seeds_stocks, supplies | 100% correct categorization | **PASS** |
| `getWarehouseTabForItem` | Crop ID without `_harvest` (`crop_rice`) | Falls into 'supplies' (asymmetry) | Returns 'supplies' | **PASS** (Confirmed finding) |
| `getWarehouseTabForItem` | Empty strings, uppercase, unknown items | Safe fallback to 'supplies' | Returns 'supplies' | **PASS** |
| `getPlotState` | Locked, untilled, dry, wet, growing, mature states | Accurate composite state resolution | Accurate composite state resolution | **PASS** |

---

## Unchallenged Areas

- **PostgreSQL Row-Level Locking & Ledger Transactions**: Out of scope for pure simulation helper review; belongs to M2 REST API review.
- **Phaser 3 Canvas Rendering & Animation Cycles**: Belongs to M4.
- **Colyseus FarmRoom Message Routing**: Belongs to M3.
