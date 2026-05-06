-- Drop the old foreign key constraint that was causing conflicts when inserting into vora_inventory
ALTER TABLE vora_inventory DROP CONSTRAINT IF EXISTS vora_inventory_catalog_product_id_fkey;
