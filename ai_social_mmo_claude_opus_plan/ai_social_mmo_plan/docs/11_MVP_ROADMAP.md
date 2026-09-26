# MVP Roadmap

## Milestone 0 — Foundations

Deliver:
- monorepo;
- TypeScript strict mode;
- shared types;
- Docker Compose dev stack;
- Postgres migrations;
- Redis;
- CI;
- auth skeleton;
- logging;
- error handling.

Exit criteria:
- clean install from README;
- one command starts dev dependencies;
- CI green.

## Milestone 1 — Multiplayer shell

Deliver:
- 2D town scene;
- login -> room join;
- movement;
- interpolation;
- player presence;
- chat;
- reconnect;
- room transfer.

Exit:
- 20 test clients can share a room locally without desync.

## Milestone 2 — Economy + activities

Deliver:
- Coin ledger;
- fishing;
- delivery;
- one event;
- shop;
- inventory;
- anti-replay.

Exit:
- all reward paths have server-side tests and ledger entries.

## Milestone 3 — Identity + housing

Deliver:
- avatar customization;
- clothing equip;
- apartment editor;
- guestbook;
- apartment publish;
- social profile.

Exit:
- player can create and revisit a persistent room.

## Milestone 4 — AI reward economy

Deliver:
- admin model registry;
- LiteLLM integration;
- virtual key creation;
- Coin -> AI Credit;
- redemption ledger;
- quota display;
- connection details;
- revoke/rotate.

Exit:
- a test player can use the issued Base URL + virtual key from an external OpenAI-compatible client.

## Milestone 5 — Admin console

Deliver:
- model setup;
- quota/rate controls;
- reward pool;
- player key management;
- ledger search;
- abuse flags;
- audit log;
- global redemption pause.

Exit:
- all economic settings can be changed without code edits.

## Milestone 6 — Polish + release

Deliver:
- UI system fully applied;
- loading/error states;
- sounds;
- onboarding;
- accessibility basics;
- Tauri Windows build;
- GitHub Release;
- install/update documentation.

Exit:
- closed alpha build can be installed and played end-to-end.

## Milestone 7 — Hardening

Load test:
- 100 concurrent players;
- 20 concurrent redemptions;
- gateway burst test;
- websocket reconnect storm;
- database failure simulation.

Security test:
- replay reward;
- modify client balance;
- reuse redemption idempotency key;
- forge activity completion;
- access another player's key;
- attempt disabled model;
- exceed budget/rate.
