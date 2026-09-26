# AI Social MMO — Master Build Plan

**Working title:** Project Cozy Compute

**Purpose:** Blueprint for a 2D realtime social MMO where players can earn in-game currency and redeem a controlled portion of that economy into real-world AI API quota. The API is OpenAI-compatible, but upstream models/endpoints are supplied and configured by the game admin rather than being tied to an official model provider.

## Core product promise

> **Play a funny 2D online world. Build your life. Earn currency. Unlock real AI compute you can use outside the game.**

## Locked product decisions

1. **Web-first client** using Phaser 3 for the realtime 2D game layer and React + Vite for application UI.
2. **Windows desktop app** is a Tauri 2 wrapper around the same web client. No separate game client implementation.
3. **Realtime multiplayer** uses an authoritative Node.js/TypeScript server with Colyseus.
4. **Primary data store:** PostgreSQL. **Hot/cache/rate-limit:** Redis.
5. **AI gateway:** self-hosted LiteLLM behind the game backend. Upstream entries are admin-defined compatible endpoints; do not hard-code official providers.
6. **Player API credentials** are virtual keys issued by the game/gateway. Never expose provider/master credentials.
7. **Admin controls:** model registry, upstream endpoint, model alias, reward rate, per-player quota, global pool, pricing/cost mapping, key TTL, rate limits, disable/revoke.
8. **Deployment:** Docker Compose on the developer's own server/machine; HTTPS reverse proxy included.
9. **Distribution:** web client served from the server/CDN path; Windows installer built by GitHub Actions and published to GitHub Releases.
10. **Art/UI:** original implementation inspired by interaction patterns from Habbo, Pixadom, Everskies and Highrise; do not copy proprietary assets, exact layouts, logos, typography or skins.

## Suggested repository

```text
/apps
  /web                 # React + Vite + Phaser client
  /desktop             # Tauri 2 shell
  /api                 # REST/HTTP backend
  /realtime            # Colyseus authoritative game server
  /admin               # Admin UI, may share app shell with web
/packages
  /game-data
  /shared-types
  /ui
  /economy
  /api-client
/infra
  /docker
  /caddy
  /litellm
  /monitoring
/docs
  ...
```

## Read order for Claude

1. `agent/CLAUDE_OPUS_EXECUTION_PROMPT.md`
2. `docs/01_PRODUCT_VISION.md`
3. `docs/02_CORE_GAMEPLAY.md`
4. `docs/03_ECONOMY_AND_AI_REWARDS.md`
5. `architecture/04_SYSTEM_ARCHITECTURE.md`
6. `architecture/05_AI_GATEWAY_SPEC.md`
7. `design/06_UI_UX_DESIGN_SYSTEM.md`
8. `architecture/07_DATA_MODEL.md`
9. `ops/08_SECURITY_ANTI_BOT.md`
10. `ops/09_DEPLOYMENT_AND_DOCKER.md`
11. `ops/10_GITHUB_RELEASES.md`
12. `docs/11_MVP_ROADMAP.md`
13. `docs/12_ACCEPTANCE_TESTS.md`
14. `docs/13_RESEARCH_SOURCES.md`

## Non-negotiables

- Server authoritative for economy, inventory, rewards, API quota, redemption and anti-abuse decisions.
- No client-only currency or quota awarding.
- No provider/master API keys in browser/Tauri/desktop client bundles.
- AI API keys shown to players are virtual keys limited by gateway policy.
- Every externally redeemable reward must have an auditable ledger entry.
- UI must look like a finished premium product: coherent spacing, typography, state handling, error handling, loading states, accessibility and responsive behavior are part of implementation scope.
- External visual references are inspiration only; build an original visual system.
