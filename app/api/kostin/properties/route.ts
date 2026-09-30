import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const KMS_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://vynsxajbqkgkudfbraog.supabase.co';
const KMS_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type Room = {
  id?: string;
  price?: number;
  status?: string;
  type?: string;
  room_type?: string;
};

type PropertyState = {
  kostpro_rooms?: Room[];
  kostpro_settings?: {
    logo?: string;
    name?: string;
    address?: string;
    phone?: string;
    manager?: string;
  };
};

export async function GET() {
  if (!KMS_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { source: 'kostpro', properties: [], error: 'KOSTPRO server key is not configured' },
      { status: 503 }
    );
  }

  const admin = createClient(KMS_SUPABASE_URL, KMS_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data, error } = await admin
    .from('properties')
    .select('id,name,address,phone,property_app_state(state)')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json(
      { source: 'kostpro', properties: [], error: 'KOSTPRO read failed' },
      { status: 502 }
    );
  }

  const properties = (data ?? []).map((property: any) => {
    const state = (property.property_app_state?.[0]?.state ?? {}) as PropertyState;
    const settings = state.kostpro_settings ?? {};
    const rooms = Array.isArray(state.kostpro_rooms) ? state.kostpro_rooms : [];

    const availableRooms = rooms
      .filter((room) => String(room.status ?? '').toLowerCase() === 'available')
      .map((room) => ({
        source_room_id: String(room.id ?? ''),
        name: String(room.id ?? 'Kamar'),
        room_type: room.room_type ?? room.type ?? null,
        price_monthly: Number(room.price ?? 0),
        status: 'AVAILABLE'
      }))
      .filter((room) => room.source_room_id);

    return {
      source_property_id: String(property.id),
      name: settings.name || property.name || 'Property',
      city: null,
      address: settings.address || property.address || null,
      cover_url: settings.logo || null,
      facilities: [],
      rooms: availableRooms
    };
  }).filter((property) => property.rooms.length > 0);

  return NextResponse.json(
    { source: 'kostpro', read_only: true, properties },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
}
