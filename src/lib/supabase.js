import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error(
    '[SafeMine] Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. Verifique o arquivo .env'
  )
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder')
