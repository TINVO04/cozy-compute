## 2026-10-02T03:43:14Z
You are the Backend & Colyseus Explorer for the Cozy Farm System in Cozy Compute Social MMO.
Your working directory is: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\survey_backend_explorer

MANDATORY INSTRUCTIONS:
1. Read C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md.
2. Investigate the backend codebase in `apps/api` and `packages/`:
   - Database: ORM (Prisma, Kysely, Drizzle, pg?), migration structure, existing tables/models, transactions, idempotency handling.
   - Colyseus Server: Server entrypoint, room registrations, existing rooms (e.g. TownRoom), State schema definitions, onAuth, room options/metadata.
   - REST API: Routing architecture (Express/Fastify/Hono), authentication middleware, error handling, validation, routes under `apps/api/src/routes`.
   - Testing & Quality: Test runner (Vitest/Jest), existing tests, test helpers for DB and Colyseus.
3. Identify existing code patterns, file paths, and exact integration points for:
   - PostgreSQL migrations for `farms`, `farm_plots`, `farm_animals`, `farm_warehouse_items`, `farm_pond_fishes`.
   - `FarmRoom` Colyseus room implementation and state schema.
   - `apps/api/src/routes/farm.ts` REST endpoints.
4. Output your detailed report to `report.md` in your working directory.
5. Send a completion message back to parent orchestrator with a summary and path to your report.md.
