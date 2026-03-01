-- ============================================
-- 1. ADD COST PRICE TO SALE ITEMS
-- ============================================
ALTER TABLE vora_sale_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2) DEFAULT 0;

-- ============================================
-- 2. UPDATE RPC TO INCLUDE INVENTORY DEDUCTION
-- ============================================

CREATE OR REPLACE FUNCTION create_sale_with_receivables(
  p_user_id UUID,
  p_client_id UUID,
  p_sale_date TEXT,
  p_payment_method TEXT,
  p_discount NUMERIC,
  p_total_amount NUMERIC,
  p_installments INTEGER,
  p_first_installment_date TEXT,
  p_items JSONB,
  p_receivables JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
  v_recv JSONB;
  v_client_name TEXT;
  v_products_summary TEXT;
  
  -- Para controle de estoque
  v_inventory_id UUID;
  v_item_name TEXT;
  v_sold_qty INTEGER;
  v_stock_qty INTEGER;
  v_cost_price NUMERIC;
BEGIN
  INSERT INTO vora_sales (user_id, client_id, sale_date, payment_method, discount, total_amount, installments, first_installment_date, paid)
  VALUES (
    p_user_id, p_client_id, p_sale_date::TIMESTAMPTZ, p_payment_method, p_discount, p_total_amount, p_installments,
    CASE WHEN p_first_installment_date IS NOT NULL AND p_first_installment_date != '' THEN p_first_installment_date::TIMESTAMPTZ ELSE NULL END,
    CASE WHEN p_payment_method != 'fiado' THEN TRUE ELSE FALSE END
  )
  RETURNING id INTO v_sale_id;

  v_products_summary := '';
  
  -- 1. Process items and deduct inventory
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_item_name := (v_item->>'name');
    v_sold_qty := ((v_item->>'quantity')::INTEGER);
    v_inventory_id := CASE WHEN (v_item->>'inventory_id') IS NOT NULL AND (v_item->>'inventory_id') != '' THEN (v_item->>'inventory_id')::UUID ELSE NULL END;
    v_cost_price := 0;

    -- Se estiver vinculado ao estoque, vamos dar baixa
    IF v_inventory_id IS NOT NULL THEN
      -- Pega a quantidade atual e o preco de custo
      SELECT quantity, cost_price INTO v_stock_qty, v_cost_price 
      FROM vora_inventory 
      WHERE id = v_inventory_id FOR UPDATE; -- Lock na linha para evitar condição de corrida

      -- Verifica se tem estoque suficiente
      IF v_stock_qty < v_sold_qty THEN
        RAISE EXCEPTION 'Estoque insuficiente para o item: % (disponível: %)', v_item_name, v_stock_qty;
      END IF;

      -- Debita o estoque
      UPDATE vora_inventory SET quantity = quantity - v_sold_qty WHERE id = v_inventory_id;
    END IF;

    -- Insere o item na venda com o preço de custo salvo
    INSERT INTO vora_sale_items (sale_id, product_id, name, quantity, unit_price, cost_price, needs_ordering)
    VALUES (
      v_sale_id,
      CASE WHEN (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') != '' THEN (v_item->>'product_id')::UUID ELSE NULL END,
      v_item_name, v_sold_qty, ((v_item->>'unit_price')::NUMERIC), v_cost_price,
      COALESCE(((v_item->>'needs_ordering')::BOOLEAN), FALSE)
    );
    
    v_products_summary := v_products_summary || v_item_name || ', ';
  END LOOP;
  v_products_summary := RTRIM(v_products_summary, ', ');

  SELECT name INTO v_client_name FROM vora_clients WHERE id = p_client_id;

  -- 2. Criação de Recebíveis Fiado
  IF p_payment_method = 'fiado' AND jsonb_array_length(p_receivables) > 0 THEN
    FOR v_recv IN SELECT * FROM jsonb_array_elements(p_receivables) LOOP
      INSERT INTO vora_receivables (user_id, sale_id, client_name, products, amount_due, due_date, status)
      VALUES (p_user_id, v_sale_id, COALESCE(v_client_name, 'Cliente'), v_products_summary,
        ((v_recv->>'amount_due')::NUMERIC), ((v_recv->>'due_date')::DATE), 'pending');
    END LOOP;
  END IF;

  -- 3. Criação de Título Receita (Pagamentos a vista)
  IF p_payment_method != 'fiado' THEN
    INSERT INTO vora_financial_entries (user_id, type, category, description, amount, payment_method, entry_date)
    VALUES (p_user_id, 'income', 'venda_produto',
      'Venda #' || (SELECT display_id::text FROM vora_sales WHERE id = v_sale_id) || ' - ' || COALESCE(v_client_name, 'Avulso'),
      p_total_amount, p_payment_method, p_sale_date::DATE);
  END IF;

  RETURN v_sale_id;
END;
$$;
