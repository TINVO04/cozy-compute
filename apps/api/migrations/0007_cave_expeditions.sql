CREATE TABLE cave_accounts (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  weapon text NOT NULL DEFAULT 'training' CHECK (weapon IN ('training', 'iron', 'crystal')),
  stone integer NOT NULL DEFAULT 0 CHECK (stone >= 0),
  iron integer NOT NULL DEFAULT 0 CHECK (iron >= 0),
  crystal integer NOT NULL DEFAULT 0 CHECK (crystal >= 0)
);
CREATE TABLE cave_transactions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id text NOT NULL,
  PRIMARY KEY (user_id, request_id),
  created_at timestamptz NOT NULL DEFAULT now()
);
