'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, DoorOpen, Users, Receipt, Wallet, BarChart3, Settings, FileText, Menu, X, ChevronDown } from 'lucide-react';

const items = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/kamar', 'Kamar', DoorOpen],
  ['/penghuni', 'Penghuni Aktif', Users],
  ['/kwitansi', 'Kwitansi', FileText],
  ['/keuangan', 'Keuangan', Wallet],
  ['/laporan', 'Laporan', BarChart3],
  ['/pengaturan', 'Pengaturan', Settings],
] as const;

export default function Sidebar() {
  const p = usePathname();
  const [open, setOpen] = useState(false);
  const [laporanOpen, setLaporanOpen] = useState(p === '/laporan' || p === '/tagihan');

  useEffect(() => {
    setOpen(false);
  }, [p]);

  useEffect(() => {
    if (p === '/laporan' || p === '/tagihan') setLaporanOpen(true);
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
          KOST<span>PRO</span>
          <div className="sub" style={{ color: '#98a2b3' }}>Management System</div>
        </div>
        <nav className="nav">
          {items.map(([href, label, Icon]) => (
            label === 'Laporan' ? (
              <div className="nav-group" key={href}>
                <div className={'nav-parent ' + (p === href || p === '/tagihan' ? 'active' : '')}>
                  <Link className="nav-parent-link" href={href}>
                    <Icon size={17} style={{ verticalAlign: 'middle', marginRight: 10 }} />
                    {label}
                  </Link>
                  <button
                    type="button"
                    className="nav-chevron"
                    aria-label={laporanOpen ? 'Tutup submenu Laporan' : 'Buka submenu Laporan'}
                    aria-expanded={laporanOpen}
                    onClick={() => setLaporanOpen(v => !v)}
                  >
                    <ChevronDown size={16} className={laporanOpen ? 'rotated' : ''} />
                  </button>
                </div>
                {laporanOpen && (
                  <div className="nav-submenu">
                    <Link className={p === '/tagihan' ? 'active' : ''} href="/tagihan">
                      <Receipt size={15} />
                      Tagihan
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
        <div style={{ marginTop: 'auto', padding: '14px 16px 4px', textAlign: 'center', fontSize: 11, color: '#98a2b3', fontWeight: 700, letterSpacing: .5 }}>KOSTPRO • V.1.1</div>
      </aside>
    </>
  );
}
