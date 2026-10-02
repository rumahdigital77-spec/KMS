import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthenticatedPropertyId } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const scope = await getAuthenticatedPropertyId(supabase);
    if (!scope.propertyId) {
      return NextResponse.json({ error: scope.error || 'AUTH_REQUIRED' }, { status: 401 });
    }

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('name')
      .eq('id', scope.propertyId)
      .maybeSingle();

    if (propertyError) throw propertyError;

    const { data: account, error: accountError } = await supabase
      .from('user_accounts')
      .select('full_name')
      .eq('property_id', scope.propertyId)
      .limit(1)
      .maybeSingle();

    if (accountError) throw accountError;

    return NextResponse.json({
      name: String(property?.name || 'Kost-Pro'),
      owner: String(account?.full_name || ''),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Property belum dapat dibaca.' },
      { status: 503 }
    );
  }
}
