-- ============================================================================
-- Migration: 0005_cozy_farm_system.sql
-- Description: Cozy Farm System database schema for Cozy Compute Social MMO.
-- Tables created:
--   1. farms
--   2. farm_plots
--   3. farm_animals
--   4. farm_warehouse_items
--   5. farm_pond_fishes
-- Includes:
--   - UUID primary keys (gen_random_uuid())
--   - Cascade deletions (ON DELETE CASCADE)
--   - Explicit constraints and indexes
--   - Initial provisioning queries for existing users and farms
--   - Reusable plpgsql provisioning helper function
-- ============================================================================

-- Ensure pgcrypto extension is available for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. FARMS TABLE
-- Master record for personal farm instance per player (1-to-1 with users).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  password_hash text DEFAULT NULL,
  is_public boolean NOT NULL DEFAULT true,
  warehouse_capacity integer NOT NULL DEFAULT 100 CHECK (warehouse_capacity >= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS farms_user_id_uq ON farms (user_id);
CREATE INDEX IF NOT EXISTS farms_is_public_idx ON farms (is_public);

-- ----------------------------------------------------------------------------
-- 2. FARM_PLOTS TABLE
-- 36-plot farming grid (plot_index 0..35).
-- Starter plots 0..3 are unlocked by default with unlock_price = 0.
-- Plots 4..35 are locked by default with tiered unlock prices.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farm_plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  plot_index smallint NOT NULL CHECK (plot_index >= 0 AND plot_index < 36),
  is_unlocked boolean NOT NULL DEFAULT false,
  unlock_price integer NOT NULL DEFAULT 0 CHECK (unlock_price >= 0),
  crop_id text DEFAULT NULL,
  planted_at timestamptz DEFAULT NULL,
  watered_at timestamptz DEFAULT NULL,
  is_fertilized boolean NOT NULL DEFAULT false,
  growth_stage text NOT NULL DEFAULT 'empty' CHECK (growth_stage IN ('empty', 'seed', 'sprout', 'blooming', 'mature', 'withered')),
  is_tilled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (farm_id, plot_index)
);

CREATE INDEX IF NOT EXISTS farm_plots_farm_id_idx ON farm_plots (farm_id);
CREATE INDEX IF NOT EXISTS farm_plots_farm_crop_idx ON farm_plots (farm_id, crop_id) WHERE crop_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS farm_plots_growth_idx ON farm_plots (farm_id, growth_stage);
CREATE INDEX IF NOT EXISTS farm_plots_watered_idx ON farm_plots (farm_id, watered_at);

-- ----------------------------------------------------------------------------
-- 3. FARM_ANIMALS TABLE
-- Livestock and poultry raised in specialized coops and barns.
-- Types: chicken, duck, cow, pig, goat, sheep.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farm_animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  animal_type text NOT NULL CHECK (animal_type IN ('chicken', 'duck', 'cow', 'pig', 'goat', 'sheep')),
  name text NOT NULL DEFAULT '',
  fed_at timestamptz DEFAULT NULL,
  happiness integer NOT NULL DEFAULT 50 CHECK (happiness BETWEEN 0 AND 100),
  last_yield_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS farm_animals_farm_id_idx ON farm_animals (farm_id);
CREATE INDEX IF NOT EXISTS farm_animals_type_idx ON farm_animals (farm_id, animal_type);
CREATE INDEX IF NOT EXISTS farm_animals_fed_idx ON farm_animals (farm_id, fed_at);

-- ----------------------------------------------------------------------------
-- 4. FARM_WAREHOUSE_ITEMS TABLE
-- Dedicated silo storage separated from player backpack.
-- 4 smart categories: crop, animal_product, seed, supply.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farm_warehouse_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  category text NOT NULL CHECK (category IN ('crop', 'animal_product', 'seed', 'supply')),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (farm_id, item_id)
);

CREATE INDEX IF NOT EXISTS farm_warehouse_farm_id_idx ON farm_warehouse_items (farm_id);
CREATE INDEX IF NOT EXISTS farm_warehouse_category_idx ON farm_warehouse_items (farm_id, category);

-- ----------------------------------------------------------------------------
-- 5. FARM_POND_FISHES TABLE
-- Aquaculture system for cultivating specialty freshwater species.
-- Species: tra, basa, loc, tom_cang, bong_tuong.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farm_pond_fishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  fish_species text NOT NULL CHECK (fish_species IN ('tra', 'basa', 'loc', 'tom_cang', 'bong_tuong')),
  stocked_at timestamptz NOT NULL DEFAULT now(),
  current_weight_kg numeric(6,2) NOT NULL DEFAULT 0.10 CHECK (current_weight_kg >= 0),
  fed_at timestamptz DEFAULT NULL,
  growth_stage text NOT NULL DEFAULT 'juvenile' CHECK (growth_stage IN ('fingerling', 'juvenile', 'adult', 'specialty')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS farm_pond_fishes_farm_id_idx ON farm_pond_fishes (farm_id);
CREATE INDEX IF NOT EXISTS farm_pond_fishes_species_idx ON farm_pond_fishes (farm_id, fish_species);
CREATE INDEX IF NOT EXISTS farm_pond_fishes_fed_idx ON farm_pond_fishes (farm_id, fed_at);

-- ----------------------------------------------------------------------------
-- 6. ITEM_DEFINITIONS CONSTRAINT EXPANSION (FORWARD COMPATIBILITY)
-- Allow farm item categories in item_definitions if referenced in general catalogs.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE item_definitions DROP CONSTRAINT IF EXISTS item_definitions_type_check;
  ALTER TABLE item_definitions ADD CONSTRAINT item_definitions_type_check
    CHECK (type IN ('clothing', 'furniture', 'rod', 'seed', 'crop', 'animal_product', 'farm_supply'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 7. REUSABLE PROVISIONING FUNCTION
-- Can be called by application logic (e.g. user creation or on-demand farm init)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION provision_farm_plots(target_farm_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO farm_plots (
    farm_id,
    plot_index,
    is_unlocked,
    unlock_price,
    growth_stage,
    is_tilled
  )
  SELECT
    target_farm_id,
    s.idx,
    CASE WHEN s.idx < 4 THEN true ELSE false END,
    CASE
      WHEN s.idx < 4 THEN 0
      WHEN s.idx BETWEEN 4 AND 7 THEN 250
      WHEN s.idx BETWEEN 8 AND 11 THEN 500
      WHEN s.idx BETWEEN 12 AND 15 THEN 1000
      WHEN s.idx BETWEEN 16 AND 19 THEN 1500
      WHEN s.idx BETWEEN 20 AND 23 THEN 2500
      WHEN s.idx BETWEEN 24 AND 27 THEN 3500
      WHEN s.idx BETWEEN 28 AND 31 THEN 5000
      ELSE 7500
    END,
    'empty',
    false
  FROM generate_series(0, 35) AS s(idx)
  ON CONFLICT (farm_id, plot_index) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 8. INITIAL PROVISIONING QUERIES FOR EXISTING DATA
-- Automatically sets up farms and 36 initial plots for existing users.
-- ----------------------------------------------------------------------------
-- Step A: Insert farm record for each user who does not have one yet
INSERT INTO farms (user_id, is_public, warehouse_capacity)
SELECT id, true, 100
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Step B: Insert the 36 plot grid for all farms that do not have them yet
INSERT INTO farm_plots (
  farm_id,
  plot_index,
  is_unlocked,
  unlock_price,
  growth_stage,
  is_tilled
)
SELECT
  f.id,
  s.idx,
  CASE WHEN s.idx < 4 THEN true ELSE false END,
  CASE
    WHEN s.idx < 4 THEN 0
    WHEN s.idx BETWEEN 4 AND 7 THEN 250
    WHEN s.idx BETWEEN 8 AND 11 THEN 500
    WHEN s.idx BETWEEN 12 AND 15 THEN 1000
    WHEN s.idx BETWEEN 16 AND 19 THEN 1500
    WHEN s.idx BETWEEN 20 AND 23 THEN 2500
    WHEN s.idx BETWEEN 24 AND 27 THEN 3500
    WHEN s.idx BETWEEN 28 AND 31 THEN 5000
    ELSE 7500
  END,
  'empty',
  false
FROM farms f
CROSS JOIN generate_series(0, 35) AS s(idx)
ON CONFLICT (farm_id, plot_index) DO NOTHING;
