'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

const KEYS = [
  'kostpro_settings','kostpro_rooms','kostpro_tenants','kostpro_payments',
  'kostpro_transactions','kostpro_tenantHistory','kostpro_paymentHistory',
  'kostpro_bookings','kostpro_cctv'
];

const ACTIVE_USER_KEY = 'kostpro-active-user';
const PENDING_DRAFT_KEY = 'kostpro-pending-draft';
const HYDRATION_READY_KEY = 'kostpro-hydration-ready';

const clearLocalScope = () => {
  KEYS.forEach(key => localStorage.removeItem(key));
  sessionStorage.removeItem(ACTIVE_USER_KEY);
  sessionStorage.removeItem(PENDING_DRAFT_KEY);
  sessionStorage.removeItem(HYDRATION_READY_KEY);
  sessionStorage.removeItem('kostpro-post-hydration-reload');
  Object.keys(sessionStorage)
    .filter(key => key.startsWith('kostpro-hydrated-user:'))
    .forEach(key => sessionStorage.removeItem(key));
};

const clearLocalDataOnly = () => {
  KEYS.forEach(key => localStorage.removeItem(key));
};

const readLocalSnapshot = () => {
  const snapshot: Record<string, unknown> = {};
  for (const key of KEYS) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      snapshot[key] = JSON.parse(raw);
    } catch {
      // Ignore one malformed local item; the authenticated cloud state remains authoritative.
    }
  }
  return snapshot;
};

export default function AccountDataSync() {
  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    let hydratePromise: Promise<void> | null = null;

    const hydrate = async () => {
      if (hydratePromise) return hydratePromise;

      hydratePromise = (async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          clearLocalScope();
          window.dispatchEvent(new Event('kostpro:data-scope-changed'));
          return;
        }

        // NEVER clear local data before the authenticated property state is read.
        // Doing so used to destroy the only copy of a new property's draft data.
        const { data: state, error } = await supabase.rpc('get_property_app_state');
        if (error) {
          // A transient cloud error must not erase the user's local data.
          window.dispatchEvent(new CustomEvent('kostpro:data-scope-error', {
            detail: { message: error.message || 'Gagal memuat data property.' }
          }));
          window.dispatchEvent(new Event('kostpro:data-scope-changed'));
          return;
        }

        const cloudState =
          state && typeof state === 'object'
            ? state as Record<string, unknown>
            : {};

        const hasCloudState = KEYS.some(key =>
          Object.prototype.hasOwnProperty.call(cloudState, key)
        );

        const activeUser = sessionStorage.getItem(ACTIVE_USER_KEY);
        const pendingDraft = sessionStorage.getItem(PENDING_DRAFT_KEY) === '1';

        if (hasCloudState) {
          // The database is authoritative for an existing property.
          // Clear every local key first so data from another property cannot survive.
          clearLocalDataOnly();
          for (const key of KEYS) {
            if (Object.prototype.hasOwnProperty.call(cloudState, key)) {
              localStorage.setItem(key, JSON.stringify(cloudState[key]));
            }
          }
          sessionStorage.removeItem(PENDING_DRAFT_KEY);
        } else if (pendingDraft && !activeUser) {
          // Only migrate an explicitly marked pre-login draft into a brand-new,
          // authenticated property. Never migrate unmarked data from another user.
          const snapshot = readLocalSnapshot();
          for (const key of KEYS) {
            if (!Object.prototype.hasOwnProperty.call(snapshot, key)) continue;
            const { error: saveError } = await supabase.rpc('save_property_app_state', {
              p_key: key,
              p_value: snapshot[key],
            });
            if (saveError) throw new Error(saveError.message || 'Gagal menyimpan draft ke property.');
          }
          sessionStorage.removeItem(PENDING_DRAFT_KEY);
        }

        sessionStorage.setItem(ACTIVE_USER_KEY, user.id);
        sessionStorage.setItem('kostpro-hydrated-user:' + user.id, '1');
        sessionStorage.setItem(HYDRATION_READY_KEY, '1');
        window.dispatchEvent(new Event('kostpro:data-scope-changed'));

        // React pages read localStorage during their initial mount. They do not
        // all subscribe to the scope event, so after a fresh login they could
        // otherwise remain on the pre-login/default state. Reload exactly once
        // after authenticated hydration; the ready marker prevents a loop.
        if (!sessionStorage.getItem('kostpro-post-hydration-reload')) {
          sessionStorage.setItem('kostpro-post-hydration-reload', '1');
          window.location.reload();
        }
      })().finally(() => {
        hydratePromise = null;
      });

      return hydratePromise;
    };

    void hydrate();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearLocalScope();
        window.dispatchEvent(new Event('kostpro:data-scope-changed'));
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        window.setTimeout(() => void hydrate(), 0);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return null;
}
