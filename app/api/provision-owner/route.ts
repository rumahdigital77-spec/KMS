import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  p_address?: string | null;
  p_email?: string | null;
  p_full_name?: string | null;
  p_phone?: string | null;
  p_property_name?: string | null;
};

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Supabase server environment belum lengkap.' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Auth session missing!' }, { status: 401 });

    const authClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Auth session tidak valid. Silakan LOGIN DATABASE.' }, { status: 401 });
    }

    const user = authData.user;
    const body = (await req.json()) as Body;
    const propertyName = String(body.p_property_name || '').trim();
    const ownerEmail = String(body.p_email || user.email || '').trim().toLowerCase();
    const authEmail = String(user.email || '').trim().toLowerCase();

    if (!propertyName) return NextResponse.json({ error: 'Nama property wajib diisi.' }, { status: 400 });
    if (!authEmail || ownerEmail !== authEmail) return NextResponse.json({ error: 'OWNER_EMAIL_MISMATCH' }, { status: 400 });

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // IMPORTANT: do not use admin.from(...) here.
    // The REST table endpoint can fail when PostgREST's table schema cache is stale
    // even though the PostgreSQL table exists. The database function executes
    // atomically inside PostgreSQL and therefore avoids that failure mode.
    const { data: propertyId, error: provisioningError } = await admin.rpc(
      'provision_owner_property_server',
      {
        p_user_id: user.id,
        p_address: body.p_address?.trim() || null,
        p_email: ownerEmail,
        p_full_name: String(body.p_full_name || '').trim() || null,
        p_phone: body.p_phone?.trim() || null,
        p_property_name: propertyName
      }
    );

    if (provisioningError) throw provisioningError;
    if (!propertyId) throw new Error('PROPERTY_ID_NOT_RETURNED');
    return NextResponse.json({ propertyId });
  } catch (error) {
    const e = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    const detail = {
      message: typeof e?.message === 'string' ? e.message : null,
      code: typeof e?.code === 'string' ? e.code : null,
      details: typeof e?.details === 'string' ? e.details : null,
      hint: typeof e?.hint === 'string' ? e.hint : null
    };
    const message = detail.message || 'Provisioning server gagal.';
    console.error('provision-owner failed:', JSON.stringify(detail), error);
    return NextResponse.json({ error: message, code: detail.code, details: detail.details, hint: detail.hint }, { status: 500 });
  }
}
