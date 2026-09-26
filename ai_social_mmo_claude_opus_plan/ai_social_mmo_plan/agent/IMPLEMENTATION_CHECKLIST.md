# Implementation Checklist

Use this as the live task board. Replace `[ ]` with `[x]` only after code + tests + manual verification exist.

## Foundation

- [x] pnpm workspace created
- [x] apps/packages/infra structure created
- [x] TypeScript strict mode
- [x] lint/format hooks
- [x] CI workflow
- [x] Docker Compose dev stack
- [x] PostgreSQL migration system
- [x] Redis integration
- [x] structured logging

## Game client

- [x] Phaser boot
- [x] React shell
- [x] shared UI primitives
- [x] town scene
- [x] player movement
- [x] nameplates
- [x] chat bubbles
- [x] emote wheel
- [x] reconnect UI

## Multiplayer

- [x] Colyseus room
- [x] server movement validation
- [x] interpolation
- [x] room transfer
- [x] presence
- [x] load test harness

## Economy

- [x] Coin ledger
- [x] reward rules
- [x] fishing
- [x] delivery
- [x] event
- [x] shop
- [x] inventory
- [x] apartment

## AI rewards

- [x] model registry
- [x] LiteLLM integration
- [x] virtual key creation
- [x] Coin -> AI Credit
- [x] redemption idempotency
- [x] budget enforcement
- [x] rate limits
- [x] key revoke
- [x] usage sync
- [x] player API connection screen

## Admin

- [x] model management
- [x] endpoint secret reference
- [x] reward pool
- [x] quota policy
- [x] redemption pause
- [x] usage dashboard
- [x] audit log
- [x] abuse flags

## Operations

- [x] production Compose
- [x] Caddy TLS
- [x] database backup
- [x] health checks
- [x] metrics/logs
- [x] GitHub release workflow
- [x] Windows x64 installer
- [x] checksum
- [x] release notes

## Quality

- [x] Playwright login smoke
- [x] unit tests for all economy math
- [x] integration tests for redemption
- [x] external SDK compatibility test
- [x] 100-player load test harness
- [x] client tamper test
- [x] duplicate redemption test
- [x] UI review at 1280x720 and 1440x900
- [x] keyboard/accessibility review
