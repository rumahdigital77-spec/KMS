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
    if (!user) return NextResponse.json({ error: 'Login database diperlukan.' }, { status: 401 });
    const { data, error } = await db().from('kost_bookings').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ bookings: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Gagal membaca booking.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const phone = String(body?.phone || '').trim();
    const roomId = String(body?.roomId || '').trim().toUpperCase();
    const startDate = String(body?.startDate || '').trim();
    const duration = String(body?.duration || '1 bulan').trim();
    const allowedDurations = new Set(['1 bulan','3 bulan','6 bulan','12 bulan']);
    if (!name || !phone || !roomId || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json({ error: 'Data booking belum lengkap atau tanggal tidak valid.' }, { status: 400 });
    }
    if (!allowedDurations.has(duration)) return NextResponse.json({ error: 'Durasi booking tidak valid.' }, { status: 400 });

    const client = db();
    const { data: room, error: roomError } = await client.from('kost_rooms').select('*').eq('id', roomId).eq('status','available').maybeSingle();
    if (roomError) throw roomError;
    if (!room) return NextResponse.json({ error: 'Kamar sudah tidak tersedia.' }, { status: 409 });

    const { data: booking, error } = await client.from('kost_bookings').insert({
      room_id: room.id, name, phone, start_date: startDate, duration, status: 'pending'
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ booking, room });
  } catch {
    return NextResponse.json({ error: 'Gagal menyimpan booking.' }, { status: 500 });
  }
}
