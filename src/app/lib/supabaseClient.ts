"use client";

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn('SupabaseClient: Missing SUPABASE_URL or SUPABASE_ANON_KEY. Using placeholders to prevent crash.');
}

// Create a single instance of the Supabase client
export const supabaseBrowserClient: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);