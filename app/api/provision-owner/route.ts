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

    // Idempotent provisioning. The unique owner index prevents a second property
    // for the same owner; all related records are upserted to the same property.
    const { data: existing, error: existingError } = await admin
      .from('properties')
      .select('id')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;

    let propertyId = existing?.id as string | undefined;

    if (!propertyId) {
      const { data: inserted, error } = await admin
        .from('properties')
        .insert({
          name: propertyName,
          address: body.p_address?.trim() || null,
          phone: body.p_phone?.trim() || null,
          owner_user_id: user.id
        })
        .select('id')
        .single();
      if (error) {
        // A concurrent request may have won the unique owner race.
        if (error.code !== '23505') throw error;
        const retry = await admin
          .from('properties')
          .select('id')
          .eq('owner_user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (retry.error || !retry.data?.id) throw retry.error || new Error('PROPERTY_CREATE_RACE');
        propertyId = retry.data.id;
      } else {
        propertyId = inserted.id;
      }
    }

    const { error: membershipError } = await admin
      .from('account_properties')
      .upsert(
        { user_id: user.id, property_id: propertyId, role: 'owner' },
        { onConflict: 'user_id,property_id' }
      );
    if (membershipError) throw membershipError;

    const { error: accountError } = await admin
      .from('user_accounts')
      .upsert({
        user_id: user.id,
        email: authEmail,
        full_name: String(body.p_full_name || '').trim() || null,
        property_id: propertyId,
        role: 'owner',
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    if (accountError) throw accountError;

    const { error: licenseError } = await admin
      .from('licenses')
      .upsert({
        user_id: user.id,
        plan: 'standard',
        status: 'active'
      }, { onConflict: 'user_id', ignoreDuplicates: true });
    if (licenseError) throw licenseError;

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
