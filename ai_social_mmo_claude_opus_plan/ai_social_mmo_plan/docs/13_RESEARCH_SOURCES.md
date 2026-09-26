# Research Sources + Design Notes

Research date: 2026-09-27

## Social/2D references

### Pixadom
Current product page describes Pixadom as a browser-based cozy 2D social pixel art MMORPG. Its roadmap discusses apartments, leaderboards, shops/items, friends, messaging and settings. These make it one of the closest structural references for this project.

- https://www.pixadom.com/
- https://www.pixadom.com/roadmap

Design extraction:
- apartment as a long-term progression surface;
- browser-first access;
- event/leaderboard loop;
- social features embedded into the world.

### Habbo / Habbo Origins
Useful reference for room construction, furniture density, avatar identity, compact social controls and player-hosted room activities.

- https://origins.habbo.com/

Design extraction:
- room readability;
- furniture as expression;
- chat anchored near the world;
- social room culture.

### Everskies
Useful reference for fashion-led identity, item browsing, social feeds and creator submissions. Everskies currently documents a design submission system and states designers can build a brand and earn real money from designs, subject to review and rules.

- https://everskies.com/
- https://support.everskies.com/en/articles/8996924-what-are-the-rules-for-submitting-a-design-on-everskies

Design extraction:
- item-centric UI;
- creator ecosystem;
- social activity feed;
- dense but navigable fashion screens.

### Highrise
Useful reference for event-first social UX, fashion challenges, rooms, social discovery and creator tooling. Highrise's current site advertises fashion, room creation, events, item collection/trading and desktop/Steam access. Its 2026 event posts emphasize that events are social hubs and that event UI was being refined for cohesion.

- https://highrise.game/
- https://highrise.game/news/2981
- https://highrise.game/news/event-ui-polish-and-pizzazz-2980

Design extraction:
- events as the recurring content engine;
- rewards surfaced clearly;
- cohesive event information architecture;
- social status and creator expression.

## AI gateway references

### LiteLLM
LiteLLM documents a self-hosted OpenAI-compatible proxy, virtual keys, model access control, budgets and rate limits. Its current Docker quickstart uses Postgres for spend/budget tracking and exposes a gateway that can be called with standard OpenAI-compatible clients.

- https://docs.litellm.ai/docs/proxy/docker_quick_start
- https://docs.litellm.ai/docs/proxy/virtual_keys
- https://docs.litellm.ai/docs/proxy/users

Design extraction:
- virtual player-facing keys;
- model-level access controls;
- gateway-owned spend tracking;
- server-side budget enforcement.

## Client/deployment references

### Phaser
- https://docs.phaser.io/

Reason: browser-first 2D HTML5 game framework with WebGL/Canvas and TypeScript support.

### Colyseus
- https://docs.colyseus.io/

Reason: authoritative Node.js multiplayer rooms, realtime state sync and matchmaking.

### Tauri
- https://tauri.app/distribute/windows-installer/
- https://v2.tauri.app/distribute/pipelines/github/

Reason: reuse the web client for a Windows desktop app and automate release builds in GitHub Actions.

### Docker Compose
- https://docs.docker.com/compose/how-tos/production/

Reason: single-server-first deployment with production overrides and predictable redeploys.

## Visual research usage rule

Use screenshots/search results from these references to understand:
- hierarchy;
- density;
- interaction patterns;
- reward surfacing;
- social affordances.

Do not copy:
- proprietary artwork;
- sprites;
- logos;
- exact screen composition;
- exact iconography;
- exact branding.

Create a distinct UI system based on the design specification in `design/06_UI_UX_DESIGN_SYSTEM.md`.
