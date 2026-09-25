'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, DoorOpen, Users, Receipt, Wallet, BarChart3, Settings, FileText, Camera, Menu, X, UserCircle } from 'lucide-react';
import { createClient } from '../lib/supabase-browser';

const items = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/kamar', 'Kamar', DoorOpen],
  ['/penghuni', 'Penghuni Aktif', Users],
  ['/kwitansi', 'Kwitansi', FileText],
  ['/cctv', 'CCTV', Camera],
  ['/laporan', 'Laporan', BarChart3],
  ['/pengaturan', 'Pengaturan', Settings],
  ['/user', 'User & Database', UserCircle],
] as const;

export default function Sidebar() {
  const p = usePathname();
  const [open, setOpen] = useState(false);
  const [laporanOpen, setLaporanOpen] = useState(false);
  const [logo, setLogo] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    setOpen(false);
    setLaporanOpen(false);
  }, [p]);

  useEffect(() => {
    try {
      const settings = JSON.parse(localStorage.getItem('kostpro_settings') || '{}');
      setLogo(typeof settings.logo === 'string' ? settings.logo : '');
    } catch {
      setLogo('');
    }
    const supabase = createClient();
    supabase.auth.getUser().then((result: { data: { user: { email?: string | null } | null } }) => {
      setUserEmail(result.data.user?.email || '');
    });
  }, []);

  useEffect(() => {
    if (p === '/tagihan' || p === '/keuangan') setLaporanOpen(true);
  }, [p]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="mobile-menu-btn"
        aria-label={open ? 'Tutup menu' : 'Buka menu'}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        {open ? <X size={23} /> : <Menu size={23} />}
      </button>

      {open && <button type="button" className="sidebar-overlay" aria-label="Tutup menu" onClick={() => setOpen(false)} />}

      <aside className={'sidebar ' + (open ? 'sidebar-open' : '')}>
        <div className="brand">
          {logo ? <img src={logo} alt="Logo pemilik" className="brand-logo" /> : <><span>KOST</span><span>PRO</span></>}
          <div className="sub" style={{ color: '#98a2b3' }}>Kost Management System</div>
        </div>
        <nav className="nav">
          {items.map(([href, label, Icon]) => (
            label === 'Laporan' ? (
              <div className="nav-group" key={href}>
                <button
                  type="button"
                  className={'nav-parent-link nav-parent ' + (p === href || p === '/tagihan' || p === '/keuangan' ? 'active' : '')}
                  onClick={() => setLaporanOpen(v => !v)}
                  aria-expanded={laporanOpen}
                >
                  <Icon size={17} style={{ verticalAlign: 'middle', marginRight: 10 }} />
                  {label}
                </button>
                {laporanOpen && (
                  <div className="nav-submenu">
                    <Link className={p === '/tagihan' ? 'active' : ''} href="/tagihan">
                      <Receipt size={15} />
                      Tagihan
                    </Link>
                    <Link className={p === '/keuangan' ? 'active' : ''} href="/keuangan">
                      <Wallet size={15} />
                      Keuangan
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <Link className={p === href ? 'active' : ''} href={href} key={href}>
                <Icon size={17} style={{ verticalAlign: 'middle', marginRight: 10 }} />
                {label}
              </Link>
            )
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '14px 16px 4px', textAlign: 'center', fontSize: 11, color: '#98a2b3', fontWeight: 700, letterSpacing: .5 }}>
          {userEmail ? <div title={userEmail} style={{ marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis' }}>👤 {userEmail}</div> : null}
          KOSTPRO • V.1.4
        </div>
      </aside>
    </>
  );
}
