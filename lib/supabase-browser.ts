import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = 'https://vynsxajbqkgkudfbraog.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_0_9DNdvMlgPAebzVzk0HZw_iLlbg7GI';

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
