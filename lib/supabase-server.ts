import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  // Production fallback must match the browser client while Vercel envs are repaired.
  // Publishable/anon keys are safe for the client; never use service_role here.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vynsxajbqkgkudfbraog.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_0_9DNdvMlgPAebzVzk0HZw_iLlbg7GI';

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Cookie writes can be unavailable in some server render contexts.
        }
      },
    },
  });
}

export async function getAuthenticatedPropertyId(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { user: null, propertyId: null, error: userError?.message || 'AUTH_REQUIRED' };

  const { data: account, error } = await supabase
    .from('user_accounts')
    .select('property_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return { user, propertyId: null, error: error.message };
  if (!account?.property_id) return { user, propertyId: null, error: 'PROPERTY_NOT_FOUND' };
  return { user, propertyId: account.property_id, error: null };
}
