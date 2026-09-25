import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.json({ error: 'Supabase server environment belum lengkap.' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) return NextResponse.json({ error: 'Auth session missing!' }, { status: 401 });

    const supabase = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Auth session tidak valid. Silakan LOGIN DATABASE.' }, { status: 401 });
    }

    // Owner provisioning is now database-trigger driven. This legacy route is
    // intentionally read-only so it cannot reintroduce the stale RPC/schema-cache path.
    const { data, error } = await supabase
      .from('account_properties')
      .select('property_id')
      .eq('user_id', authData.user.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('provision-owner access check failed:', error);
      return NextResponse.json({ error: 'ACCOUNT_ACCESS_CHECK_FAILED', details: error.message }, { status: 500 });
    }

    if (!data?.property_id) {
      return NextResponse.json({
        error: 'DATABASE_PROVISIONING_PENDING',
        details: 'Account belum memiliki property. Logout/login ulang agar trigger provisioning dijalankan.',
      }, { status: 409 });
    }

    return NextResponse.json({ propertyId: data.property_id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Provisioning server gagal.';
    console.error('provision-owner failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
