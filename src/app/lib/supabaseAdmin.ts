import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('SupabaseAdmin: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Using placeholders to prevent crash.');
}

// Create a single instance of the Supabase admin client
// Explicitly typed to ensure usage matches server expectations
export const supabaseAdminClient: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);