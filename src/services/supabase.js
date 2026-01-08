
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'placeholder-key'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_KEY) {
    console.warn('⚠️ Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_KEY in your environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
