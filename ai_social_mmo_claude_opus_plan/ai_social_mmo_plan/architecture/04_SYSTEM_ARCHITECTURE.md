# System Architecture

## Chosen architecture

```text
                       INTERNET
                           |
                    [ Caddy / TLS ]
                           |
             +-------------+-------------+
             |                           |
          Web UI                    OpenAI-compatible API
             |                           |
     React + Phaser                    /v1
             |                           |
        WebSocket                     AI Gateway
             |                      (LiteLLM)
      Colyseus Client                     |
             |                  +----------+----------+
      Realtime Server            |          |          |
             |                 Model A    Model B    Model C
             |
           Game API
             |
     +-------+--------+
     |                |
 PostgreSQL          Redis
     |
 Audit / Economy / Accounts / Inventory
```

## Frontend

- React + TypeScript + Vite for menus, social UI, HUD, shop, inventory, admin-style screens.
- Phaser 3 for world rendering, movement, room logic and 2D effects.
- Shared design system package for non-game UI.
- Zustand or equivalent lightweight client state for UI state only.
- TanStack Query or equivalent for REST cache/state where useful.

Phaser is intentionally chosen because it is built for browser-based HTML5 games and supports TypeScript/WebGL/Canvas. It can also be wrapped/packaged through desktop tooling. [Phaser docs](https://docs.phaser.io/)

## Realtime

Colyseus authoritative server.

Why:
- authoritative rooms;
- state synchronization;
- matchmaking;
- typed server/client state;
- good fit for Node/TypeScript and Phaser.

[Colyseus docs](https://docs.colyseus.io/)

## API service

Fastify or NestJS acceptable, with a bias toward Fastify for smaller MVP surface.

Responsibilities:
- auth;
- user profile;
- inventory;
- economy;
- shop;
- apartment persistence;
- AI reward ledger;
- virtual key provisioning;
- admin config;
- abuse flags.

## Database

PostgreSQL.

ORM: Prisma or Drizzle. Choose one and standardize; Prisma is preferred for rapid schema iteration if no strong team preference exists.

## Redis

Use for:
- session/cache;
- distributed rate limits;
- ephemeral presence metadata;
- matchmaking support where appropriate;
- idempotency locks where database transactions are not sufficient.

## AI gateway

Use self-hosted LiteLLM as the first gateway implementation.

LiteLLM provides an OpenAI-compatible proxy, virtual keys, budgets, rate limits and model access controls. It can be run in Docker and requires PostgreSQL for budget/spend enforcement. [LiteLLM](https://docs.litellm.ai/docs/proxy/docker_quick_start)

The game backend owns the game-specific redemption rules. LiteLLM owns API request authorization and upstream routing.

## Desktop

Use Tauri 2 to wrap the same built web client.

Why:
- same frontend codebase;
- lightweight desktop shell;
- native Windows installer support;
- GitHub Actions release workflow is documented by the project.

[Tauri Windows installer](https://tauri.app/distribute/windows-installer/)
[Tauri GitHub pipeline](https://v2.tauri.app/distribute/pipelines/github/)

## Deployment

One-server-first Docker Compose deployment.

Production services:
- caddy;
- web;
- api;
- realtime;
- litellm;
- postgres;
- redis;
- optional admin UI bundled with web or separate service.

Docker recommends production-specific Compose overrides, restart policies and rebuilding/recreating services for deployments. [Docker Compose production](https://docs.docker.com/compose/how-tos/production/)

## Scale path

Do not build for Kubernetes in MVP.

Scale later:
- stateless API horizontally;
- multiple Colyseus processes with shared infrastructure;
- Postgres tuning/read replicas;
- Redis cluster if truly needed;
- CDN for web/static assets.
