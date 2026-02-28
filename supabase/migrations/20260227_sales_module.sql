-- ============================================
-- MÓDULO DE VENDAS — Alterações e RPC
-- ============================================

-- 1. Adicionar colunas faltantes em vora_sales
ALTER TABLE vora_sales ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE vora_sales ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'dinheiro';
ALTER TABLE vora_sales ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0;

-- 2. Adicionar sale_id na tabela de recebíveis (vora_receivables)
ALTER TABLE vora_receivables ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES vora_sales(id) ON DELETE CASCADE;

-- 3. RPC ATÔMICA: Cria venda + itens + recebíveis de uma vez
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
BEGIN
  INSERT INTO vora_sales (user_id, client_id, sale_date, payment_method, discount, total_amount, installments, first_installment_date, paid)
  VALUES (
    p_user_id, p_client_id, p_sale_date::TIMESTAMPTZ, p_payment_method, p_discount, p_total_amount, p_installments,
    CASE WHEN p_first_installment_date IS NOT NULL AND p_first_installment_date != '' THEN p_first_installment_date::TIMESTAMPTZ ELSE NULL END,
    CASE WHEN p_payment_method != 'fiado' THEN TRUE ELSE FALSE END
  )
  RETURNING id INTO v_sale_id;

  v_products_summary := '';
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO vora_sale_items (sale_id, product_id, name, quantity, unit_price, needs_ordering)
    VALUES (
      v_sale_id,
      CASE WHEN v_item->>'product_id' IS NOT NULL AND v_item->>'product_id' != '' THEN (v_item->>'product_id')::UUID ELSE NULL END,
      v_item->>'name', (v_item->>'quantity')::INTEGER, (v_item->>'unit_price')::NUMERIC,
      COALESCE((v_item->>'needs_ordering')::BOOLEAN, FALSE)
    );
    v_products_summary := v_products_summary || v_item->>'name' || ', ';
  END LOOP;
  v_products_summary := RTRIM(v_products_summary, ', ');

  SELECT name INTO v_client_name FROM vora_clients WHERE id = p_client_id;

  IF p_payment_method = 'fiado' AND jsonb_array_length(p_receivables) > 0 THEN
    FOR v_recv IN SELECT * FROM jsonb_array_elements(p_receivables) LOOP
      INSERT INTO vora_receivables (user_id, sale_id, client_name, products, amount_due, due_date, status)
      VALUES (p_user_id, v_sale_id, COALESCE(v_client_name, 'Cliente'), v_products_summary,
        (v_recv->>'amount_due')::NUMERIC, (v_recv->>'due_date')::DATE, 'pending');
    END LOOP;
  END IF;

  IF p_payment_method != 'fiado' THEN
    INSERT INTO vora_financial_entries (user_id, type, category, description, amount, payment_method, entry_date)
    VALUES (p_user_id, 'income', 'venda_produto',
      'Venda #' || (SELECT display_id FROM vora_sales WHERE id = v_sale_id) || ' - ' || COALESCE(v_client_name, 'Avulso'),
      p_total_amount, p_payment_method, p_sale_date::DATE);
  END IF;

  RETURN v_sale_id;
END;
$$;
