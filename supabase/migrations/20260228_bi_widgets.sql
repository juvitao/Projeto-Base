-- ============================================
-- BI WIDGETS + SALES FK FIX
-- ============================================

-- 0. Create Brand and Catalog Products tables (if missing)
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed basic brands
INSERT INTO brands (name) VALUES
('Natura'), ('O Boticário'), ('Eudora'), ('Avon'), ('Mary Kay'), ('Jequiti'), ('Hinode')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS catalog_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. FIX: Drop broken FK on vora_sale_items.product_id
ALTER TABLE vora_sale_items DROP CONSTRAINT IF EXISTS vora_sale_items_product_id_fkey;

-- Re-add FK pointing to catalog_products (nullable)
ALTER TABLE vora_sale_items
  ADD CONSTRAINT vora_sale_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES catalog_products(id) ON DELETE SET NULL;

-- 2. Add payment_date to vora_receivables
ALTER TABLE vora_receivables ADD COLUMN IF NOT EXISTS payment_date DATE;

-- 3. RPC: Top 10 Produtos Mais Vendidos
CREATE OR REPLACE FUNCTION get_top_products(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(product_name TEXT, brand_name TEXT, total_qty BIGINT, total_revenue NUMERIC)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    COALESCE(cp.name, si.name) AS product_name,
    COALESCE(b.name, 'Sem marca') AS brand_name,
    SUM(si.quantity)::BIGINT AS total_qty,
    SUM(si.quantity * si.unit_price) AS total_revenue
  FROM vora_sale_items si
  JOIN vora_sales s ON s.id = si.sale_id
  LEFT JOIN catalog_products cp ON cp.id = si.product_id
  LEFT JOIN brands b ON b.id = cp.brand_id
  WHERE s.user_id = p_user_id
  GROUP BY COALESCE(cp.name, si.name), COALESCE(b.name, 'Sem marca')
  ORDER BY total_qty DESC
  LIMIT p_limit;
$$;

-- 4. RPC: Top 10 Melhores Clientes (pagam em dia)
CREATE OR REPLACE FUNCTION get_top_clients(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(client_id UUID, client_name TEXT, client_phone TEXT, total_paid NUMERIC, on_time_payments BIGINT, total_purchases BIGINT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    c.id AS client_id,
    c.name AS client_name,
    c.phone AS client_phone,
    COALESCE(SUM(s.total_amount), 0) AS total_paid,
    COALESCE(
      (SELECT COUNT(*) FROM vora_receivables r2
       WHERE r2.sale_id IN (SELECT s2.id FROM vora_sales s2 WHERE s2.client_id = c.id AND s2.user_id = p_user_id)
       AND r2.status = 'paid'
       AND (r2.payment_date IS NULL OR r2.payment_date <= r2.due_date)
      ), 0
    ) AS on_time_payments,
    COUNT(s.id) AS total_purchases
  FROM vora_clients c
  JOIN vora_sales s ON s.client_id = c.id AND s.user_id = p_user_id
  GROUP BY c.id, c.name, c.phone
  ORDER BY total_paid DESC
  LIMIT p_limit;
$$;

-- 5. RPC: Top 10 Clientes Inadimplentes
CREATE OR REPLACE FUNCTION get_delinquent_clients(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(client_id UUID, client_name TEXT, client_phone TEXT, overdue_amount NUMERIC, overdue_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    c.id AS client_id,
    c.name AS client_name,
    c.phone AS client_phone,
    COALESCE(SUM(r.amount_due - r.amount_paid), 0) AS overdue_amount,
    COUNT(r.id) AS overdue_count
  FROM vora_receivables r
  JOIN vora_sales s ON s.id = r.sale_id AND s.user_id = p_user_id
  JOIN vora_clients c ON c.id = s.client_id
  WHERE (
    -- Currently overdue (unpaid and past due)
    (r.status != 'paid' AND r.due_date < CURRENT_DATE)
    OR
    -- Historically late (paid after due date)
    (r.status = 'paid' AND r.payment_date IS NOT NULL AND r.payment_date > r.due_date)
  )
  GROUP BY c.id, c.name, c.phone
  HAVING COALESCE(SUM(r.amount_due - r.amount_paid), 0) > 0
  ORDER BY overdue_amount DESC
  LIMIT p_limit;
$$;
