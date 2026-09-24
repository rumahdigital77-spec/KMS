'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, DoorOpen, Users, Receipt, Wallet, BarChart3, Settings, FileText, History, Menu, X } from 'lucide-react';

const items = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/kamar', 'Kamar', DoorOpen],
  ['/penghuni', 'Penghuni Aktif', Users],
  ['/penghuni/history', 'History Tamu', History],
  ['/tagihan', 'Tagihan', Receipt],
  ['/kwitansi', 'Kwitansi', FileText],
  ['/keuangan', 'Keuangan', Wallet],
  ['/laporan', 'Laporan', BarChart3],
  ['/pengaturan', 'Pengaturan', Settings],
] as const;

export default function Sidebar() {
  const p = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
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
            <Link className={p === href ? 'active' : ''} href={href} key={href}>
              <Icon size={17} style={{ verticalAlign: 'middle', marginRight: 10 }} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
