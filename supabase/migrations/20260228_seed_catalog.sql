-- ============================================
-- 02 FIX: Seed Catalog Products & Clean Inventory
-- ============================================

-- 1. Ensure brands exist (just in case)
INSERT INTO brands (name) VALUES
('Natura'), ('O Boticário'), ('Eudora'), ('Avon'), ('Mary Kay'), ('Jequiti'), ('Hinode')
ON CONFLICT (name) DO NOTHING;

-- 2. Clear old catalog_products and inventory (because old IDs are corrupted)
-- WARNING: This resets the catalog and inventory to fix the FK mismatch
DELETE FROM vora_inventory;
DELETE FROM catalog_products;

-- 3. Seed some basic products for testing so the user has something to work with!
DO $$
DECLARE
  v_natura UUID;
  v_boti UUID;
  v_avon UUID;
BEGIN
  SELECT id INTO v_natura FROM brands WHERE name = 'Natura' LIMIT 1;
  SELECT id INTO v_boti FROM brands WHERE name = 'O Boticário' LIMIT 1;
  SELECT id INTO v_avon FROM brands WHERE name = 'Avon' LIMIT 1;

  INSERT INTO catalog_products (brand_id, name, category) VALUES
  (v_natura, 'Essencial Exclusivo Masculino', 'Perfumaria'),
  (v_natura, 'Kaiak Tradicional', 'Perfumaria'),
  (v_natura, 'Creme Todo Dia Cereja e Avelã', 'Corpo e Banho'),
  (v_boti, 'Malbec Tradicional', 'Perfumaria'),
  (v_boti, 'Lily Eau de Parfum', 'Perfumaria'),
  (v_boti, 'Floratta Blue', 'Perfumaria'),
  (v_avon, 'Renew Reversalist', 'Rosto'),
  (v_avon, 'Pur Blanca', 'Perfumaria');
END $$;
