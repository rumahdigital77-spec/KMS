import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthenticatedPropertyId } from '@/lib/supabase-server';

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const scope = await getAuthenticatedPropertyId(supabase);
    if (!scope.propertyId) return NextResponse.json({ error: scope.error || 'AUTH_REQUIRED' }, { status: 401 });

    const { data, error } = await supabase
      .from('kost_bookings')
      .select('*')
      .eq('property_id', scope.propertyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ bookings: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Database belum terhubung.' }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const phone = String(body?.phone || '').trim();
    const roomCode = String(body?.roomId || '').trim().toUpperCase();
    const startDate = String(body?.startDate || '').trim();
    const duration = String(body?.duration || '1 bulan').trim();
    const requestedPropertyId = String(body?.propertyId || '').trim();
    const publicMode = body?.public === true;

    // Logged-in bookings MUST use the property resolved from the authenticated
    // account. Never trust a client-supplied property_id for private booking.
    let propertyId = requestedPropertyId;
    if (!publicMode) {
      const scope = await getAuthenticatedPropertyId(supabase);
      if (!scope.propertyId) {
        return NextResponse.json({ error: scope.error || 'AUTH_REQUIRED' }, { status: 401 });
      }
      propertyId = scope.propertyId;
    }

    if (!name || !phone || !roomCode || !startDate || !propertyId) {
      return NextResponse.json({ error: 'Data booking belum lengkap.' }, { status: 400 });
    }

    const { data: room, error: roomError } = await supabase
      .from('kost_rooms')
      .select('id,room_code,property_id,price,status,tenant')
      .eq('property_id', propertyId)
      .eq('room_code', roomCode)
      .maybeSingle();
    if (roomError) throw roomError;
    if (!room || room.status !== 'available') {
      return NextResponse.json({ error: 'Kamar sudah tidak tersedia.' }, { status: 409 });
    }

    const { data: booking, error } = await supabase.from('kost_bookings').insert({
      property_id: propertyId,
      room_id: room.id,
      name,
      phone,
      start_date: startDate,
      duration,
      status: 'pending',
    }).select().single();
    if (error) throw error;

    const { data: reservedRoom, error: reserveError } = await supabase
      .from('kost_rooms')
      .update({ status: 'reserved', updated_at: new Date().toISOString() })
      .eq('id', room.id)
      .eq('property_id', propertyId)
      .eq('status', 'available')
      .select('id,room_code,price,status,tenant')
      .maybeSingle();
    if (reserveError) throw reserveError;
    if (!reservedRoom) {
      await supabase.from('kost_bookings').delete().eq('id', booking.id).eq('property_id', propertyId);
      return NextResponse.json({ error: 'Kamar baru saja dipesan oleh pengguna lain.' }, { status: 409 });
    }

    return NextResponse.json({ booking, room: { id: reservedRoom.room_code, price: Number(reservedRoom.price), status: reservedRoom.status } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Gagal menyimpan booking.' }, { status: 500 });
  }
}
