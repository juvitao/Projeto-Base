-- ============================================
-- Tabela de conexões WhatsApp (Evolution API)
-- Armazena o vínculo entre user e instance_name
-- ============================================

CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    instance_name TEXT NOT NULL,
    status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting')),
    notification_group_jid TEXT,
    notification_group_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca rápida por user_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_user_id ON public.whatsapp_connections(user_id);

-- RLS obrigatório
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Cada usuário só vê/edita sua própria conexão
CREATE POLICY "Users manage own connection"
    ON public.whatsapp_connections FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admin pode ver todas as conexões (para debug)
CREATE POLICY "Admin reads all connections"
    ON public.whatsapp_connections FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.vora_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
