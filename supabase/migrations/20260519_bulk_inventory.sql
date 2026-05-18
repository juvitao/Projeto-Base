-- ============================================
-- Bulk Inventory Entry - feature "entrada em massa por foto"
-- ============================================
-- 1. Storage bucket privado para fotos de analise
-- 2. RLS no bucket (cada user so acessa sua pasta)
-- 3. RPC bulk_add_to_inventory: insere varios produtos em uma transacao,
--    criando marcas/produtos faltantes como is_custom=true.
-- ============================================

-- 1. BUCKET PRIVADO inventory-photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-photos', 'inventory-photos', false)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS POLICIES no bucket
--    Convencao do path: <auth.uid()>/<uuid>.jpg
--    Usuario so acessa objetos cujo primeiro segmento do path = seu auth.uid()

DROP POLICY IF EXISTS "Users can upload own inventory photos" ON storage.objects;
CREATE POLICY "Users can upload own inventory photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'inventory-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can read own inventory photos" ON storage.objects;
CREATE POLICY "Users can read own inventory photos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'inventory-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can delete own inventory photos" ON storage.objects;
CREATE POLICY "Users can delete own inventory photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'inventory-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 3. RPC bulk_add_to_inventory
--    Recebe um JSONB array de items. Cada item:
--      {
--        brand_id?: uuid,          -- opcional; se nulo, usa brand_name
--        brand_name: string,       -- obrigatorio quando brand_id eh nulo
--        master_product_id?: uuid, -- opcional; se nulo, cria produto novo
--        product_name: string,     -- obrigatorio quando master_product_id eh nulo
--        category?: string,
--        quantity: int,
--        sale_price: numeric,
--        cost_price: numeric,
--        expiration_date?: string
--      }
--    Retorna quantos itens foram inseridos/atualizados.

CREATE OR REPLACE FUNCTION public.bulk_add_to_inventory(p_items JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_item JSONB;
    v_brand_id UUID;
    v_product_id UUID;
    v_quantity INTEGER;
    v_sale_price NUMERIC;
    v_cost_price NUMERIC;
    v_expiration TEXT;
    v_brand_name TEXT;
    v_product_name TEXT;
    v_category TEXT;
    v_existing_id UUID;
    v_count INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado';
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Lista de itens vazia';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        -- Validacao basica por linha
        v_quantity := COALESCE((v_item->>'quantity')::INTEGER, 0);
        v_sale_price := COALESCE((v_item->>'sale_price')::NUMERIC, 0);
        v_cost_price := COALESCE((v_item->>'cost_price')::NUMERIC, 0);
        v_expiration := NULLIF(v_item->>'expiration_date', '');

        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'Quantidade invalida na linha: %', v_item;
        END IF;
        IF v_sale_price <= 0 THEN
            RAISE EXCEPTION 'Preco de venda invalido na linha: %', v_item;
        END IF;

        -- 1) Resolver/criar marca
        v_brand_id := NULLIF(v_item->>'brand_id', '')::UUID;
        IF v_brand_id IS NULL THEN
            v_brand_name := TRIM(v_item->>'brand_name');
            IF v_brand_name IS NULL OR v_brand_name = '' THEN
                RAISE EXCEPTION 'Marca obrigatoria na linha: %', v_item;
            END IF;

            -- Tenta encontrar marca existente por nome (case-insensitive)
            SELECT id INTO v_brand_id
            FROM master_brands
            WHERE LOWER(name) = LOWER(v_brand_name)
            LIMIT 1;

            -- Se nao existe, cria como custom
            IF v_brand_id IS NULL THEN
                INSERT INTO master_brands (name, is_custom)
                VALUES (v_brand_name, true)
                RETURNING id INTO v_brand_id;
            END IF;
        END IF;

        -- 2) Resolver/criar produto
        v_product_id := NULLIF(v_item->>'master_product_id', '')::UUID;
        IF v_product_id IS NULL THEN
            v_product_name := TRIM(v_item->>'product_name');
            v_category := NULLIF(TRIM(v_item->>'category'), '');
            IF v_product_name IS NULL OR v_product_name = '' THEN
                RAISE EXCEPTION 'Nome do produto obrigatorio na linha: %', v_item;
            END IF;

            -- Tenta encontrar produto existente na mesma marca por nome (case-insensitive)
            SELECT id INTO v_product_id
            FROM master_products
            WHERE brand_id = v_brand_id
              AND LOWER(name) = LOWER(v_product_name)
            LIMIT 1;

            -- Se nao existe, cria como custom
            IF v_product_id IS NULL THEN
                INSERT INTO master_products (brand_id, name, category, suggested_price, is_custom)
                VALUES (v_brand_id, v_product_name, v_category, v_sale_price, true)
                RETURNING id INTO v_product_id;
            END IF;
        END IF;

        -- 3) Upsert no inventory (se ja existe esse produto pro user, soma qty)
        SELECT id INTO v_existing_id
        FROM vora_inventory
        WHERE user_id = v_user_id AND master_product_id = v_product_id
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            UPDATE vora_inventory SET
                quantity = quantity + v_quantity,
                cost_price = v_cost_price,
                sale_price = v_sale_price,
                expiration_date = COALESCE(v_expiration, expiration_date),
                updated_at = NOW()
            WHERE id = v_existing_id;
        ELSE
            INSERT INTO vora_inventory (user_id, master_product_id, quantity, cost_price, sale_price, expiration_date)
            VALUES (v_user_id, v_product_id, v_quantity, v_cost_price, v_sale_price, v_expiration);
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- Permite que o frontend (role authenticated) chame a RPC
GRANT EXECUTE ON FUNCTION public.bulk_add_to_inventory(JSONB) TO authenticated;
