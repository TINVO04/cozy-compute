# Open Questions — Defaults Already Chosen

These are areas where future tuning is expected. Claude should implement the defaults below unless a blocker appears.

| Area | Default | Why |
|---|---|---|
| Primary client | Web | Lowest friction for social games |
| Desktop | Tauri 2 wrapper | Reuse same client |
| Realtime | Colyseus | Authoritative rooms + TS |
| Rendering | Phaser 3 | Browser-first 2D |
| API gateway | LiteLLM | OpenAI-compatible + virtual keys + budgets |
| DB | PostgreSQL | Durable economy/ledger |
| Cache | Redis | Rate limits + ephemeral state |
| Deployment | Docker Compose | One-server-first |
| Release | GitHub Actions | Windows artifacts |
| Windows artifact | NSIS setup `.exe` | Simple user download/install |
| Auth | Email + password initially | Simple MVP; add OAuth later |
| AI reward | Non-transferable virtual quota | Reduce economy abuse |
| Model access | Allowlisted aliases | Protect upstream endpoints |
| Key TTL | 30 days default | Limits leaked keys |
| AI reward pool | Admin-controlled weekly | Keeps business costs bounded |
| Mobile | Not MVP | Protect desktop UX quality |

## Must be researched before public launch

- applicable terms for upstream model providers;
- payment/tax implications of premium AI quota;
- regional rules affecting rewards or digital services;
- age policy and moderation requirements;
- data retention/privacy policy for API usage logs.
