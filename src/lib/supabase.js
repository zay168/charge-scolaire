/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SUPABASE CLIENT CONFIGURATION
 * Database connection for Charge Scolaire
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eselmdqdagjzmllagvwx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ap611yRWIxIPW-NRinxU4A_YUVvWiYJ';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// Export configuration for reference
export const config = {
    url: supabaseUrl,
    // Never expose the actual key in logs
    keyPrefix: supabaseAnonKey.substring(0, 20) + '...'
};

export default supabase;
