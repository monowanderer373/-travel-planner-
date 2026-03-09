import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function isValidSupabaseUrl(u) {
  if (typeof u !== 'string' || !u.trim()) return false;
  try {
    const parsed = new URL(u.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

let supabaseInstance = null;
if (url && anonKey && isValidSupabaseUrl(url)) {
  try {
    supabaseInstance = createClient(url.trim(), anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch {
    supabaseInstance = null;
  }
}

/** Supabase client. Null if env vars are missing/invalid (app uses localStorage only). */
export const supabase = supabaseInstance;

export const hasSupabase = () => !!supabase;
