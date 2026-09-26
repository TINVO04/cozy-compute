# Claude Opus 5.5 — Execution Prompt

You are the lead engineer, game designer and product engineer for this repository.

## Mission

Build the first production-quality MVP of a 2D realtime social MMO with an external AI quota reward economy. Players spend time in a humorous social world, earn Coin, build/style their avatar and apartment, participate in short activities/events, and eventually redeem part of their earned economy into virtual API quota. The API is OpenAI-compatible, but the upstream model endpoints are fully admin-configured and may be self-hosted or third-party compatible services.

## Rules

- Read every file in this plan before making architecture changes.
- Do not replace the chosen architecture unless a documented blocker exists.
- Do not ask the human to decide routine implementation details; choose the smallest robust option and document the decision.
- Do not ship fake buttons, dead-end screens, TODO placeholders or mock flows presented as complete features.
- Keep game rules server-authoritative.
- Write tests for economy math, redemption, quota allocation, permissions and anti-abuse rules.
- Run lint, typecheck, unit tests and production builds before considering a milestone complete.
- Treat UI quality as a first-class deliverable, not polish after engineering.
- Use original assets/components. External references can inform interaction patterns, not be copied into the product.
- No provider/master AI credentials in client code.
- Never trust client-supplied Coin, Fame, inventory, quota, model access or reward values.
- Make all reward rates/admin configuration data-driven.

## Definition of done for MVP

A new user can:

1. register/login;
2. enter a persistent 2D town;
3. see and move around with other players in realtime;
4. complete at least three repeatable non-combat activities;
5. earn Coin from server-validated activities;
6. buy at least clothing/furniture items;
7. customize an apartment/room;
8. join a short social event/minigame;
9. see Coin, Fame and AI Credit balances;
10. redeem Coin for an AI reward voucher when eligible;
11. create a virtual API key restricted to the redeemed model/quota;
12. copy the Base URL, key and model name from a professional API connection screen;
13. use that credential against the game gateway using an OpenAI-compatible client;
14. see quota usage/remaining quota in-game;
15. revoke/rotate the key.

Admins can:

- create/edit/disable a model deployment;
- set upstream base URL and secret reference;
- set model alias;
- set internal reward price;
- set per-user and global quota;
- set rate limits;
- inspect usage and reward ledger;
- revoke a player key;
- pause redemptions globally;
- review abuse flags.

## Build sequence

Phase 1: repository + CI + environment + database + authentication.
Phase 2: realtime town + player movement + presence.
Phase 3: gameplay activities + authoritative economy.
Phase 4: inventory/avatar/apartment + social UI.
Phase 5: AI gateway integration + virtual keys + quota redemption.
Phase 6: admin console + observability + anti-abuse.
Phase 7: visual polish + Tauri desktop packaging + GitHub Release.
Phase 8: load test and hardening.

## Before coding

Create an Architecture Decision Record for any decision that changes:
- networking model;
- database schema strategy;
- AI gateway ownership;
- reward emission rules;
- client packaging;
- authentication/security boundary.

## During coding

Prefer small vertical slices. A slice should have:
- backend behavior;
- persistence;
- UI;
- error state;
- tests;
- logging;
- admin visibility where relevant.

## Final verification

Produce a `BUILD_STATUS.md` containing:
- completed items;
- tested items;
- commands executed;
- known limitations;
- remaining risks;
- exact local/dev URLs;
- exact Docker commands;
- exact GitHub release command/tag format.
