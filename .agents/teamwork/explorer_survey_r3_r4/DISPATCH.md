# Dispatch Task: Explorer Survey R3 & R4 (Showroom, Shop UI & Fallback Runtime)

## Assignment
You are Explorer 3 for the Master Vehicle Art Direction project.
Investigate Requirements R3 & R4:
- Showroom Gara Bạc Hà:
  - 4 specialized pedestals:
    1. Pedestal 1 (Northwest - Supercars): Ferrari F40, Lamborghini Aventador, Porsche 911 GT3 RS, Toyota Supra MK4
    2. Pedestal 2 (Northeast - Luxury & Muscle): Rolls-Royce Phantom, Mercedes G63 AMG, Ford Mustang Shelby, Tesla Model S Plaid
    3. Pedestal 3 (Southwest - Sport Superbikes): Ducati Panigale, Kawasaki Ninja H2, Yamaha YZF-R1, BMW R1250 GS
    4. Pedestal 4 (Southeast - Cruiser, Heritage & Bicycle): Vespa Primavera, Honda Super Cub, Harley Fat Boy, Trek Marlin 7
  - Interactive Pedestal Cycling: approaching pedestal, pressing 'E' or [◀] [▶] to cycle vehicles in category, updating vehicle name, price, speed in real time. Check `apps/web/src/game/showroom-art.ts`, `apps/web/src/game/showroom.test.ts`, and how player interaction works.
  - `VehicleShopPanel.tsx`: category tabs (Tất cả (16), Siêu xe (4), Xe sang & Cơ bắp (4), Mô tô PKL (4), Xe phố & Xe đạp (4)), 360-degree preview rotation, purchasing all 16 vehicles.
  - Storefront window display in `paintVehicleDealer` (diversify displayed cars).
  - Canvas fallback runtime `vehicleCanvas` in `apps/web/src/art/vehicle.ts`: synchronize proportions, silhouette, materials, and ensure no transform matrix leakage.
  - Check asset synchronization between `assets/vehicles/` and `apps/web/public/vehicles/`.
- Document current showroom implementation, Shop UI, fallback runtime, gaps vs requirements, and concrete upgrade strategy.
- Output your report to `.agents/teamwork/explorer_survey_r3_r4/analysis.md` and deliver `handoff.md`.

## 2026-10-08T15:01:07Z
You are Explorer R3 R4 Showroom & Fallback.
Your working directory is: c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\explorer_survey_r3_r4
Read the task assignment in your working directory DISPATCH.md and the authoritative request in:
c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-08T14:57:19Z).

Investigate Requirements R3 & R4:
1. Showroom Gara Bạc Hà:
   - 4 specialized pedestals:
     * Pedestal 1 (NW - Supercars): Ferrari F40, Lamborghini Aventador, Porsche 911 GT3 RS, Toyota Supra MK4
     * Pedestal 2 (NE - Luxury & Muscle): Rolls-Royce Phantom, Mercedes G63 AMG, Ford Mustang Shelby, Tesla Model S Plaid
     * Pedestal 3 (SW - Sport Superbikes): Ducati Panigale, Kawasaki Ninja H2, Yamaha YZF-R1, BMW R1250 GS
     * Pedestal 4 (SE - Cruiser, Heritage & Bicycle): Vespa Primavera, Honda Super Cub, Harley Fat Boy, Trek Marlin 7
   - Interactive Pedestal Cycling: approaching pedestal, pressing 'E' or [◀] [▶] to cycle vehicles in category, updating vehicle name, price, speed in real time.
   - Check `apps/web/src/game/showroom-art.ts`, `apps/web/src/game/showroom.test.ts`, and scene interaction handlers.
2. `VehicleShopPanel.tsx`:
   - Category tabs: Tất cả (16), Siêu xe (4), Xe sang & Cơ bắp (4), Mô tô PKL (4), Xe phố & Xe đạp (4).
   - 360-degree preview rotation and catalog of all 16 vehicles.
3. Storefront window display in `paintVehicleDealer` (diversify displayed cars).
4. Synchronize canvas fallback runtime `vehicleCanvas` in `apps/web/src/art/vehicle.ts` with 16 models and check asset synchronization between `assets/vehicles/` and `apps/web/public/vehicles/`.
5. Write your detailed findings, file references, and concrete implementation plan to `.agents/teamwork/explorer_survey_r3_r4/analysis.md` and deliver `handoff.md`.
Use send_message to report completion when done.
