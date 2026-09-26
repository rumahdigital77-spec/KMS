'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { clearActivePropertyScope, setActivePropertyScope } from '@/lib/store';

export default function PropertySessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    let alive = true;

    const resolve = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          clearActivePropertyScope();
          if (alive) setReady(true);
          return;
        }

        const [{ data: profile }, { data: memberships }] = await Promise.all([
          supabase.from('user_accounts').select('property_id').eq('user_id', user.id).maybeSingle(),
          supabase.from('account_properties').select('property_id,role').eq('user_id', user.id),
        ]);

        if (!alive) return;
        const propertyId = profile?.property_id || memberships?.[0]?.property_id || null;
        if (propertyId) {
          setActivePropertyScope(user.id, propertyId);
        } else {
          clearActivePropertyScope();
        }
        setReady(true);
      } catch {
        clearActivePropertyScope();
        if (alive) setReady(true);
      }
    };

    void resolve();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void resolve();
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [pathname]);

  const publicRoute = pathname === '/booking' || pathname.startsWith('/booking/');

  if (!ready && !publicRoute) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}><div className="card">Memuat sesi dan property...</div></div>;
  }

  return <>{children}</>;
}
