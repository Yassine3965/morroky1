
import { createClient } from '@supabase/supabase-js'

let supabaseClient = null;

const getSupabase = () => {
    if (!supabaseClient) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

        console.log('🔄 Initializing Supabase client...');
        console.log('📍 URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
        console.log('🔑 Key:', supabaseKey ? '✅ Found' : '❌ Missing');

        if (!supabaseUrl || !supabaseKey) {
            console.error('💥 Supabase configuration missing!');
            console.error('VITE_SUPABASE_URL:', supabaseUrl);
            console.error('VITE_SUPABASE_KEY:', supabaseKey ? '[HIDDEN]' : 'Missing');
            throw new Error('Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_KEY in your environment variables.')
        }

        supabaseClient = createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase client initialized successfully');
    }
    return supabaseClient;
};

export const supabase = getSupabase();
export { getSupabase };
