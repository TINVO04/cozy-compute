## 2026-10-02T04:15:18Z
You are M2 Service Explorer for Cozy Farm System in Cozy Compute Social MMO.
Your working directory is: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m2_explorer_service

MANDATORY INSTRUCTIONS:
1. Read C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md and C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\PROJECT.md.
2. Review `packages/game-data/src/farm.ts`, `apps/api/src/db.ts`, and `apps/api/src/ledger.ts`.
3. Design `apps/api/src/services/farm.ts`:
   - Farm auto-provisioning (create farm row + 36 plots on initial access).
   - Plot unlock with `postLedger` deduction, `FOR UPDATE` lock, and idempotency replay.
   - Planting seeds, hydration/watering logic (30m decay), growth stages based on server timestamps.
   - Harvest logic (owner check, yield range, warehouse capacity check, add to `farm_warehouse_items`).
   - Shop buy & sell, contracts bonus (+25% coin, fame).
   - Animal feeding, happiness, yield intervals.
   - Pond fish stocking and weight gain.
   - Warehouse capacity upgrades (+50 slots per tier).
4. Output your detailed blueprint to `report.md` in your working directory.
5. Report completion back to parent orchestrator.
