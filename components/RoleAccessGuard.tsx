'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

type Role = 'owner' | 'admin';

export default function RoleAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);\n  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setChecked(true);
          return;
        }
        const { data: account } = await supabase.from('user_accounts').select('role').eq('user_id', user.id).maybeSingle();
        const role = String(account?.role || '').toLowerCase() as Role;
        if (!cancelled && role === 'admin' && (pathname === '/user' || pathname.startsWith('/user/'))) {
          router.replace('/');
          return;
        }
      } catch {}
      if (!cancelled) setChecked(true);
    };
    void check();
    return () => { cancelled = true; };
  }, [pathname, router]);

  if (!checked && pathname.startsWith('/user')) {
    return <div className="card" style={{ margin: 24 }}>Memeriksa hak akses...</div>;
  }
  return <>{children}</>;
}
