-- ============================================
-- REMOVE FK on vora_sale_items.product_id PERMANENTLY
-- The product name is already stored directly in vora_sale_items.name,
-- so the FK is unnecessary and causes errors when inventory items
-- reference catalog_product_ids that don't exist in catalog_products.
-- ============================================

ALTER TABLE vora_sale_items DROP CONSTRAINT IF EXISTS vora_sale_items_product_id_fkey;

-- Make product_id nullable (if not already)
ALTER TABLE vora_sale_items ALTER COLUMN product_id DROP NOT NULL;
