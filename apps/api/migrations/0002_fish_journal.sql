CREATE TABLE fish_journal (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  species_id text NOT NULL,
  count integer NOT NULL DEFAULT 1 CHECK (count > 0),
  max_size_cm numeric(6,1) NOT NULL,
  max_weight_kg numeric(6,1) NOT NULL,
  first_caught_at timestamptz NOT NULL DEFAULT now(),
  last_caught_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, species_id)
);
CREATE INDEX fish_journal_user_idx ON fish_journal (user_id, last_caught_at DESC);
