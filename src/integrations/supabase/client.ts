import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

console.log("🔗 Verificando conexão Supabase...");
console.log("URL:", import.meta.env.VITE_SUPABASE_URL);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error("❌ Erro: Variáveis do Supabase não encontradas no .env");
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});