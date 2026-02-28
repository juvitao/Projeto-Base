-- ============================================
-- Módulo Financeiro - Tabelas
-- ============================================

-- Tabela de entradas financeiras (receitas e despesas)
CREATE TABLE IF NOT EXISTS vora_financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT,
  card_fee_percent NUMERIC(5,2) DEFAULT 0,
  net_amount NUMERIC(12,2),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de recebíveis (fiados)
CREATE TABLE IF NOT EXISTS vora_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  products TEXT,
  amount_due NUMERIC(12,2) NOT NULL CHECK (amount_due > 0),
  amount_paid NUMERIC(12,2) DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_financial_entries_user ON vora_financial_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_type ON vora_financial_entries(user_id, type);
CREATE INDEX IF NOT EXISTS idx_financial_entries_date ON vora_financial_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_receivables_user ON vora_receivables(user_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON vora_receivables(user_id, status);

-- RLS
ALTER TABLE vora_financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE vora_receivables ENABLE ROW LEVEL SECURITY;

-- Policies: usuário só vê seus próprios dados
CREATE POLICY "Users can view own entries" ON vora_financial_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries" ON vora_financial_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entries" ON vora_financial_entries
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own entries" ON vora_financial_entries
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own receivables" ON vora_receivables
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own receivables" ON vora_receivables
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own receivables" ON vora_receivables
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own receivables" ON vora_receivables
  FOR DELETE USING (auth.uid() = user_id);
