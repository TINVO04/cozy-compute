-- ----------------------------------------------------------------------------
-- 0010: Farm Feed Troughs (Máng ăn tự động chuồng trại)
-- Automated feed reserves for farm pens so animals feed themselves while offline.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farm_feed_troughs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  facility varchar(32) NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  capacity integer NOT NULL DEFAULT 40,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_farm_feed_trough_facility UNIQUE (farm_id, facility)
);

CREATE INDEX IF NOT EXISTS idx_farm_feed_troughs_farm_id ON farm_feed_troughs(farm_id);
