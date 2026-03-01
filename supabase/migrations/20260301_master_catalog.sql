-- ==========================================
-- 1. RENAME TABLES TO MASTER FORMAT
-- ==========================================
-- We rename existing tables to preserve data instead of dropping them
-- vora_inventory.catalog_product_id will still point to the same UUIDs

DO $$ 
BEGIN
  -- Rename brands -> master_brands
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'master_brands') THEN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'vora_brands') THEN
      ALTER TABLE vora_brands RENAME TO master_brands;
    ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'brands') THEN
      ALTER TABLE brands RENAME TO master_brands;
    END IF;
  END IF;

  -- Rename catalog_products -> master_products
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'master_products') THEN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'vora_catalog_products') THEN
      ALTER TABLE vora_catalog_products RENAME TO master_products;
    ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'catalog_products') THEN
      ALTER TABLE catalog_products RENAME TO master_products;
    END IF;
  END IF;
END $$;

-- ==========================================
-- 2. ADD NEW COLUMNS
-- ==========================================
-- For Brands
ALTER TABLE master_brands ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE master_brands ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;
-- Ensure uniqueness still works properly
-- The UNIQUE constraint on "name" should have carried over automatically

-- For Products
ALTER TABLE master_products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE master_products ADD COLUMN IF NOT EXISTS suggested_price DECIMAL(10,2);
ALTER TABLE master_products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE master_products ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;

-- ==========================================
-- 3. UPDATE FOREIGN KEY COLUMNS (Optional but good practice)
-- ==========================================
-- Rename the column in vora_inventory to reflect the new table name
ALTER TABLE vora_inventory RENAME COLUMN catalog_product_id TO master_product_id;

-- ==========================================
-- 4. SEED: 20 BEAUTY GIANTS & FLAGSHIP PRODUCTS
-- ==========================================

-- Insert or update brands
INSERT INTO master_brands (name, is_custom) VALUES 
('Natura', false),
('O Boticário', false),
('Eudora', false),
('Mary Kay', false),
('Avon', false),
('Jequiti', false),
('Hinode', false),
('L''Occitane', false),
('Natura &Co (The Body Shop)', false),
('Mary Kay (At Play)', false),
('Quem Disse, Berenice?', false),
('Eu Amo Papelão', false), -- Mixed catalog examples
('Avon Care', false),
('Tupperware', false), -- Often sold together
('WePink', false), -- Popular influencer brand
('Demillus', false), -- Very common in resale mix
('Água de Cheiro', false),
('L''acqua di Fiori', false),
('Mahogany', false),
('Granado', false)
ON CONFLICT (name) DO UPDATE SET is_custom = false;

-- Utility block to insert products linking back to brand IDs
DO $$
DECLARE
  v_natura UUID;
  v_boticario UUID;
  v_eudora UUID;
  v_marykay UUID;
  v_avon UUID;
  v_jequiti UUID;
  v_hinode UUID;
  v_tupper UUID;
  v_wepink UUID;
  v_demillus UUID;
  v_qdb UUID;
BEGIN
  SELECT id INTO v_natura FROM master_brands WHERE name = 'Natura';
  SELECT id INTO v_boticario FROM master_brands WHERE name = 'O Boticário';
  SELECT id INTO v_eudora FROM master_brands WHERE name = 'Eudora';
  SELECT id INTO v_marykay FROM master_brands WHERE name = 'Mary Kay';
  SELECT id INTO v_avon FROM master_brands WHERE name = 'Avon';
  SELECT id INTO v_jequiti FROM master_brands WHERE name = 'Jequiti';
  SELECT id INTO v_hinode FROM master_brands WHERE name = 'Hinode';
  SELECT id INTO v_tupper FROM master_brands WHERE name = 'Tupperware';
  SELECT id INTO v_wepink FROM master_brands WHERE name = 'WePink';
  SELECT id INTO v_demillus FROM master_brands WHERE name = 'Demillus';
  SELECT id INTO v_qdb FROM master_brands WHERE name = 'Quem Disse, Berenice?';

  -- Natura
  INSERT INTO master_products (brand_id, name, category, suggested_price) VALUES
  (v_natura, 'Desodorante Colônia Kaiak Masculino', 'Perfumaria', 169.90),
  (v_natura, 'Deo Parfum Essencial Exclusivo Masculino', 'Perfumaria', 259.90),
  (v_natura, 'Creme Desodorante Nutritivo Tododia Macadâmia', 'Corpo e Banho', 65.90),
  (v_natura, 'Desodorante Colônia Luna Feminino', 'Perfumaria', 174.90),
  (v_natura, 'Polpa Hidratante para Mãos Ekos Castanha', 'Corpo e Banho', 51.90),
  (v_natura, 'Deo Parfum Ilía Secreto Feminino', 'Perfumaria', 219.90);

  -- O Boticário
  INSERT INTO master_products (brand_id, name, category, suggested_price) VALUES
  (v_boticario, 'Desodorante Colônia Malbec', 'Perfumaria', 199.90),
  (v_boticario, 'Desodorante Colônia Floratta Blue', 'Perfumaria', 149.90),
  (v_boticario, 'Eau de Parfum Lily', 'Perfumaria', 299.90),
  (v_boticario, 'Loção Hidratante Desodorante Corporal Nativa SPA Ameixa', 'Corpo e Banho', 79.90),
  (v_boticario, 'Desodorante Colônia Quasar Classic', 'Perfumaria', 159.90);

  -- Eudora
  INSERT INTO master_products (brand_id, name, category, suggested_price) VALUES
  (v_eudora, 'Combo Siàge Cauterização dos Fios (Shampoo + Condicionador)', 'Cabelos', 89.98),
  (v_eudora, 'Eau de Parfum La Victorie', 'Perfumaria', 259.90),
  (v_eudora, 'Eau de Parfum Impression', 'Perfumaria', 219.90),
  (v_eudora, 'Desodorante Colônia Eudora Rouge', 'Perfumaria', 229.90),
  (v_eudora, 'Batom Líquido Niina Secrets', 'Maquiagem', 49.99);

  -- Mary Kay
  INSERT INTO master_products (brand_id, name, category, suggested_price) VALUES
  (v_marykay, 'Kit Sistema TimeWise 3D', 'Cuidados com a Pele', 339.00),
  (v_marykay, 'Base Líquida Matte TimeWise 3D', 'Maquiagem', 76.90),
  (v_marykay, 'Kit Lábios de Seda Satin Lips', 'Cuidados com a Pele', 89.90),
  (v_marykay, 'Demaquilante para a Área dos Olhos', 'Cuidados com a Pele', 74.90);

  -- Avon
  INSERT INTO master_products (brand_id, name, category, suggested_price) VALUES
  (v_avon, 'Renew Reversalist Creme Facial Dia FPS 25', 'Cuidados com a Pele', 79.90),
  (v_avon, 'Desodorante Colônia Far Away', 'Perfumaria', 89.90),
  (v_avon, 'Desodorante Colônia Musk Marine', 'Perfumaria', 45.90),
  (v_avon, 'Sérum Renovador Renew Clinical', 'Cuidados com a Pele', 119.90);

  -- Jequiti
  INSERT INTO master_products (brand_id, name, category, suggested_price) VALUES
  (v_jequiti, 'Desodorante Colônia Eliana Cristal', 'Perfumaria', 149.90),
  (v_jequiti, 'Desodorante Colônia Celso Portiolli', 'Perfumaria', 129.90),
  (v_jequiti, 'Desodorante Colônia Patricia Abravanel', 'Perfumaria', 139.90);

  -- Hinode
  INSERT INTO master_products (brand_id, name, category, suggested_price) VALUES
  (v_hinode, 'Desodorante Colônia Empire', 'Perfumaria', 189.00),
  (v_hinode, 'Desodorante Colônia Grace Midnight', 'Perfumaria', 175.00),
  (v_hinode, 'Gel Doutorzinho Corps Lignea', 'Corpo e Banho', 69.90);

  -- Tupperware
  INSERT INTO master_products (brand_id, name, category, suggested_price) VALUES
  (v_tupper, 'Eco Tupper Garrafa 500ml', 'Acessórios', 49.90),
  (v_tupper, 'Tigela Sensação 1.8 Litros', 'Casa', 85.90),
  (v_tupper, 'Turbo Chef Super', 'Cozinha', 299.90);
  
  -- WePink
  INSERT INTO master_products (brand_id, name, category, suggested_price) VALUES
  (v_wepink, 'Deo Colônia One Touch', 'Perfumaria', 199.90),
  (v_wepink, 'Body Splash One Touch', 'Corpo e Banho', 99.90),
  (v_wepink, 'Sérum Facial 10 em 1', 'Cuidados com a Pele', 149.90);

  -- Demillus
  INSERT INTO master_products (brand_id, name, category, suggested_price) VALUES
  (v_demillus, 'Sutiã Taça C DeMillus', 'Lingerie', 65.99),
  (v_demillus, 'Calça Cavada DeMillus', 'Lingerie', 25.99),
  (v_demillus, 'Modelador DeMillus', 'Lingerie', 115.90);

  -- QDB
  INSERT INTO master_products (brand_id, name, category, suggested_price) VALUES
  (v_qdb, 'Base Líquida Supermate', 'Maquiagem', 69.90),
  (v_qdb, 'Batom Líquido Supermate', 'Maquiagem', 39.90),
  (v_qdb, 'Máscara de Cílios Escândalo', 'Maquiagem', 49.90);

END $$;
