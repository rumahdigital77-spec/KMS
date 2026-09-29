'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, DoorOpen, Receipt, Wallet, BarChart3, Settings, FileText, Camera, Menu, X, UserRound, Users } from 'lucide-react';

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
  const [open, setOpen] = useState(false);
  const [laporanOpen, setLaporanOpen] = useState(false);
  const [kamarOpen, setKamarOpen] = useState(false);

  useEffect(() => { setOpen(false); setLaporanOpen(false); }, [p]);
  useEffect(() => { if (p === '/keuangan') setLaporanOpen(true); if (p === '/kamar' || p.startsWith('/kamar/')) setKamarOpen(true); }, [p]);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);

  return <>
    <button type="button" className="mobile-menu-btn" aria-label={open ? 'Tutup menu' : 'Buka menu'} aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? <X size={23} /> : <Menu size={23} />}</button>
    {open && <button type="button" className="sidebar-overlay" aria-label="Tutup menu" onClick={() => setOpen(false)} />}
    <aside className={'sidebar ' + (open ? 'sidebar-open' : '')}>
      <div className="brand brand-logo-wrap">
        <img
          src="/kostpro-logo.jpg"
          alt="KOSTPRO - Managed Smart Your Property"
          className="brand-kostpro-logo"
        />
      </div>
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
      <div className="sidebar-owner-footer"><div className="sidebar-owner-version"><b>V.1.6</b></div></div>
    </aside>
  </>;
}
