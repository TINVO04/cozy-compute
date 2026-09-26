# Build Status

Updated: 2026-09-27

## Verified in this checkout

- TypeScript strict workspace typecheck passes cleanly across all 6 workspace projects.
- ESLint passes with 0 errors and 0 warnings.
- Prettier formatting check passes 100% across the full workspace.
- Production builds pass for `@cozy/realtime`, `@cozy/api`, and `@cozy/web` bundles.
- Unit and integration tests pass (60 total tests):
  - `@cozy/game-data` (11 tests): movement physics, input clamping, map boundaries, blockers/sliding collision, zones, item catalog integrity, fish definitions, activity configs.
  - `@cozy/realtime` (2 tests): chat sanitization and rate limits.
  - `@cozy/economy` (20 tests): balance math, ledger consistency, transaction idempotency, item purchasing, outfit equipping, room layout persistence, leveling, duck hunt scoring.
  - `@cozy/api` (27 tests): model registry, AI policy & quotas, gateway sync, key allocation/revocation, usage tracking, cooldowns, tamper resistance (speed/teleportation hack rejection), concurrent redemption idempotency, and external OpenAI SDK compatibility.
- Playwright smoke flow passes at 1280x720: registration, town entry, movement, chat, shop, AI rewards, events, wardrobe, and apartment editing.
- Docker dependencies are running and healthy: PostgreSQL, Redis, LiteLLM, and mock upstream.
- Operations & Production artifacts:
  - Production Dockerfiles created for API (`apps/api/Dockerfile`), Realtime (`apps/realtime/Dockerfile`), and Web (`apps/web/Dockerfile`).
  - Production orchestration defined in `compose.production.yaml` with Caddy TLS reverse proxy, Postgres, Redis, and LiteLLM.
  - Automated database backup scripts (`infra/backup/postgres-backup.ps1` and `.sh`).
  - CI workflow (`.github/workflows/ci.yml`) and Release workflow (`.github/workflows/release.yml`) for building Windows x64 NSIS installers and MSI packages via Tauri with automated SHA256 checksum generation.
  - Admin UI is fully accessible at `/admin` and directly reachable via the new TopBar "Admin" button when signed in with an admin account (`admin@cozy.local`).

## Commands used

```powershell
docker compose up -d postgres redis litellm mock-upstream
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
$env:E2E_BASE_URL = 'http://localhost:5173'
pnpm --filter @cozy/web e2e
```

## Local URLs

- Web client: http://localhost:5173
- Admin Console: http://localhost:5173/admin (login with `admin@cozy.local`)
- API: http://localhost:8787
- Realtime WebSocket: ws://localhost:2567
- LiteLLM gateway: http://localhost:4000/v1
- Mock upstream: http://localhost:4010

## Development operations

```powershell
docker compose up -d postgres redis litellm mock-upstream
pnpm migrate
pnpm dev
docker compose down
```

The browser and desktop client must only use the virtual player credentials returned by the game API. Master AI provider credentials remain exclusively server-side in the LiteLLM configuration.

## Release & GitHub Publishing

To initialize and release to GitHub:

```powershell
# 1. Initialize git and commit
git init
git add .
git commit -m "feat: complete MVP Cozy Compute social MMO with AI quota rewards"

# 2. Create GitHub repo (via GitHub CLI) and push
gh repo create cozy-compute --public --source=. --remote=origin --push

# 3. Create release tag to trigger GitHub Release & Windows build workflow
git tag -a v0.1.0-alpha.1 -m "Release v0.1.0-alpha.1"
git push origin v0.1.0-alpha.1
```
