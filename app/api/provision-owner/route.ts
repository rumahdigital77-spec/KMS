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

    if (!url || !anonKey) {
      return NextResponse.json({ error: 'Supabase server environment belum lengkap.' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
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
    if (!authEmail || ownerEmail !== authEmail) {
      return NextResponse.json({ error: 'OWNER_EMAIL_MISMATCH' }, { status: 400 });
    }

    // Do not call the PostgREST RPC. Provisioning is delegated to the
    // Supabase Edge Function to avoid RPC schema-cache resolution failures.
    const edgeResponse = await fetch(`${url}/functions/v1/provision-account`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'bootstrap',
        property_name: propertyName,
        address: body.p_address?.trim() || '',
        phone: body.p_phone?.trim() || '',
        full_name: String(body.p_full_name || '').trim() || null,
      }),
      cache: 'no-store',
    });

    const edgeText = await edgeResponse.text();
    let edgeData: Record<string, unknown>;
    try {
      edgeData = JSON.parse(edgeText);
    } catch {
      edgeData = { error: edgeText || 'Supabase provisioning service returned invalid response.' };
    }

    if (!edgeResponse.ok) {
      const message = typeof edgeData.error === 'string' ? edgeData.error : 'Database provisioning gagal.';
      return NextResponse.json({
        error: message,
        code: typeof edgeData.code === 'string' ? edgeData.code : null,
        details: typeof edgeData.details === 'string' ? edgeData.details : null,
        hint: typeof edgeData.hint === 'string' ? edgeData.hint : null,
      }, { status: edgeResponse.status >= 400 && edgeResponse.status < 600 ? edgeResponse.status : 500 });
    }

    const account = edgeData.account as { property_id?: unknown } | undefined;
    const propertyId = typeof edgeData.propertyId === 'string'
      ? edgeData.propertyId
      : typeof account?.property_id === 'string'
        ? account.property_id
        : null;

    if (!propertyId) {
      return NextResponse.json({ error: 'PROPERTY_ID_NOT_RETURNED' }, { status: 500 });
    }

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
