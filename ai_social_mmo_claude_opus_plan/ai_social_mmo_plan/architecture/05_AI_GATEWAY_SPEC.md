# AI-Compatible Gateway Specification

## Goal

Players receive a Base URL + virtual API key that works with OpenAI-compatible SDKs and tools. The upstream models are configurable by the game admin and are not tied to official provider URLs.

## Boundary

```text
Player app / Cursor / Python / OpenAI SDK
              |
              | Base URL + virtual key
              v
     api.game-domain.example
              |
        Auth + policy
              |
            LiteLLM
              |
      configured model alias
              |
     custom OpenAI-compatible
       upstream endpoint
```

## Admin model record

```ts
interface ModelDeployment {
  id: string;
  slug: string;
  displayName: string;
  publicModelName: string;
  upstreamModelName: string;
  upstreamBaseUrl: string;
  secretRef: string;
  enabled: boolean;
  allowExternalUse: boolean;
  internalRewardUsdPerCoin: number;
  userDailyBudgetUsd?: number;
  userMonthlyBudgetUsd?: number;
  rpm: number;
  tpm: number;
  contextLimit?: number;
  createdAt: string;
  updatedAt: string;
}
```

**Never store raw provider secret in the frontend or game database unless encrypted-at-rest using the chosen secrets strategy. Prefer env/secret references passed to the gateway.**

## Virtual key record

```ts
interface PlayerVirtualKey {
  id: string;
  userId: string;
  gatewayKeyId: string;
  label: string;
  allowedModelIds: string[];
  budgetUsd: number;
  usedUsd: number;
  status: 'active' | 'suspended' | 'revoked' | 'expired';
  expiresAt?: string;
  createdAt: string;
  revokedAt?: string;
}
```

## Key creation flow

`POST /v1/player/ai-keys`

Request:

```json
{
  "modelIds": ["creator-pro"],
  "budgetUsd": 3,
  "ttlDays": 30
}
```

Server:
1. authenticate user;
2. validate eligibility;
3. validate model allowlist;
4. validate remaining AI reward balance;
5. create/reuse gateway virtual key;
6. apply model access + budget + rate limit;
7. persist game-side key reference;
8. return secret exactly once.

Response:

```json
{
  "baseUrl": "https://api.example.com/v1",
  "apiKey": "sk-game-...",
  "models": ["creator-pro"],
  "budgetUsd": 3,
  "expiresAt": "2026-10-27T00:00:00Z"
}
```

## Usage reporting

Do not trust the player client to report API usage.

Usage source:
- gateway spend logs;
- gateway request logs/metrics;
- periodic reconciliation into `ai_usage_ledger`.

## Custom upstream endpoints

Admin can specify:

```text
Base URL: https://my-compatible-provider.example/v1
Model: my-model-name
Credential: secret reference
```

The gateway translates the player's public model alias to the upstream configuration.

## Compatibility requirement

At minimum support:
- `/v1/chat/completions`;
- streaming responses;
- standard Bearer API key auth;
- model listing only for models the key is allowed to use.

Optional later:
- embeddings;
- responses API compatibility;
- vision;
- tool calling.

## Player security

- master key never shown to players;
- provider keys never shown to players;
- virtual key budget enforced at gateway;
- player key can be revoked/rotated;
- suspicious key sharing triggers automatic temporary suspension;
- rate limits per key and per user;
- no unlimited key creation.

## Why LiteLLM fits

LiteLLM explicitly supports virtual keys, budgets and model access controls, and its Docker quickstart supports an OpenAI-compatible proxy with PostgreSQL-backed spend/budget tracking. [Docs](https://docs.litellm.ai/docs/proxy/virtual_keys)

## Important licensing/operations note

Before production, verify the licenses, usage terms and commercial restrictions of every upstream model/service you configure. The game does not imply ownership of upstream models.
