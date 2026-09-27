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

    const hydrate = async (clearBeforeLoad = true) => {
      if (clearBeforeLoad) clearLocalScope();

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          clearLocalScope();
          window.dispatchEvent(new Event('kostpro:data-scope-changed'));
          return;
        }

        const { data: state, error } = await supabase.rpc('get_property_app_state');
        if (error) {
          throw new Error(error.message || 'Gagal memuat data property.');
        }

        // Property baru belum memiliki app state. Jangan hapus data lokal pengguna;
        // setelah scope account terverifikasi, migrasikan draft lokal ke property ini.
        const hasCloudState =
          state &&
          typeof state === 'object' &&
          Object.keys(state as Record<string, unknown>).some((key) => KEYS.includes(key));

        sessionStorage.setItem('kostpro-active-user', user.id);

        if (hasCloudState) {
          for (const key of KEYS) {
            if (Object.prototype.hasOwnProperty.call(state as Record<string, unknown>, key)) {
              localStorage.setItem(key, JSON.stringify((state as Record<string, unknown>)[key]));
            }
          }
        } else {
          const { data: currentState, error: saveError } = await supabase.rpc('save_property_app_state', {
            p_key: 'kostpro_settings',
            p_value: JSON.parse(localStorage.getItem('kostpro_settings') || '{}'),
          });
          if (saveError) throw new Error(saveError.message || 'Gagal membuat penyimpanan property.');
          for (const key of KEYS) {
            if (key === 'kostpro_settings') continue;
            const raw = localStorage.getItem(key);
            if (raw !== null) {
              const value = JSON.parse(raw);
              const { error: itemError } = await supabase.rpc('save_property_app_state', {
                p_key: key,
                p_value: value,
              });
              if (itemError) throw new Error(itemError.message || 'Gagal menyimpan data property.');
            }
          }
          if (currentState && typeof currentState === 'object') {
            for (const key of KEYS) {
              if (!Object.prototype.hasOwnProperty.call(currentState as Record<string, unknown>, key)) continue;
            }
          }
        }
        sessionStorage.setItem('kostpro-hydrated-user:' + user.id, '1');
        window.dispatchEvent(new Event('kostpro:data-scope-changed'));
      } catch {
        clearLocalScope();
        window.dispatchEvent(new Event('kostpro:data-scope-changed'));
      }
    };

    void hydrate();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearLocalScope();
        window.dispatchEvent(new Event('kostpro:data-scope-changed'));
        return;
      }
      if (event === 'SIGNED_IN') {
        window.setTimeout(() => void hydrate(true), 0);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return null;
}
