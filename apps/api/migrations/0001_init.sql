CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  trust_score integer NOT NULL DEFAULT 100 CHECK (trust_score BETWEEN 0 AND 100),
  onboarding jsonb NOT NULL DEFAULT '{}'::jsonb,
  onboarding_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE UNIQUE INDEX users_email_uq ON users (lower(email));

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  appearance jsonb NOT NULL DEFAULT '{}'::jsonb,
  fame integer NOT NULL DEFAULT 0 CHECK (fame >= 0),
  status_text text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_display_name_uq ON profiles (lower(display_name));

CREATE TABLE balances (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  coin bigint NOT NULL DEFAULT 0 CHECK (coin >= 0),
  ai_credit_cents bigint NOT NULL DEFAULT 0 CHECK (ai_credit_cents >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ledger_entries (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency text NOT NULL CHECK (currency IN ('coin', 'fame', 'ai_credit')),
  amount bigint NOT NULL,
  balance_after bigint NOT NULL,
  reason_type text NOT NULL,
  reference_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_user_idx ON ledger_entries (user_id, created_at DESC);
CREATE INDEX ledger_reason_idx ON ledger_entries (reason_type, created_at DESC);

CREATE TABLE item_definitions (
  id text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('clothing', 'furniture')),
  slot text,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  rarity text NOT NULL,
  coin_price integer NOT NULL CHECK (coin_price >= 0),
  sprite text NOT NULL,
  size_w integer NOT NULL DEFAULT 1,
  size_h integer NOT NULL DEFAULT 1,
  decor integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true
);

CREATE TABLE inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id text NOT NULL REFERENCES item_definitions(id),
  quantity integer NOT NULL CHECK (quantity >= 0),
  equipped_slot text,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
CREATE UNIQUE INDEX inventory_equipped_uq ON inventory_items (user_id, equipped_slot) WHERE equipped_slot IS NOT NULL;

CREATE TABLE wishlist (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id text NOT NULL REFERENCES item_definitions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE apartments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  theme_id text NOT NULL DEFAULT 'cozy',
  score integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  visits integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE apartment_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  item_id text NOT NULL REFERENCES item_definitions(id),
  x integer NOT NULL,
  y integer NOT NULL,
  rotation integer NOT NULL DEFAULT 0 CHECK (rotation IN (0, 90, 180, 270)),
  layer integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX apartment_objects_apartment_idx ON apartment_objects (apartment_id);

CREATE TABLE guestbook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX guestbook_apartment_idx ON guestbook_entries (apartment_id, created_at DESC);

CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  type text NOT NULL,
  config jsonb NOT NULL,
  enabled boolean NOT NULL DEFAULT true
);

CREATE TABLE activity_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_slug text NOT NULL,
  nonce text NOT NULL,
  state jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'expired')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  completed_at timestamptz,
  result jsonb,
  reward_ledger_id bigint REFERENCES ledger_entries(id)
);
CREATE INDEX activity_runs_user_idx ON activity_runs (user_id, activity_slug, started_at DESC);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'running', 'finished', 'cancelled')),
  participant_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_status_idx ON events (status, starts_at);

CREATE TABLE event_entries (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  placement integer,
  reward_reference text,
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE friends (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE TABLE mutes (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, muted_id),
  CHECK (user_id <> muted_id)
);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text NOT NULL DEFAULT '',
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE model_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  public_model_name text NOT NULL UNIQUE,
  upstream_provider text NOT NULL DEFAULT 'openai',
  upstream_model_name text NOT NULL,
  upstream_base_url text NOT NULL,
  secret_ref text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  allow_external_use boolean NOT NULL DEFAULT true,
  credit_multiplier numeric(8, 3) NOT NULL DEFAULT 1 CHECK (credit_multiplier > 0),
  input_cost_per_mtok numeric(12, 4) NOT NULL DEFAULT 0 CHECK (input_cost_per_mtok >= 0),
  output_cost_per_mtok numeric(12, 4) NOT NULL DEFAULT 0 CHECK (output_cost_per_mtok >= 0),
  rpm integer NOT NULL DEFAULT 20 CHECK (rpm > 0),
  tpm integer NOT NULL DEFAULT 60000 CHECK (tpm > 0),
  context_limit integer,
  user_monthly_budget_cents integer,
  gateway_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE player_ai_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gateway_key_id text UNIQUE,
  key_alias text NOT NULL UNIQUE,
  key_hint text,
  label text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'active', 'suspended', 'revoked', 'expired', 'failed')),
  allowed_models jsonb NOT NULL,
  budget_cents integer NOT NULL CHECK (budget_cents >= 0),
  spend_cents numeric(14, 4) NOT NULL DEFAULT 0,
  rpm integer NOT NULL,
  tpm integer NOT NULL,
  expires_at timestamptz NOT NULL,
  rotated_from uuid REFERENCES player_ai_keys(id),
  suspended_reason text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX player_ai_keys_user_idx ON player_ai_keys (user_id, status);

CREATE TABLE ai_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('mint', 'allocate')),
  idempotency_key text NOT NULL,
  source_coin bigint NOT NULL DEFAULT 0,
  ai_credit_cents bigint NOT NULL DEFAULT 0,
  quota_cents integer NOT NULL DEFAULT 0,
  model_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  key_id uuid REFERENCES player_ai_keys(id),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  failure_reason text,
  gateway_operation_id text,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX ai_redemptions_created_idx ON ai_redemptions (kind, status, created_at);

CREATE TABLE ai_usage_ledger (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player_ai_key_id uuid NOT NULL REFERENCES player_ai_keys(id) ON DELETE CASCADE,
  model_id text NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  cost_usd numeric(14, 6) NOT NULL DEFAULT 0,
  usage_window date NOT NULL,
  gateway_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_ai_key_id, model_id, usage_window)
);

CREATE TABLE admin_audit_log (
  id bigserial PRIMARY KEY,
  admin_user_id uuid REFERENCES users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_created_idx ON admin_audit_log (created_at DESC);

CREATE TABLE abuse_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  score integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'confirmed', 'dismissed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id)
);
CREATE INDEX abuse_flags_status_idx ON abuse_flags (status, created_at DESC);
