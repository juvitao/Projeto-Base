-- ============================================
-- RPC: Deleção atômica de venda com reversão de estoque
-- Resolve race condition de 5 operações separadas no frontend
-- ============================================

CREATE OR REPLACE FUNCTION delete_sale_atomic(
  p_sale_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_sale_owner UUID;
  v_display_id INTEGER;
BEGIN
  -- 1. Verificar que a venda pertence ao usuário e capturar display_id
  SELECT user_id, display_id INTO v_sale_owner, v_display_id 
  FROM vora_sales WHERE id = p_sale_id;
  
  IF v_sale_owner IS NULL THEN
    RAISE EXCEPTION 'SALE_NOT_FOUND: Venda não encontrada.';
  END IF;
  
  IF v_sale_owner != p_user_id THEN
    RAISE EXCEPTION 'ACCESS_DENIED: Você não tem permissão para excluir esta venda.';
  END IF;

  -- 2. Reverter estoque para cada item vinculado ao inventário
  FOR v_item IN 
    SELECT si.product_id, si.quantity AS sold_qty
    FROM vora_sale_items si
    WHERE si.sale_id = p_sale_id
      AND si.product_id IS NOT NULL
  LOOP
    UPDATE vora_inventory 
    SET quantity = quantity + v_item.sold_qty,
        updated_at = now()
    WHERE user_id = p_user_id 
      AND master_product_id = v_item.product_id;
  END LOOP;

  -- 3. Deletar lançamento financeiro ANTES de deletar a venda (precisa do display_id)
  IF v_display_id IS NOT NULL THEN
    DELETE FROM vora_financial_entries 
    WHERE user_id = p_user_id 
      AND description LIKE 'Venda #' || v_display_id::text || ' %';
  END IF;

  -- 4. Deletar recebíveis associados
  DELETE FROM vora_receivables WHERE sale_id = p_sale_id;

  -- 5. Deletar itens da venda
  DELETE FROM vora_sale_items WHERE sale_id = p_sale_id;

  -- 6. Deletar a venda
  DELETE FROM vora_sales WHERE id = p_sale_id;
    
END;
$$;
