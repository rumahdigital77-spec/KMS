import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function db() {
  if (!url || !key) throw new Error('Supabase environment variables are not configured.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET() {
  try {
    const { data, error } = await db().from('kost_rooms').select('*').order('id');
    if (error) throw error;
    return NextResponse.json({ rooms: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: 'Database belum terhubung.' }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const room = body?.room;
    if (!room?.id || !['available','occupied','maintenance'].includes(room.status)) {
      return NextResponse.json({ error: 'Data kamar tidak valid.' }, { status: 400 });
    }
    const { data, error } = await db().from('kost_rooms').upsert({
      id: room.id, tenant: room.tenant || '-', price: Number(room.price) || 0, status: room.status, updated_at: new Date().toISOString()
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ room: data });
  } catch (e) {
    return NextResponse.json({ error: 'Gagal menyimpan kamar.' }, { status: 500 });
  }
}
