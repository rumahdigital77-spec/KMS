'use client';

import { supabase } from '@/lib/supabase-browser';

export async function currentPropertyId() {
  const { data, error } = await supabase.rpc('current_property_id');
  if (error) throw error;
  if (!data) throw new Error('Akun belum memiliki properti.');
  return data as string;
}
