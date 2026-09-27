import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = 'https://esuictladytvabpgposc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_OClJFBG70p9dyhTzAy1MrQ_ZuQI1bib';

export function createClient() {
  // Publishable keys are explicitly safe for browser clients.
  // Keep the browser client pinned to the active project key so a stale
  // Vercel NEXT_PUBLIC_SUPABASE_* value cannot break authentication.
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
