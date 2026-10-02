import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthenticatedPropertyId } from '@/lib/supabase-server';

function normalizeRooms(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((room: any) => ({
    id: String(room?.id ?? room?.room_code ?? ''),
    tenant: String(room?.tenant ?? '-'),
    price: Number(room?.price ?? 0),
    status: ['available','occupied','reserved','maintenance'].includes(room?.status) ? room.status : 'available',
    updated_at: room?.updated_at,
  })).filter(room => room.id);
}

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const url = new URL(req.url);
    const publicMode = url.searchParams.get('public') === '1';
    const requestedProperty = url.searchParams.get('property_id');

    if (publicMode) {
      if (!requestedProperty) return NextResponse.json({ error: 'PROPERTY_REQUIRED' }, { status: 400 });
      const { data, error } = await supabase.rpc('get_public_available_rooms', { p_property_id: requestedProperty });
      if (error) throw error;
      return NextResponse.json({ rooms: normalizeRooms(data) });
    }

    const scope = await getAuthenticatedPropertyId(supabase);
    if (!scope.propertyId) return NextResponse.json({ error: scope.error || 'AUTH_REQUIRED' }, { status: 401 });

    const { data: propertyRow, error: propertyError } = await supabase
      .from('properties')
      .select('id,name')
      .eq('id', scope.propertyId)
      .maybeSingle();
    if (propertyError) throw propertyError;

    // LIVE ROOM SOURCE: canonical cloud state is property-scoped by the RPC using auth.uid().
    const { data, error } = await supabase.rpc('get_property_app_state');
    if (error) throw error;

    const state = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    return NextResponse.json({
      property_id: scope.propertyId,
      property_name: String(propertyRow?.name || ''),
      rooms: normalizeRooms(state.kostpro_rooms),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Database belum terhubung.' }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const scope = await getAuthenticatedPropertyId(supabase);
    if (!scope.propertyId) return NextResponse.json({ error: scope.error || 'AUTH_REQUIRED' }, { status: 401 });

    const body = await req.json();
    const room = body?.room;
    if (!room?.id || !['available','occupied','reserved','maintenance'].includes(room.status)) {
      return NextResponse.json({ error: 'Data kamar tidak valid.' }, { status: 400 });
    }

    const { data: cloudState, error: readError } = await supabase.rpc('get_property_app_state');
    if (readError) throw readError;
    const state = cloudState && typeof cloudState === 'object' ? cloudState as Record<string, unknown> : {};
    const rooms = normalizeRooms(state.kostpro_rooms);
    const roomCode = String(room.id).trim().toUpperCase();
    const currentRoom = rooms.find((x) => x.id === roomCode);
    const bookings = Array.isArray(state.kostpro_bookings) ? state.kostpro_bookings : [];
    const activeBooking = bookings.find((booking) =>
      String(booking?.room_id ?? '').trim().toUpperCase() === roomCode &&
      ['PENDING', 'CONFIRMED'].includes(String(booking?.status ?? '').toUpperCase())
    );
    const activeTenant = Array.isArray(state.kostpro_tenants)
      ? state.kostpro_tenants.some((tenant) =>
          String(tenant?.room ?? '').trim().toLowerCase().replace(/^kamar\s+/i, '') ===
          roomCode.toLowerCase().replace(/^kamar\s+/i, '') &&
          !['history', 'inactive', 'checkout', 'checked_out'].includes(String(tenant?.status ?? 'active').trim().toLowerCase())
        )
      : false;

    if ((room.status === 'available' || room.status === 'maintenance') && (activeBooking || activeTenant)) {
      return NextResponse.json({ error: 'ROOM_LOCKED_BY_ACTIVE_BOOKING_OR_TENANT' }, { status: 409 });
    }

    const nextRoom = {
      id: roomCode,
      tenant: room.tenant || (currentRoom?.tenant ?? '-'),
      price: Number(room.price) || 0,
      status: room.status,
      updated_at: new Date().toISOString()
    };
    const nextRooms = rooms.some(x => x.id === roomCode) ? rooms.map(x => x.id === roomCode ? nextRoom : x) : [...rooms, nextRoom];

    const { error } = await supabase.rpc('save_property_app_state', { p_key: 'kostpro_rooms', p_value: nextRooms });
    if (error) throw error;
    return NextResponse.json({ room: nextRoom });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Gagal menyimpan kamar.' }, { status: 500 });
  }
}
