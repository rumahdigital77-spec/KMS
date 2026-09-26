'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

const KEYS = [
  'kostpro_settings','kostpro_rooms','kostpro_tenants','kostpro_payments',
  'kostpro_transactions','kostpro_tenantHistory','kostpro_paymentHistory',
  'kostpro_bookings','kostpro_cctv'
];

export default function AccountDataSync() {
  useEffect(() => {
    const supabase = createClient();

    const hydrate = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          KEYS.forEach(key => localStorage.removeItem(key));
          return;
        }

        const { data: state, error } = await supabase.rpc('get_property_app_state');
        if (error || !state || typeof state !== 'object') return;

        for (const key of KEYS) {
          if (Object.prototype.hasOwnProperty.call(state, key)) {
            localStorage.setItem(key, JSON.stringify((state as Record<string, unknown>)[key]));
          }
        }
        window.dispatchEvent(new Event('kostpro:data-synced'));
      } catch {
        // Keep the current local cache if the database is temporarily unavailable.
      }
    };

    void hydrate();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void hydrate(), 0);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return null;
}
