import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl.includes('ここに') || !supabaseKey || supabaseKey.includes('ここに')) {
  console.error('Supabaseの接続情報が設定されていません。.env.localファイルを確認してください。')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
