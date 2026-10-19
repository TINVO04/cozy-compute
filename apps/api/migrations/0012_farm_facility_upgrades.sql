-- ----------------------------------------------------------------------------
-- 0012: Farm Facility Upgrades & Trough Expansion
-- Tracks pen livestock capacity and trough upgrade tiers.
-- ----------------------------------------------------------------------------
ALTER TABLE farms
  ADD COLUMN IF NOT EXISTS livestock_capacity integer NOT NULL DEFAULT 24;

ALTER TABLE farm_feed_troughs
  ADD COLUMN IF NOT EXISTS upgrade_level integer NOT NULL DEFAULT 1;
