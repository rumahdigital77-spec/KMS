'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

const KEYS = [
  'kostpro_settings','kostpro_rooms','kostpro_tenants','kostpro_payments',
  'kostpro_transactions','kostpro_tenantHistory','kostpro_paymentHistory',
  'kostpro_bookings','kostpro_cctv'
];

const clearLocalScope = () => {
  KEYS.forEach(key => localStorage.removeItem(key));
  sessionStorage.removeItem('kostpro-active-user');
  Object.keys(sessionStorage)
    .filter(key => key.startsWith('kostpro-hydrated-user:'))
    .forEach(key => sessionStorage.removeItem(key));
};

export default function AccountDataSync() {
  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      // Keep the application renderable when Supabase runtime configuration is unavailable.
      return;
    }

    const hydrate = async () => {
      clearLocalScope();

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.dispatchEvent(new Event('kostpro:data-scope-changed'));
          return;
        }

        const { data: state, error } = await supabase.rpc('get_property_app_state');
        if (error || !state || typeof state !== 'object') {
          window.dispatchEvent(new Event('kostpro:data-scope-changed'));
          return;
        }

        for (const key of KEYS) {
          if (Object.prototype.hasOwnProperty.call(state, key)) {
            localStorage.setItem(key, JSON.stringify((state as Record<string, unknown>)[key]));
          }
        }

        sessionStorage.setItem('kostpro-active-user', user.id);
        sessionStorage.setItem('kostpro-hydrated-user:' + user.id, '1');
        window.dispatchEvent(new Event('kostpro:data-scope-changed'));
      } catch {
        clearLocalScope();
        window.dispatchEvent(new Event('kostpro:data-scope-changed'));
      }
    };

    void hydrate();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        window.setTimeout(() => void hydrate(), 0);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return null;
}
