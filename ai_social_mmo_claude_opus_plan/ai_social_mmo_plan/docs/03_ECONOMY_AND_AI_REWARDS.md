# Economy + Real AI Reward System

## Currency model

### Coin
Normal in-game currency.

Use for:
- clothing;
- furniture;
- apartment upgrades;
- event entry where appropriate;
- player-to-player services.

### Fame
Non-transferable progression metric.

Use for:
- unlocks;
- creator permissions;
- AI reward eligibility;
- social status.

### AI Credit
A redemption accounting unit. It is **not crypto**, not transferable, and not a cash-equivalent balance.

AI Credit is minted by the game economy from Coin and can be redeemed into controlled virtual API quota.

## Economy separation

Never let players directly transfer AI Credit.

Recommended path:

```text
Coin -> AI Credit -> Redemption Voucher -> Virtual API Budget
```

The game ledger records every step.

## Emission control

Admin defines a weekly AI Reward Pool:

```yaml
action: ai_reward_pool
period: weekly
total_value: 500 USD-equivalent
```

The actual amount can be lower than the pool. Unused budget rolls over only if admin enables it.

## Example redemption configuration

```yaml
model:
  id: creator-pro
  public_name: Creator Pro
  upstream_model: custom-provider-model-name
  currency: USD
  player_reward_rate:
    coin_per_usd: 120000
  per_player:
    monthly_cap_usd: 5
    max_active_keys: 2
  rate_limit:
    rpm: 20
    tpm: 60000
```

These are examples only; admin UI must be able to change them.

## Redemption algorithm

1. Player requests redemption.
2. API checks account eligibility.
3. API locks the player reward balance.
4. Game creates an idempotency record.
5. Gateway virtual key is created/reused.
6. Quota/budget is assigned.
7. Ledger records source Coin burn, reward amount, model, key id, budget and expiration.
8. Player receives Base URL, API key and allowed model list.
9. Response is only shown after the gateway confirms the quota change.

## Refund/failed redemption

If gateway key creation or budget allocation fails:
- rollback the Coin burn;
- keep the redemption request idempotency-safe;
- log failure reason;
- never duplicate quota.

## Key lifecycle

- Active
- Suspended
- Revoked
- Expired

Players can rotate/revoke keys from the UI.

## External utility UX

Connection page must present:

```text
AI Gateway
https://api.example.com/v1

API Key
sk-••••••••••••

Models
creator-pro
chat-basic
vision-lite

Quota
$3.42 remaining
Resets
2026-10-01

[Copy API Key]
[Copy OpenAI SDK Example]
[Rotate Key]
[Revoke Key]
```

## Economy safety rules

- No direct Coin->cash redemption.
- No player-to-player AI Credit transfer.
- AI quota is a cost center with hard caps.
- Per-user and global limits are server-enforced.
- Reward pool can be emergency-paused.
- All redemption changes are ledgered.
- Admin changes require audit logs.
