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
    const { data, error } = await db().from('kost_bookings').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ bookings: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Database belum terhubung.' }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const phone = String(body?.phone || '').trim();
    const roomId = String(body?.roomId || '').trim();
    const startDate = String(body?.startDate || '').trim();
    const duration = String(body?.duration || '1 bulan').trim();
    if (!name || !phone || !roomId || !startDate) return NextResponse.json({ error: 'Data booking belum lengkap.' }, { status: 400 });

    const client = db();
    const { data: room, error: roomError } = await client.from('kost_rooms').select('*').eq('id', roomId).maybeSingle();
    if (roomError) throw roomError;
    if (!room || room.status !== 'available') return NextResponse.json({ error: 'Kamar sudah tidak tersedia.' }, { status: 409 });

    const { data: booking, error } = await client.from('kost_bookings').insert({
      room_id: room.id, name, phone, start_date: startDate, duration, status: 'pending'
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ booking, room });
  } catch (e) {
    return NextResponse.json({ error: 'Gagal menyimpan booking.' }, { status: 500 });
  }
}
