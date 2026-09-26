# Data Model

## Core tables

### users
- id
- email/username
- password_hash or auth_provider_id
- created_at
- last_login_at
- status
- trust_score

### profiles
- user_id
- display_name
- avatar_id
- fame
- title_id

### balances
- user_id
- coin_balance
- ai_credit_balance
- updated_at

### ledger_entries
- id
- user_id
- currency_type
- amount
- balance_after
- reason_type
- reference_id
- metadata_json
- idempotency_key
- created_at

Never mutate balances without a corresponding ledger entry.

### inventory_items
- id
- user_id
- item_definition_id
- quantity
- equipped_slot

### item_definitions
- id
- type
- rarity
- metadata_json
- coin_price
- enabled

### apartments
- id
- user_id
- name
- theme_id
- score
- published

### apartment_objects
- id
- apartment_id
- item_definition_id
- x
- y
- rotation
- layer
- metadata_json

### activities
- id
- slug
- type
- config_json
- enabled

### activity_runs
- id
- user_id
- activity_id
- started_at
- completed_at
- result_json
- reward_ledger_id

### events
- id
- slug
- config_json
- starts_at
- ends_at
- status

### event_entries
- event_id
- user_id
- score
- placement
- reward_reference

### model_deployments
- id
- slug
- display_name
- public_model_name
- upstream_model_name
- upstream_base_url
- secret_ref
- enabled
- reward_rate_json
- limits_json
- created_at
- updated_at

### player_ai_keys
- id
- user_id
- gateway_key_id
- label
- status
- expires_at
- budget_usd
- allowed_model_ids_json
- created_at
- revoked_at

Never store the full player API secret after initial creation unless there is a specific secure recovery design. Store only the gateway key id and safe metadata.

### ai_redemptions
- id
- user_id
- request_id
- source_coin
- ai_credit_minted
- quota_usd
- model_ids_json
- status
- idempotency_key
- gateway_operation_id
- created_at
- completed_at

### ai_usage_ledger
- id
- user_id
- player_ai_key_id
- model_id
- request_count
- input_tokens
- output_tokens
- cost_usd
- usage_window
- gateway_reference
- created_at

### admin_audit_log
- id
- admin_user_id
- action
- entity_type
- entity_id
- before_json
- after_json
- created_at

### abuse_flags
- id
- user_id
- type
- severity
- score
- status
- metadata_json
- created_at

## Transaction invariants

- reward grants happen inside database transactions;
- idempotency keys are unique;
- redemption cannot double-spend Coin;
- key creation without ledger approval is forbidden;
- model disable/revoke is enforced server-side and gateway-side.
