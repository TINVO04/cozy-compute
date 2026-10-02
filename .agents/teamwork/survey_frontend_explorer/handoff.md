# Handoff Report: Frontend & Phaser Architecture for Cozy Farm System

## 1. Observation

1. **Phaser Game Initialization & Scene Switching**:
   - Location: `apps/web/src/game/GameCanvas.tsx:22-42, 74-100`.
   - Observed code:
     ```ts
     game = new Phaser.Game({
       type: Phaser.AUTO,
       parent: ref.current,
       backgroundColor: '#2a2438',
       pixelArt: true,
       roundPixels: true,
       scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
       input: { keyboard: true, mouse: { preventDefaultWheel: false } },
       audio: { noAudio: true },
       banner: false,
       scene: [TownScene, ApartmentScene, CompanyScene, UniversityScene, ComGaScene, BidaScene, CyberNetScene],
     });
     ```
   - Scene switching is reactive to `roomKind = useUi((s) => s.room.kind)`. Whenever `roomKind` changes, `switchScene()` stops other active scenes and calls `game.scene.start(target)`.

2. **Pure Canvas 2D Graphics & Rasterization**:
   - Location: `apps/web/src/art/pixel.ts:1-121` (`PixelGrid` class) and `apps/web/src/art/town-detail.ts:21-70` (`canvas`, `box`, `oval`, `shape`).
   - Observed mechanism:
     - `c.getContext('2d')!.imageSmoothingEnabled = false;` disables bilinear filtering.
     - `shape(ctx, color, points)` implements scanline rasterization by calculating intersection spans per horizontal scanline, rendering crisp integer pixel rectangles without blurry anti-aliasing edges.
     - No image files (`.png`, `.jpg`, `.svg`) are loaded via Phaser loader. All textures are dynamically generated on HTML5 canvas elements and registered via `scene.textures.addCanvas(key, canvas)`.

3. **Accessibility & Controls**:
   - Location: `apps/web/src/game/scenes.ts:81-88, 160-166` (`WorldScene`) and `apps/web/src/screens/Game.tsx:73-95, 427-450`.
   - Movement: Handled in `WorldScene.update()`, blocked when `typing()` is true (`INPUT`, `TEXTAREA`, or `contentEditable`) or when modal backdrop/panel is active.
   - Keys:
     - `WASD` / Arrows: 2D avatar movement.
     - `E`: Interaction proximity key (in `InteriorScene` checked within `2 * TILE`, in `TownScene` checked via `ZONE_ACTIONS[zone]`).
     - `Q`: Emote wheel popup.
     - `Enter`: Focus chat input (`#chat-input`).
     - `Esc`: Close active modal (portal with focus trap in `primitives.tsx:77-104`), close panel, or dismiss NPC speech bubble.
     - `+` / `-` / `0` / Mouse wheel: Zoom in/out/reset map view.
   - Camera: `PlayerLayer` attaches `this.scene.cameras.main.startFollow(av.container, true, 0.12, 0.12)`. Clamped within world dimensions in `fitCamera()` (`cam.setBounds(...)`).

4. **UI Modals & HUD Architecture**:
   - Location: `apps/web/src/ui/primitives.tsx:53-131` (`Modal`) and `196-213` (`Panel`), `apps/web/src/screens/Game.tsx:96-137`.
   - Modals are rendered as React components via `createPortal` into `document.body` with focus trapping, `role="dialog"`, `aria-modal="true"`, and Escape key dismiss.
   - Panels are slide-over / fullscreen overlay cards managed via Zustand store (`useUi((s) => s.panel)`).
   - Server transactions use TanStack Query mutations with `newIdempotencyKey()` (`api.ts:73`).

5. **Town Map Western Border & Gateway**:
   - Location: `packages/game-data/src/map.ts:280-303, 309-329`.
   - Current Town map is 48 cols x 32 rows (`MAP_WIDTH = 1536`, `MAP_HEIGHT = 1024`).
   - `PATHS` contains `t(1, 10, 46, 2)` (row 10, y = 320..384), heading directly west.
   - `BLOCKERS` has `t(0, 0, 1, MAP_ROWS)`, sealing the entire west edge (col 0).
   - In `apps/web/src/art/town-detail.ts:1083-1087`, border trees `border:west` are populated along col 0.
   - Vitest suite `packages/game-data/src/town-layout.test.ts:48-57` validates that every zone in `ZONES` has a continuous paved path from `SPAWN`.

6. **Colyseus Client Connection**:
   - Location: `apps/web/src/game/net.ts:19-96, 159-193`.
   - `Net` maintains a single active room connection with backoff retry and reconnection token support.
   - Room transitions occur via `goTown()`, `goApartment()`, etc.
   - Local client movement is predicted using `MovementPrediction` (`apps/web/src/game/players.ts:854`), reconciled against server tick at 20Hz.

7. **Test Suites & Build Status**:
   - Running `pnpm --filter @cozy/web typecheck` passed with exit code 0.
   - Running `pnpm --filter @cozy/web test` passed with 4/4 test files (16 tests passed).
   - Running `pnpm --filter @cozy/game-data test` passed with 7/7 test files (40 tests passed).

---

## 2. Logic Chain

1. **Scene Integration (from Obs 1 & 6)**:
   - Because `GameCanvas.tsx` switches Phaser scenes whenever `roomKind` changes in Zustand, registering `FarmScene` in `GameCanvas.tsx` and adding `'farm'` to `UiState['room']['kind']` and `net.goFarm(ownerId, passwordToken)` will cleanly initiate the Phaser scene transition without restarting the Phaser engine.
2. **Pure Canvas Asset Generation (from Obs 2)**:
   - Because the project forbids external image files and relies on `PixelGrid` and scanline rasterization (`shape` and `box`), all farm assets (alluvial soil plots, crops at 3 stages, 4 livestock pens with 2-frame animation, Bac Sau stall, Silo warehouse, aquaculture pond with spinning water wheel) must be implemented in pure TypeScript canvas generator modules (`farm-landscape.ts` and `farm-props.ts`).
3. **Western Boundary Gateway Integration (from Obs 5)**:
   - Because `t(0, 0, 1, MAP_ROWS)` currently seals the west edge at col 0, splitting this blocker into `t(0, 0, 1, 10)` and `t(0, 12, 1, MAP_ROWS - 12)` opens a 2-tile passage at rows 10-11 (`y = 320..384`).
   - Extending `PATHS` with `t(0, 10, 2, 2)` satisfies the reachable paved path assertion in `town-layout.test.ts`.
   - Adding `farm_gate` zone to `ZONES` provides seamless interaction trigger via key `E` or step-in coordinates.
4. **Cozy Farm Modals & UI Architecture (from Obs 3 & 4)**:
   - Because modals in the application use React 19 portals (`Modal` and `Panel`), `FarmPasswordModal`, `FarmPlotModal`, `FarmSiloPanel`, and `FarmShopPanel` should be implemented as React components sitting above `GameCanvas`.
   - Adhering to Zero-Dead-Ends and Server-Authoritative directives requires all buttons to invoke server REST endpoints with `newIdempotencyKey()`.
5. **Security & Co-op Authorization (from Obs 6)**:
   - In Colyseus `FarmRoom`, the owner enters without a password, while visitors require password token authentication. In-room actions distinguish owner (full rights) from guests (watering permitted with friendly heart reward; harvesting strictly rejected).

---

## 3. Caveats

- **Network Mode**: The investigation was conducted locally without modifying production source code (read-only mode).
- **Backend Colyseus / PostgreSQL Scope**: While Colyseus room protocol was examined from `apps/realtime/src/rooms/`, detailed database migrations and REST route implementations in `apps/api` were assessed from design specs (`docs/farm_system_plan.pdf` and `ORIGINAL_REQUEST.md`).

---

## 4. Conclusion

The frontend codebase is well-architected for the Cozy Farm System:
- Phaser 3 game setup and reactive scene transition mechanism are modular and cleanly separated from React UI.
- The Pure Canvas 2D rasterization pattern (`PixelGrid`, scanline fill, pixel snapping, Web Audio synth) is well-established and can be extended with `farm-landscape.ts` and `farm-props.ts`.
- The Western Gate transition requires a minimal 3-step adjustment in `packages/game-data/src/map.ts` (split west blocker, extend path, register `farm_gate` zone) that complies with `town-layout.test.ts`.
- All required UI panels (`FarmPasswordModal`, `FarmPlotModal`, `FarmSiloPanel`, `FarmShopPanel`) map directly onto existing `Modal` and `Panel` primitives in `apps/web/src/ui/primitives.tsx`.

---

## 5. Verification Method

To independently verify all findings and test suite integrity:

1. **Verify TypeScript type checking**:
   ```powershell
   pnpm --filter @cozy/web typecheck
   pnpm --filter @cozy/game-data typecheck
   ```
2. **Verify unit test suites**:
   ```powershell
   pnpm --filter @cozy/web test
   pnpm --filter @cozy/game-data test
   ```
3. **Inspect Key Source Files**:
   - `apps/web/src/game/GameCanvas.tsx` (Phaser configuration & scene management)
   - `apps/web/src/game/scenes.ts` (`WorldScene`, `TownScene`, `InteriorScene`)
   - `apps/web/src/art/pixel.ts` & `town-detail.ts` (Pure Canvas 2D scanline rasterization)
   - `packages/game-data/src/map.ts` (Town map dimensions, blockers, and paths)
   - `apps/web/src/game/net.ts` (Colyseus connection and room transitions)
   - `apps/web/src/ui/primitives.tsx` (`Modal` and `Panel` overlay components)
