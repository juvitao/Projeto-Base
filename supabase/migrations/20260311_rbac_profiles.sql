-- =============================================================
-- RBAC + ABAC: Profiles, Plans, Triggers e RLS
-- =============================================================

-- 1. TABELA DE PLANOS
CREATE TABLE IF NOT EXISTS public.vora_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    features_json JSONB DEFAULT '{}',
    max_clients INTEGER,          -- NULL = ilimitado
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    has_ai_access BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE PERFIS (extensão de auth.users)
CREATE TABLE IF NOT EXISTS public.vora_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'seller' CHECK (role IN ('admin', 'seller')),
    plan_id UUID REFERENCES public.vora_plans(id),
    is_active BOOLEAN DEFAULT true,
    business_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- 3. SEED: Planos Base
-- =============================================================
INSERT INTO public.vora_plans (name, features_json, max_clients, price, has_ai_access) VALUES
    ('Grátis',  '{"crm":true,"stock":true,"sales":true,"financial":true,"dashboard":true,"settings":true,"whatsapp":false,"bulk_import":false}',     15,    0.00,  false),
    ('Pro',     '{"crm":true,"stock":true,"sales":true,"financial":true,"dashboard":true,"settings":true,"whatsapp":true,"bulk_import":true}',      100,   29.90,  false),
    ('Elite',   '{"crm":true,"stock":true,"sales":true,"financial":true,"dashboard":true,"settings":true,"whatsapp":true,"bulk_import":true,"ai_assistant":true}', NULL, 59.90, true)
ON CONFLICT (name) DO NOTHING;

-- =============================================================
-- 4. TRIGGER: Auto-criar profile quando um novo usuario faz signup
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    free_plan_id UUID;
BEGIN
    SELECT id INTO free_plan_id FROM public.vora_plans WHERE name = 'Grátis' LIMIT 1;

    INSERT INTO public.vora_profiles (user_id, role, plan_id, is_active)
    VALUES (NEW.id, 'seller', free_plan_id, true)
    ON CONFLICT (user_id) DO NOTHING;

    -- Sync role to JWT metadata
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) ||
        jsonb_build_object('role', 'seller', 'plan_id', free_plan_id::text)
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- =============================================================
-- 5. TRIGGER: Sync profile changes (role/plan) to JWT metadata
-- =============================================================
CREATE OR REPLACE FUNCTION public.sync_profile_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) ||
        jsonb_build_object('role', NEW.role, 'plan_id', NEW.plan_id::text, 'is_active', NEW.is_active)
    WHERE id = NEW.user_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_updated ON public.vora_profiles;
CREATE TRIGGER on_profile_updated
    AFTER UPDATE ON public.vora_profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_jwt();

-- =============================================================
-- 6. ABAC: Trigger que bloqueia INSERT em vora_clients se limite atingido
-- =============================================================
CREATE OR REPLACE FUNCTION public.check_client_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    current_count INTEGER;
    max_allowed INTEGER;
BEGIN
    -- Contar clientes atuais do usuario
    SELECT COUNT(*) INTO current_count
    FROM public.vora_clients
    WHERE user_id = NEW.user_id;

    -- Buscar limite do plano
    SELECT vp.max_clients INTO max_allowed
    FROM public.vora_profiles prof
    JOIN public.vora_plans vp ON prof.plan_id = vp.id
    WHERE prof.user_id = NEW.user_id;

    -- NULL = ilimitado
    IF max_allowed IS NOT NULL AND current_count >= max_allowed THEN
        RAISE EXCEPTION 'PLAN_LIMIT_REACHED: Limite de % clientes atingido para o seu plano. Faça upgrade!', max_allowed;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_client_limit_trigger ON public.vora_clients;
CREATE TRIGGER check_client_limit_trigger
    BEFORE INSERT ON public.vora_clients
    FOR EACH ROW EXECUTE FUNCTION public.check_client_limit();

-- =============================================================
-- 7. RLS: Proteger vora_profiles e vora_plans
-- =============================================================
ALTER TABLE public.vora_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vora_profiles ENABLE ROW LEVEL SECURITY;

-- Plans: qualquer usuario autenticado pode ler (para exibir info do plano)
CREATE POLICY "Anyone can read plans"
    ON public.vora_plans FOR SELECT
    USING (auth.role() = 'authenticated');

-- Profiles: seller lê apenas o proprio
CREATE POLICY "Sellers can read own profile"
    ON public.vora_profiles FOR SELECT
    USING (auth.uid() = user_id);

-- Profiles: seller pode atualizar apenas campos seguros do proprio perfil
CREATE POLICY "Sellers can update own profile"
    ON public.vora_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND role = (SELECT role FROM public.vora_profiles WHERE user_id = auth.uid())
        AND plan_id = (SELECT plan_id FROM public.vora_profiles WHERE user_id = auth.uid())
    );

-- Profiles: admin pode ler todos os profiles
CREATE POLICY "Admin can read all profiles"
    ON public.vora_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.vora_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Profiles: admin pode atualizar qualquer profile (mudar plano, ativar/desativar)
CREATE POLICY "Admin can update any profile"
    ON public.vora_profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.vora_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Plans: apenas admin pode inserir/atualizar/deletar planos
CREATE POLICY "Admin can manage plans"
    ON public.vora_plans FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.vora_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================================
-- 8. Helper: Funcao para admin buscar contagem de clientes por vendedora
-- =============================================================
CREATE OR REPLACE FUNCTION public.admin_get_seller_stats()
RETURNS TABLE (
    user_id UUID,
    business_name TEXT,
    phone TEXT,
    role TEXT,
    plan_name TEXT,
    is_active BOOLEAN,
    client_count BIGINT,
    sale_count BIGINT,
    total_revenue NUMERIC,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verifica se quem chamou é admin
    IF NOT EXISTS (SELECT 1 FROM public.vora_profiles WHERE vora_profiles.user_id = auth.uid() AND vora_profiles.role = 'admin') THEN
        RAISE EXCEPTION 'ACCESS_DENIED: Apenas administradores podem acessar esta função.';
    END IF;

    RETURN QUERY
    SELECT
        p.user_id,
        p.business_name,
        p.phone,
        p.role,
        pl.name AS plan_name,
        p.is_active,
        COALESCE((SELECT COUNT(*) FROM public.vora_clients c WHERE c.user_id = p.user_id), 0) AS client_count,
        COALESCE((SELECT COUNT(*) FROM public.vora_sales s WHERE s.user_id = p.user_id), 0) AS sale_count,
        COALESCE((SELECT SUM(s.net_amount) FROM public.vora_sales s WHERE s.user_id = p.user_id), 0) AS total_revenue,
        p.created_at
    FROM public.vora_profiles p
    LEFT JOIN public.vora_plans pl ON p.plan_id = pl.id
    WHERE p.role = 'seller'
    ORDER BY p.created_at DESC;
END;
$$;
