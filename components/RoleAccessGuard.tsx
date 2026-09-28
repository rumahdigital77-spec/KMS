'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

type Role = 'owner' | 'admin';

export default function RoleAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) { setAllowed(true); setChecked(true); }
          return;
        }
        const { data: account, error: accountError } = await supabase.from('user_accounts').select('role').eq('user_id', user.id).maybeSingle();
        const role = String(account?.role || '').toLowerCase() as Role;
        const ownerRoute = pathname === '/user' || pathname.startsWith('/user/');
        if (accountError || (ownerRoute && role !== 'owner')) {
          if (!cancelled) { setAllowed(!ownerRoute); setChecked(true); }
          if (ownerRoute) router.replace('/');
          return;
        }
        if (!cancelled) setAllowed(true);
      } catch {
        if (!cancelled) {
          const ownerRoute = pathname === '/user' || pathname.startsWith('/user/');
          setAllowed(!ownerRoute);
          setChecked(true);
          if (ownerRoute) router.replace('/');
        }
        return;
      }
      if (!cancelled) setChecked(true);
    };
    void check();
    return () => { cancelled = true; };
  }, [pathname, router]);

  if (!checked && pathname.startsWith('/user')) return <div className="card" style={{ margin: 24 }}>Memeriksa hak akses...</div>;
  if (pathname.startsWith('/user') && !allowed) return null;
  return <>{children}</>;
}
