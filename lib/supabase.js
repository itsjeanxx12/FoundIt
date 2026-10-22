import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './server-config.js';

export function getSupabase() {
  const { url, key } = getSupabaseConfig();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
