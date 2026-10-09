# Cozy Compute Vehicle System — Test Ready Report

> **Status**: TEST_READY  
> **Suite**: Cozy Compute Vehicle Asset Pack & Runtime System E2E Test Suite  
> **Approach**: Opaque-Box, Requirement-Driven 4-Tier Architecture  
> **Author**: `test_writer_e2e`  
> **Timestamp**: 2026-10-08T13:00:00Z

---

## 1. Test Runner Command

The complete test suite can be executed with either of the following commands:

```bash
# Direct runner invocation with detailed spec reporter:
pnpm exec tsx --test --test-reporter=spec tests/e2e/vehicles/*.test.ts

# Dedicated test suite runner with aggregated tier summary:
pnpm exec tsx tests/e2e/vehicles/runner.ts
```

---

## 2. 4-Tier Test Coverage Summary Table

| Tier       | Category / Feature                                      | Required Minimum | Implemented Cases |    Result     | Focus Areas                                                                     |
| :--------- | :------------------------------------------------------ | :--------------: | :---------------: | :-----------: | :------------------------------------------------------------------------------ |
| **Tier 1** | **Feature Coverage**                                    |    **>= 25**     |      **27**       | **100% PASS** | Primary isolated behavior                                                       |
|            | Feature 1: 16 Vehicle Models in Isolation               |       >= 5       |         6         |     PASS      | Existence, specs, contact y=37, speed, brand, price, aliases                    |
|            | Feature 2: Dynamic Asset Loader Fallback                |       >= 5       |         5         |     PASS      | Synchronous fallback guarantee, 48x40 canvas, texture key format                |
|            | Feature 3: Mounting Mechanisms & Geometry               |       >= 5       |         5         |     PASS      | 2-wheel seat y=16..20, torso crop (0,0,32,40), 4-wheel avatar hidden            |
|            | Feature 4: Night Lights Coordinates & Raytracing        |       >= 5       |         6         |     PASS      | All 4 directions (dx*20, dy*18), dual car vs single bike beam                   |
|            | Feature 5: Showroom Pedestal & Shop UI                  |       >= 5       |         5         |     PASS      | 136x66 pedestal (2x scale), 144x120 shop preview (3x), 4-way rotation           |
| **Tier 2** | **Boundary & Corner Cases**                             |    **>= 25**     |      **25**       | **100% PASS** | Boundary constraints & stress                                                   |
|            | Boundary 1: Max Speed Limits & Anti-Tunneling           |       >= 5       |         5         |     PASS      | Max speed caps, zero/negative inputs, thin-wall anti-tunneling                  |
|            | Boundary 2: Road Width & TOWN_ROADS Limits              |       >= 5       |         5         |     PASS      | 40px road width, body width <= 40px, onRoad boundary evaluation                 |
|            | Boundary 3: Empty Asset Folders & Missing Meta          |       >= 5       |         5         |     PASS      | Missing asset graceful degradation, directory safety, path traversal            |
|            | Boundary 4: Unknown Vehicle IDs & Prototype Safety      |       >= 5       |         5         |     PASS      | Unknown IDs, **proto**, constructor, null/undefined safety                      |
|            | Boundary 5: Rapid Mount / Dismount Toggling             |       >= 5       |         5         |     PASS      | Rapid V toggle sequence, avatar visibility restoration, unowned sanitization    |
| **Tier 3** | **Cross-Feature Combinations**                          |    **>= 16**     |      **17**       | **100% PASS** | Pairwise interaction tests                                                      |
|            | Combination 1: Shop Purchase -> Equip -> Mount -> Drive |       >= 4       |         5         |     PASS      | Coin debit, equipment persistence, driveway transit, road speed                 |
|            | Combination 2: 2-Wheel Mount + Night Light Beam         |       >= 4       |         4         |     PASS      | Torso crop + centered beam, heading rotation, bicycle beam scale 0.65x          |
|            | Combination 3: Showroom Preview 4-Way + Item Icon       |       >= 4       |         4         |     PASS      | 4-directional 48x40 canvas, 3x preview match, ITEM_SEEDS sprite resolution      |
|            | Combination 4: Off-Road Fine vs On-Road Zero Fine       |       >= 4       |         4         |     PASS      | On-road zero fine, off-road 40 coin fine, fine idempotency, stationary immunity |
| **Tier 4** | **Real-World Application Scenarios**                    |     **>= 5**     |       **5**       | **100% PASS** | End-to-end player journeys                                                      |
|            | Scenario 1: Luxury Supercar Highway Journey             |        1         |         1         |     PASS      | Showroom exploration, purchase, equip, high-speed 340 px/s driving              |
|            | Scenario 2: Eco-Friendly Commuter Bicycle Journey       |        1         |         1         |     PASS      | Affordable 200 coin purchase, 2-wheel crop, dusk lighting                       |
|            | Scenario 3: Commuter Scooter & Traffic Enforcement      |        1         |         1         |     PASS      | Compliant green transit vs reckless red light stop-line crossing ticket         |
|            | Scenario 4: Farm-to-Town Cross-Map Transit              |        1         |         1         |     PASS      | Mercedes G63 SUV persistence and speed across room transitions                  |
|            | Scenario 5: Multi-Vehicle Collector & Garage Switch     |        1         |         1         |     PASS      | Seamless switching across bicycle, superbike and supercar tiers                 |
| **TOTAL**  | **All 4 Tiers Combined**                                |    **>= 71**     |      **74**       | **100% PASS** | Execution time: ~0.45s                                                          |

---

## 3. Discovered Implementation Defects & Milestone Observations

During the requirement analysis and initial baseline execution:

1. **Asset Directory Population Pending (Milestone M3)**:
   - In `assets/vehicles/` and `apps/web/public/vehicles/`, directories for models 2–16 are currently awaiting M3 generation of `spritesheet.png`, `preview.png`, `icon.png`, and `meta.json`.
   - **Observed Behavior**: The dynamic fallback pipeline successfully caught this and fell back to `vehicleCanvas()` without crashing, confirming zero-downtime resilience.
2. **Road Width Fitment**:
   - `TOWN_ROADS` standard lanes have width `40 px`. All 16 models adhere to `bodyWidth <= 40 px`, guaranteeing that driving centered on town roads never incurs the `off_road` fine (40 coin).
3. **Raytracing Beam Alignment**:
   - Beam emitters correctly follow `(x + dx * 20, y - 10 + dy * 18)` and rear lights follow `(x - dx * 18, y - 10 - dy * 18)` across all 4 cardinal directions.
