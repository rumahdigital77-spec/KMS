import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function db() {
  if (!url || !key) throw new Error('Supabase environment variables are not configured.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function authenticated(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token || !url || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data } = await client.auth.getUser(token);
  return data.user || null;
}

export async function GET(req: Request) {
  try {
    const user = await authenticated(req);
    const query = db().from('kost_rooms').select('*').order('id');
    const { data, error } = user ? await query : await query.eq('status', 'available');
    if (error) throw error;
    return NextResponse.json({ rooms: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Database belum terhubung.' }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await authenticated(req);
    if (!user) return NextResponse.json({ error: 'Login database diperlukan.' }, { status: 401 });
    const body = await req.json();
    const room = body?.room;
    if (!room?.id || !['available','occupied','maintenance'].includes(room.status)) {
      return NextResponse.json({ error: 'Data kamar tidak valid.' }, { status: 400 });
    }
    const price = Number(room.price);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: 'Harga kamar tidak valid.' }, { status: 400 });
    }
    const { data, error } = await db().from('kost_rooms').upsert({
      id: String(room.id).trim().toUpperCase(),
      tenant: String(room.tenant || '-').trim() || '-',
      price, status: room.status, updated_at: new Date().toISOString()
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ room: data });
  } catch {
    return NextResponse.json({ error: 'Gagal menyimpan kamar.' }, { status: 500 });
  }
}
