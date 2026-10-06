CREATE TABLE gameplay_actions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_key text NOT NULL,
  fingerprint text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, action_key)
);
CREATE TABLE resident_claims (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quest_id)
);
CREATE TABLE resident_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id text NOT NULL,
  destination text NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled'))
);
CREATE UNIQUE INDEX resident_order_active ON resident_orders(user_id) WHERE status = 'active';
CREATE TABLE farm_contract_completions (
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  contract_id text NOT NULL,
  day date NOT NULL,
  PRIMARY KEY (farm_id, contract_id, day)
);
ALTER TABLE user_fish_inventory ADD COLUMN is_favorite boolean NOT NULL DEFAULT false;
ALTER TABLE user_fish_inventory ADD COLUMN aquarium_slot smallint CHECK (aquarium_slot BETWEEN 1 AND 3);
CREATE UNIQUE INDEX aquarium_slot_unique ON user_fish_inventory(user_id, aquarium_slot) WHERE aquarium_slot IS NOT NULL;
CREATE TABLE bida_matches (
  id text PRIMARY KEY,
  host_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  winner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('8ball','carom')),
  finished_at timestamptz NOT NULL DEFAULT now(),
  CHECK (host_id <> guest_id AND winner_id IN (host_id, guest_id))
);
CREATE INDEX bida_matches_finished ON bida_matches(finished_at);
CREATE TABLE fishing_catches (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 species_id text NOT NULL, weight_kg numeric NOT NULL CHECK(weight_kg>0), caught_at timestamptz NOT NULL
);
ALTER TABLE farms ADD COLUMN access_version uuid NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX fishing_catches_week ON fishing_catches(caught_at,user_id);
CREATE TABLE community_votes (
 voter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 week date NOT NULL, PRIMARY KEY(voter_id,week), CHECK(voter_id<>owner_id)
);
CREATE TABLE resident_parties (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),leader_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE resident_party_members (user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,party_id uuid NOT NULL REFERENCES resident_parties(id) ON DELETE CASCADE);
CREATE TABLE resident_party_invites (party_id uuid NOT NULL REFERENCES resident_parties(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at timestamptz NOT NULL,PRIMARY KEY(party_id,user_id));
CREATE TABLE resident_party_messages (id bigserial PRIMARY KEY,party_id uuid NOT NULL REFERENCES resident_parties(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,body text NOT NULL CHECK(length(body) BETWEEN 1 AND 300),created_at timestamptz NOT NULL);
UPDATE farm_animals SET animal_type = 'chicken' WHERE animal_type = 'poultry';
INSERT INTO farm_warehouse_items(farm_id,item_id,category,quantity)
SELECT farm_id,item_id || '_harvest',category,quantity FROM farm_warehouse_items
WHERE item_id IN ('crop_rice','crop_corn','crop_watermelon','crop_tomato','crop_chili')
ON CONFLICT(farm_id,item_id) DO UPDATE SET quantity = farm_warehouse_items.quantity + EXCLUDED.quantity;
DELETE FROM farm_warehouse_items WHERE item_id IN ('crop_rice','crop_corn','crop_watermelon','crop_tomato','crop_chili');
