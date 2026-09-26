import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthenticatedPropertyId } from '@/lib/supabase-server';

export async function GET(req: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const url = new URL(req.url);
    const publicMode = url.searchParams.get('public') === '1';
    const requestedProperty = url.searchParams.get('property_id');

    if (publicMode) {
      if (!requestedProperty) return NextResponse.json({ error: 'PROPERTY_REQUIRED' }, { status: 400 });
      const { data, error } = await supabase
        .from('kost_rooms')
        .select('id,room_code,price,status,tenant,updated_at')
        .eq('property_id', requestedProperty)
        .eq('status', 'available')
        .order('room_code');
      if (error) throw error;
      return NextResponse.json({
        rooms: (data || []).map(room => ({ id: room.room_code, tenant: room.tenant, price: Number(room.price), status: room.status, updated_at: room.updated_at })),
      });
    }

    const scope = await getAuthenticatedPropertyId(supabase);
    if (!scope.propertyId) return NextResponse.json({ error: scope.error || 'AUTH_REQUIRED' }, { status: 401 });

    const { data, error } = await supabase
      .from('kost_rooms')
      .select('id,room_code,price,status,tenant,updated_at')
      .eq('property_id', scope.propertyId)
      .order('room_code');
    if (error) throw error;

    return NextResponse.json({
      rooms: (data || []).map(room => ({ id: room.room_code, tenant: room.tenant, price: Number(room.price), status: room.status, updated_at: room.updated_at })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Database belum terhubung.' }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const scope = await getAuthenticatedPropertyId(supabase);
    if (!scope.propertyId) return NextResponse.json({ error: scope.error || 'AUTH_REQUIRED' }, { status: 401 });

    const body = await req.json();
    const room = body?.room;
    if (!room?.id || !['available','occupied','maintenance'].includes(room.status)) {
      return NextResponse.json({ error: 'Data kamar tidak valid.' }, { status: 400 });
    }

    const roomCode = String(room.id).trim().toUpperCase();
    const internalId = scope.propertyId + ':' + roomCode;
    const payload = {
      id: internalId,
      property_id: scope.propertyId,
      room_code: roomCode,
      tenant: room.tenant || '-',
      price: Number(room.price) || 0,
      status: room.status,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('kost_rooms')
      .upsert(payload, { onConflict: 'id' })
      .select('id,room_code,price,status,tenant,updated_at')
      .single();
    if (error) throw error;

    return NextResponse.json({ room: { id: data.room_code, tenant: data.tenant, price: Number(data.price), status: data.status, updated_at: data.updated_at } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Gagal menyimpan kamar.' }, { status: 500 });
  }
}
