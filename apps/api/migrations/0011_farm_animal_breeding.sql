-- ----------------------------------------------------------------------------
-- 0011: Farm Animal Breeding (Hệ thống nhân giống & ghép đôi sinh sản)
-- Tracks breeding cooldowns for farm livestock.
-- ----------------------------------------------------------------------------
ALTER TABLE farm_animals
  ADD COLUMN IF NOT EXISTS bred_at timestamptz;
