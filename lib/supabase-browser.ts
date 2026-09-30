import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = 'https://jpgqjadvecvuyximqbxw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_vnHiU80dCYCDqLmK9RR6jA_LzQBqZnU';

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
