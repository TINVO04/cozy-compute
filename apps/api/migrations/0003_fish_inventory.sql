CREATE TABLE user_fish_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  species_id text NOT NULL,
  size_cm numeric(6,1) NOT NULL,
  weight_kg numeric(6,1) NOT NULL,
  size_category text NOT NULL DEFAULT 'standard' CHECK (size_category IN ('small', 'standard', 'large', 'giant')),
  is_held boolean NOT NULL DEFAULT false,
  caught_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_fish_inventory_user_idx ON user_fish_inventory (user_id, caught_at DESC);
CREATE UNIQUE INDEX user_fish_held_uq ON user_fish_inventory (user_id) WHERE is_held;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS held_fish jsonb DEFAULT NULL;
