# Deployment + Docker

## Deployment target

First production deployment runs on the developer's own machine/server with Docker Compose.

## Service map

```yaml
services:
  caddy:
  web:
  api:
  realtime:
  litellm:
  postgres:
  redis:
```

Optional:
- admin if kept separate;
- minio for local object storage;
- prometheus/grafana later.

## Reverse proxy

Caddy terminates TLS and routes:

```text
https://game.example.com        -> web
https://game.example.com/api/*  -> api
https://game.example.com/ws/*   -> realtime websocket
https://api.example.com/*       -> litellm
```

Prefer a single public domain if it simplifies CORS and cookies, while keeping the AI gateway on a distinct subdomain if operationally useful.

## Environment separation

- `.env.example` committed;
- `.env.production` never committed;
- provider secrets only on host/secret store;
- different secrets for dev/staging/prod.

## Compose files

- `compose.yaml` for common services;
- `compose.production.yaml` for production overrides.

Docker explicitly supports using a production override file and recommends changes such as restart policies and rebuilding images during deployment. [Docker docs](https://docs.docker.com/compose/how-tos/production/)

## Backups

PostgreSQL:
- daily encrypted dump;
- weekly full snapshot;
- test restore monthly before production trust.

Redis is disposable for MVP cache/presence data.

## Observability

Minimum:
- structured JSON logs;
- request ids;
- error tracking;
- gateway usage metrics;
- DB slow query logs;
- websocket room/player counts;
- reward issuance metrics;
- redemption success/failure metrics.

## Health checks

Each service must expose or support health checks.

Examples:
- `/healthz`
- `/readyz`

A service should not be marked ready before dependencies needed for that service are available.

## Update procedure

1. pull image/source;
2. run database migrations;
3. build changed services;
4. `docker compose -f compose.yaml -f compose.production.yaml up -d`;
5. verify health;
6. smoke test login + multiplayer + redemption;
7. keep last known-good image tags for rollback.
