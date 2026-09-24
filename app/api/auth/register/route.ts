import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name || '').trim();
    const username = String(body?.username || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const propertyName = String(body?.propertyName || '').trim();

    if (!name || !username || !password || !propertyName) {
      return NextResponse.json({ error: 'Nama, nama properti, username, dan password wajib diisi.' }, { status: 400 });
    }

    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      return NextResponse.json({ error: 'Username harus 3-32 karakter: huruf kecil, angka, titik, garis bawah, atau tanda minus.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter.' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Konfigurasi Supabase server belum lengkap.' }, { status: 503 });
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = username + '@kms.local';

    const { data: existing } = await admin
      .from('property_users')
      .select('user_id')
      .eq('username', username)
      .maybeSingle();

    if (existing?.user_id) {
      return NextResponse.json({ error: 'Username sudah digunakan.' }, { status: 409 });
    }

    const { data: property, error: propertyError } = await admin
      .from('properties')
      .insert({ name: propertyName })
      .select('id')
      .single();

    if (propertyError || !property) {
      console.error('register property insert failed:', propertyError?.message || 'property insert returned no row');
      return NextResponse.json({ error: propertyError?.message ? `Gagal membuat properti: ${propertyError.message}` : 'Gagal membuat properti.' }, { status: 500 });
    }

    const { data: auth, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, username },
    });

    if (authError || !auth.user) {
      await admin.from('properties').delete().eq('id', property.id);
      return NextResponse.json({ error: authError?.message || 'Gagal membuat akun.' }, { status: 500 });
    }

    const { error: mappingError } = await admin
      .from('property_users')
      .insert({
        user_id: auth.user.id,
        username,
        property_id: property.id,
      });

    if (mappingError) {
      await admin.auth.admin.deleteUser(auth.user.id);
      await admin.from('properties').delete().eq('id', property.id);
      return NextResponse.json({ error: 'Gagal menghubungkan akun dengan properti.' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      propertyId: property.id,
      username,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Permintaan pendaftaran tidak valid.' }, { status: 400 });
  }
}
