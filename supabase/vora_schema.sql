-- 1. Garante que estamos no schema public
SET search_path TO public;

-- TABELA DE CLIENTES VORA
CREATE TABLE IF NOT EXISTS public.vora_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    gender TEXT CHECK (gender IN ('male', 'female')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA DE PRODUTOS (ESTOQUE)
CREATE TABLE IF NOT EXISTS public.vora_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    stock_quantity INTEGER DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA DE VENDAS
CREATE TABLE IF NOT EXISTS public.vora_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id SERIAL, 
    client_id UUID REFERENCES public.vora_clients(id) ON DELETE CASCADE,
    sale_date TIMESTAMPTZ DEFAULT NOW(),
    installments INTEGER DEFAULT 1,
    first_installment_date TIMESTAMPTZ,
    discount DECIMAL(10,2) DEFAULT 0,
    paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ITENS DA VENDA
CREATE TABLE IF NOT EXISTS public.vora_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.vora_sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.vora_products(id),
    name TEXT NOT NULL, 
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL, 
    needs_ordering BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA DE PAGAMENTOS (RECEBIMENTOS)
CREATE TABLE IF NOT EXISTS public.vora_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.vora_clients(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.vora_sales(id) ON DELETE SET NULL, 
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    amount DECIMAL(10,2) NOT NULL,
    method TEXT, 
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DESABILITAR RLS (Para permitir acesso direto do projeto novo sem barreiras iniciais)
ALTER TABLE public.vora_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vora_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vora_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vora_sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vora_payments DISABLE ROW LEVEL SECURITY;

-- TRIGGER PARA ATUALIZAR 'updated_at'
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_vora_clients_updated_at ON public.vora_clients;
CREATE TRIGGER update_vora_clients_updated_at BEFORE UPDATE ON public.vora_clients FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_vora_products_updated_at ON public.vora_products;
CREATE TRIGGER update_vora_products_updated_at BEFORE UPDATE ON public.vora_products FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
