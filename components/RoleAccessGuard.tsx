'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

const HYDRATION_READY_KEY = 'kostpro-hydration-ready';
const ACTIVE_USER_KEY = 'kostpro-active-user';

export default function RoleAccessGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // Public/login state: there is no authenticated property to protect.
      if (!user) {
        if (mounted) setReady(true);
        return;
      }

      // Authenticated pages must never render before AccountDataSync has
      // replaced the browser cache with this account's canonical property state.
      if (
        sessionStorage.getItem(ACTIVE_USER_KEY) === user.id &&
        sessionStorage.getItem(HYDRATION_READY_KEY) === '1'
      ) {
        if (mounted) setReady(true);
        return;
      }

      if (mounted) setReady(false);
    };

    void check();
    const onScopeChanged = () => void check();
    window.addEventListener('kostpro:data-scope-changed', onScopeChanged);

    return () => {
      mounted = false;
      window.removeEventListener('kostpro:data-scope-changed', onScopeChanged);
    };
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', fontWeight: 700 }}>
          Memuat property account...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
