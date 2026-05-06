-- ============================================
-- FIX: RLS Policies for Master Catalog tables
-- master_brands and master_products are GLOBAL
-- catalog data (shared across all users).
-- They need open READ access for authenticated users.
-- ============================================

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.master_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_products ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to READ brands and products
CREATE POLICY "Authenticated users can read brands"
    ON public.master_brands FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read products"
    ON public.master_products FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow any authenticated user to INSERT custom brands/products
CREATE POLICY "Authenticated users can insert brands"
    ON public.master_brands FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert products"
    ON public.master_products FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
