# Cozy Compute Vehicle System — E2E Test Infrastructure & Specifications

## 1. Test Philosophy & Opaque-Box Methodology

The Cozy Compute vehicle system test suite is built on **opaque-box, requirement-driven verification**. Tests treat internal implementation as a black box and derive expectations strictly from the authoritative specifications recorded in:

- `ORIGINAL_REQUEST.md` (Specifically under milestone header `## 2026-10-08T12:29:53Z`)
- `PROJECT.md` (Architecture, Interface Contracts, Milestones, and Feature Inventory)
- `AGENTS.md` (Server-authoritative game state, zero-dead-ends, accessibility, and quality gates)

### Core Principles

1. **Authoritative Source of Truth**: Expected outputs are derived directly from documented specifications (speeds, prices, dimensions, anchor points, raytracing offsets, road constraints).
2. **Implementation Decoupling**: Tests assert observable behaviors, public data contracts, canvas dimensions, geometry offsets, and state transitions rather than private variables.
3. **Progressive Testability & Defect Escalation**: As a test writer in a multi-agent environment, tests are written to validate the complete target specification. Missing assets or unimplemented models are surfaced as concrete test failures or pending features to be addressed by Milestone agents (M1–M5), while preserving 100% pass on completed and fallback pathways.
4. **Zero-Flake & Determinism**: All tests are hermetic and run headlessly in Node.js/TypeScript using pure mathematical proofs, virtual mock canvases, and standardized simulation ticks.

---

## 2. 4-Tier Test Architecture & Coverage Matrix

| Tier       | Name                           | Focus                                        | Required Cases                | Features Covered                                                                                                                        |
| :--------- | :----------------------------- | :------------------------------------------- | :---------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **Tier 1** | **Feature Coverage**           | Happy-path verification of isolated features | >= 5 per feature (Total: 25+) | 16 vehicle catalog, dynamic loader fallback, mounting geometry, night lights raytracing, showroom pedestal & shop panel                 |
| **Tier 2** | **Boundary & Corner Cases**    | Edge values, extremes, empty states, stress  | >= 5 per feature (Total: 25+) | Max speed limits & tunneling, 40px road width geometry, empty/corrupt asset folders, unknown/proto IDs, rapid mount/dismount toggling   |
| **Tier 3** | **Cross-Feature Combinations** | Pairwise interaction between subsystems      | >= 4 pairs (Total: 16+)       | Shop purchase -> equip -> mount -> drive; 2-wheel mount + night lights; showroom preview + inventory icon; off-road fine vs on-road     |
| **Tier 4** | **Real-World Scenarios**       | Full end-to-end multi-step player journeys   | >= 5 scenarios (Total: 5+)    | Luxury supercar showroom-to-highway, eco commuter bicycle, scooter traffic enforcement, cross-map farm transit, multi-vehicle collector |

---

## 3. Feature Inventory & Interface Contracts

### 3.1. 16-Model Vehicle Catalog

The complete catalog comprises 16 real-world inspired models across 3 vehicle classes:

1. **Bicycles (1 model)**:
   - `bicycles/trek-marlin-7` (ID: `bicycle_sky`): Trek Marlin 7 Gen 3, Trek, 200 Coin, 195 px/s, `#0284c7`.
2. **Motorcycles (7 models)**:
   - `motorcycles/vespa-primavera-150` (ID: `motorcycle_coral`): Vespa Primavera 150, Vespa, 700 Coin, 270 px/s, `#f43f5e`.
   - `motorcycles/ducati-panigale-v4` (ID: `motorcycle_ducati`): Ducati Panigale V4 S, Ducati, 2400 Coin, 310 px/s, `#dc2626`.
   - `motorcycles/honda-super-cub`: Honda Super Cub, Honda, 500 Coin, 210 px/s.
   - `motorcycles/harley-davidson-fat-boy`: Harley-Davidson Fat Boy, Harley-Davidson, 1800 Coin, 250 px/s.
   - `motorcycles/kawasaki-ninja-h2`: Kawasaki Ninja H2, Kawasaki, 2800 Coin, 330 px/s.
   - `motorcycles/yamaha-yzf-r1`: Yamaha YZF-R1, Yamaha, 2500 Coin, 315 px/s.
   - `motorcycles/bmw-r1250-gs`: BMW R1250 GS, BMW, 2200 Coin, 280 px/s.
3. **Cars (8 models)**:
   - `cars/mercedes-benz-g63` (ID: `car_mint`): Mercedes-Benz G63 AMG, Mercedes-Benz, 1800 Coin, 240 px/s, `#1b4332`.
   - `cars/lamborghini-aventador` (ID: `car_lamborghini`, alias `car_sunset`): Lamborghini Aventador SVJ, Lamborghini, 4500 Coin, 340 px/s (legacy sunset: 300 px/s), `#eab308`.
   - `cars/porsche-911` (ID: `car_porsche`): Porsche 911 GT3 RS, Porsche, 3600 Coin, 320 px/s, `#0284c7`.
   - `cars/toyota-supra-mk4`: Toyota Supra MK4, Toyota, 2600 Coin, 290 px/s.
   - `cars/ferrari-f40`: Ferrari F40, Ferrari, 5000 Coin, 335 px/s.
   - `cars/ford-mustang`: Ford Mustang GT, Ford, 1900 Coin, 275 px/s.
   - `cars/rolls-royce-phantom`: Rolls-Royce Phantom, Rolls-Royce, 6000 Coin, 250 px/s.
   - `cars/tesla-model-s`: Tesla Model S Plaid, Tesla, 3500 Coin, 325 px/s.

### 3.2. Asset Pack & Spritesheet Specification

- **Directory Layout**: Each model directory contains:
  - `spritesheet.png`: Exactly `192 × 160 px` (4 columns × 4 rows of `48 × 40 px` frames).
  - `preview.png`: `144 × 120 px` (3x integer scale of neutral profile).
  - `icon.png`: `48 × 40 px` (clean isolated icon for inventory).
  - `meta.json`: Standardized JSON metadata detailing anchor points, lights, and color palettes.
- **Direction & Frame Matrix**:
  - Rows (Direction): Row 0 = Down (`dir = 0`), Row 1 = Left (`dir = 1`), Row 2 = Right (`dir = 2`), Row 3 = Up (`dir = 3`).
  - Columns (Frame): Col 0 = Idle (`frame = 0`), Col 1 = Drive 1 (`frame = 1`), Col 2 = Drive 2 (`frame = 2`), Col 3 = Drive 3 (`frame = 3`).
- **Ground Baseline**: Wheel contact point at `y = 37 px` within the `48 × 40 px` frame.
- **Body Width**: Transverse body width `≤ 40 px` across all models to ensure clearance within `40 px` `TOWN_ROADS` without triggering `off_road` traffic violations.

### 3.3. Avatar Mounting & Geometry Contract

- **2-Wheelers (Bicycles & Motorcycles)**:
  - Seat center: `x = 24`, `y = 16..20 px`.
  - Torso crop: Avatar sprite cropped to `(0, 0, 32, 40)` to cleanly conceal legs behind vehicle body/chassis.
  - Vertical offset: Avatar position clamped to `baseSpriteY - 4 px`.
  - Visibility: Avatar remains visible (`setVisible(true)`).
- **4-Wheelers (Cars)**:
  - Avatar visibility: Completely concealed (`setVisible(false)` while driving).
  - Contact ground shadow: Rendered at base coordinate `(0, 0)`.

### 3.4. Night Lights Raytracing Contract

- **Headlights (Front)**:
  - `frontX = x + dx * 20`
  - `frontY = y - 10 + dy * 18`
  - Dual beam offset for cars: `dy * (±8 px)` lateral displacement.
  - Single center beam for 2-wheelers: `offset = 0`.
- **Taillights (Rear)**:
  - `rearX = x - dx * 18`
  - `rearY = y - 10 - dy * 18`
  - Deep crimson glow (`#ff5544` / `0xff5544`).
- **Activation**: Automatically lights up when solar lighting drops below threshold (`lampBrightness > 0.05`).

### 3.5. Showroom & Shop UI Contract

- **Showroom Pedestals**: `136 × 66 px`, 2x scale, nearest-neighbor integer scaling (`pixelArt: true`).
- **VehicleShopPanel**: `144 × 120 px` preview frame (3x integer scale), interactive 4-directional rotation cycling `[0, 1, 2, 3]`.
- **Inventory Integration**: Every vehicle maps into `ITEM_SEEDS` with `type: 'vehicle'`, `slot: 'vehicle'`, and uniform price/sprite resolution.

---

## 4. Test Suite Structure & Invocations

The executable test suite is located in `tests/e2e/vehicles/`:

```
tests/e2e/vehicles/
├── types.ts                   # Type definitions & data interfaces
├── test-environment.ts        # Virtual Canvas, DOM, & Phaser headless harness
├── spec-oracle.ts             # Authoritative 16-vehicle requirement oracle
├── tier1-features.test.ts     # Tier 1 Feature Coverage test suite (25+ tests)
├── tier2-boundaries.test.ts   # Tier 2 Boundary & Corner Cases suite (25+ tests)
├── tier3-combinations.test.ts # Tier 3 Pairwise Combinations suite (16+ tests)
├── tier4-scenarios.test.ts    # Tier 4 Real-World Application Scenarios (5+ journeys)
├── runner.ts                  # Comprehensive standalone runner & reporter
└── index.ts                   # Central entrypoint
```

### Running the Test Suite

```bash
# 1. Run all vehicle E2E tests using tsx and node test runner:
pnpm exec tsx --test --test-reporter=spec tests/e2e/vehicles/*.test.ts

# 2. Run via dedicated standalone runner with aggregated summary table:
pnpm exec tsx tests/e2e/vehicles/runner.ts

# 3. Run individual tier test suites:
pnpm exec tsx --test --test-reporter=spec tests/e2e/vehicles/tier1-features.test.ts
pnpm exec tsx --test --test-reporter=spec tests/e2e/vehicles/tier2-boundaries.test.ts
pnpm exec tsx --test --test-reporter=spec tests/e2e/vehicles/tier3-combinations.test.ts
pnpm exec tsx --test --test-reporter=spec tests/e2e/vehicles/tier4-scenarios.test.ts
```

---

## 5. Coverage & Quality Thresholds

- **Minimum Test Cases per Feature**: `>= 5`
- **Minimum Test Cases per Boundary**: `>= 5`
- **Total Test Cases**: `>= 70`
- **Execution Time**: `< 2.0s` across all suites
- **Zero Flakiness**: Deterministic assertions without network or timing races.
