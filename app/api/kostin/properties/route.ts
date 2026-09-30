import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const KMS_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://vynsxajbqkgkudfbraog.supabase.co';

const KMS_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  'sb_publishable_0_9DNdvMlgPAebzVzk0HZw_iLlbg7GI';

export async function GET() {
  try {
    const client = createClient(KMS_SUPABASE_URL, KMS_PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await client.rpc('get_kostin_public_properties');

    if (error) {
      return NextResponse.json(
        { source: 'kostpro', properties: [], error: 'KOSTPRO public feed failed' },
        { status: 502 }
      );
    }

    const properties = Array.isArray(data)
      ? data
      : [];

    return NextResponse.json(
      { source: 'kostpro', read_only: true, properties },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );
  } catch {
    return NextResponse.json(
      { source: 'kostpro', properties: [], error: 'KOSTPRO public feed unavailable' },
      { status: 502 }
    );
  }
}
