ALTER TABLE item_definitions DROP CONSTRAINT IF EXISTS item_definitions_type_check;
ALTER TABLE item_definitions ADD CONSTRAINT item_definitions_type_check
  CHECK (type IN ('clothing', 'furniture', 'rod', 'boat', 'vehicle', 'seed', 'crop', 'animal_product', 'farm_supply'));
