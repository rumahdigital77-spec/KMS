'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, DoorOpen, Receipt, Wallet, BarChart3, Settings, FileText, Camera, Menu, X, UserRound, Users, LogIn, LogOut } from 'lucide-react';
import { loadData } from '@/lib/store';
import { createClient } from '@/lib/supabase-browser';

const items = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/kamar', 'Manajemen Kamar', DoorOpen],
  ['/tagihan', 'Tagihan', Receipt],
  ['/kwitansi', 'Kwitansi', FileText],
  ['/cctv', 'CCTV', Camera],
  ['/laporan', 'Laporan', BarChart3],
  ['/pengaturan', 'Pengaturan', Settings],
  ['/user', 'User & Akses', UserRound],
] as const;

export default function Sidebar() {
  const p = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [laporanOpen, setLaporanOpen] = useState(false);
  const [kamarOpen, setKamarOpen] = useState(false);
  const [ownerLogo, setOwnerLogo] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => { setOpen(false); setLaporanOpen(false); }, [p]);

  useEffect(() => {
    const loadLogo = () => {
      const settings = loadData<Record<string, unknown>>('settings', {});
      setOwnerLogo(typeof settings.logo === 'string' ? settings.logo : '');
    };
    loadLogo();
    window.addEventListener('kostpro:data-saved', loadLogo);
    window.addEventListener('kostpro:data-scope-changed', loadLogo);
    return () => {
      window.removeEventListener('kostpro:data-saved', loadLogo);
      window.removeEventListener('kostpro:data-scope-changed', loadLogo);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (p === '/keuangan') setLaporanOpen(true);
    if (p === '/kamar' || p.startsWith('/kamar/')) setKamarOpen(true);
  }, [p]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleAuth = async () => {
    if (!loggedIn) {
      router.push('/login');
      return;
    }
    setLoggingOut(true);
    const { error } = await createClient().auth.signOut();
    setLoggingOut(false);
    if (error) {
      console.error('Logout gagal:', error);
      return;
    }
    router.push('/login');
  };

  return <>
    <button type="button" className="mobile-menu-btn" aria-label={open ? 'Tutup menu' : 'Buka menu'} aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? <X size={23} /> : <Menu size={23} />}</button>
    {open && <button type="button" className="sidebar-overlay" aria-label="Tutup menu" onClick={() => setOpen(false)} />}
    <aside className={'sidebar ' + (open ? 'sidebar-open' : '')}>
      <div className="brand"><div className="brand-fallback">{ownerLogo ? <img src={ownerLogo} alt="Logo pemilik" style={{ width: 56, height: 40, objectFit: 'contain' }} /> : <><span>KOST</span><span>PRO</span></>}</div><div className="sub" style={{ color: '#98a2b3' }}>Kost Management System</div></div>
      <nav className="nav">{items.map(([href, label, Icon]) => label === 'Manajemen Kamar' ? <div className="nav-group" key={href}>
        <button type="button" className={'nav-parent-link nav-parent ' + (p === href || p.startsWith('/kamar/') ? 'active' : '')} onClick={() => setKamarOpen(v => !v)} aria-expanded={kamarOpen}><Icon size={17} style={{ verticalAlign: 'middle', marginRight: 10 }} />{label}</button>
        {kamarOpen && <div className="nav-submenu">
          <Link className={p === '/kamar/check-in' ? 'active' : ''} href="/kamar/check-in"><UserRound size={15} />C.I Tamu Kamar</Link>
          <Link className={p === '/penghuni' ? 'active' : ''} href="/penghuni"><Users size={15} />Penghuni Aktif</Link>
          <Link className={p === '/kamar/history-tamu' ? 'active' : ''} href="/kamar/history-tamu"><Users size={15} />History Tamu Kamar</Link>
          <Link className={p === '/kamar/status' ? 'active' : ''} href="/kamar/status"><DoorOpen size={15} />Edit Room Status</Link>
        </div>}
      </div> : label === 'Laporan' ? <div className="nav-group" key={href}>
        <button type="button" className={'nav-parent-link nav-parent ' + (p === href || p === '/keuangan' ? 'active' : '')} onClick={() => setLaporanOpen(v => !v)} aria-expanded={laporanOpen}><Icon size={17} style={{ verticalAlign: 'middle', marginRight: 10 }} />{label}</button>
        {laporanOpen && <div className="nav-submenu"><Link className={p === '/keuangan' ? 'active' : ''} href="/keuangan"><Wallet size={15} />Keuangan</Link><Link className={p === '/laporan/bulanan' ? 'active' : ''} href="/laporan/bulanan"><BarChart3 size={15} />History Laporan Bulanan</Link></div>}
      </div> : <Link className={p === href ? 'active' : ''} href={href} key={href}><Icon size={17} style={{ verticalAlign: 'middle', marginRight: 10 }} />{label}</Link>)}</nav>
      <div className="sidebar-owner-footer">
        <button type="button" className="nav-parent-link" onClick={handleAuth} disabled={loggingOut} aria-label={loggedIn ? 'Logout' : 'Login'}>
          {loggedIn ? <LogOut size={17} style={{ verticalAlign: 'middle', marginRight: 10 }} /> : <LogIn size={17} style={{ verticalAlign: 'middle', marginRight: 10 }} />}
          {loggingOut ? 'Logout...' : loggedIn ? 'Logout' : 'Login'}
        </button>
        <div className="sidebar-owner-version"><b>V.1.6</b></div>
      </div>
    </aside>
  </>;
}
// login/logout button follows Supabase auth session
