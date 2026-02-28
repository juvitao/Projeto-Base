-- Configuração Inicial: SaaS de Gestão de Vendas (Assistant)

-- 1. Clientes (CRM)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT, -- CPF/CNPJ
  address JSONB,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  total_purchases NUMERIC(12,2) DEFAULT 0,
  total_debt NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Produtos (Estoque)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  cost_price NUMERIC(12,2) NOT NULL,
  sale_price NUMERIC(12,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Transações Financeiras (Fluxo de Caixa)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  payment_method TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Vendas
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  total NUMERIC(12,2) NOT NULL,
  discount NUMERIC(12,2) DEFAULT 0,
  payment_method TEXT,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Itens da Venda
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL
);

-- 6. Logs de WhatsApp (Integração Gateway)
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  phone TEXT,
  message TEXT,
  command_type TEXT,
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Ativar RLS e Criar Politicas
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Politicas Genéricas (Isolamento por user_id)
CREATE POLICY "Users can only manage their own clients" ON public.clients FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only manage their own products" ON public.products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only manage their own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only manage their own sales" ON public.sales FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only manage their own sale_items" ON public.sale_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.sales WHERE id = sale_id AND user_id = auth.uid())
);
CREATE POLICY "Users can only manage their own whatsapp_logs" ON public.whatsapp_logs FOR ALL USING (auth.uid() = user_id);
