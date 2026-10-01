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
      const { data: row, error } = await supabase
        .from('property_app_state')
        .select('state')
        .eq('property_id', requestedProperty)
        .maybeSingle();
      if (error) throw error;
      const rooms = normalizeRooms(row?.state?.kostpro_rooms).filter(room => room.status === 'available');
      return NextResponse.json({ rooms });
    }

    const scope = await getAuthenticatedPropertyId(supabase);
    if (!scope.propertyId) return NextResponse.json({ error: scope.error || 'AUTH_REQUIRED' }, { status: 401 });

    // Canonical room data is stored inside the already property-scoped
    // property_app_state JSON. The old kost_rooms table is not used by KOSTPRO.
    const { data: row, error } = await supabase
      .from('property_app_state')
      .select('state')
      .eq('property_id', scope.propertyId)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({ rooms: normalizeRooms(row?.state?.kostpro_rooms) });
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

    const { data: current, error: readError } = await supabase
      .from('property_app_state')
      .select('state')
      .eq('property_id', scope.propertyId)
      .maybeSingle();
    if (readError) throw readError;

    const rooms = normalizeRooms(current?.state?.kostpro_rooms);
    const roomCode = String(room.id).trim().toUpperCase();
    const nextRoom = {
      id: roomCode,
      tenant: room.tenant || '-',
      price: Number(room.price) || 0,
      status: room.status,
      updated_at: new Date().toISOString(),
    };
    const nextRooms = rooms.some(x => x.id === roomCode)
      ? rooms.map(x => x.id === roomCode ? nextRoom : x)
      : [...rooms, nextRoom];

    const state = { ...(current?.state || {}), kostpro_rooms: nextRooms };
    const { error } = await supabase
      .from('property_app_state')
      .upsert({ property_id: scope.propertyId, state, updated_at: new Date().toISOString() }, { onConflict: 'property_id' });
    if (error) throw error;

    return NextResponse.json({ room: nextRoom });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Gagal menyimpan kamar.' }, { status: 500 });
  }
}
