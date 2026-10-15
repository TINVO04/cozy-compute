-- ----------------------------------------------------------------------------
-- 0009: Animal Growth Accumulation
-- Tracks accumulated fed growth duration for farm livestock.
-- ----------------------------------------------------------------------------
ALTER TABLE farm_animals
  ADD COLUMN IF NOT EXISTS growth_accum_sec integer NOT NULL DEFAULT 0;
