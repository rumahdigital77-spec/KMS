'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowUpRight, BedDouble, CalendarCheck,
  ChevronRight, DoorOpen, FileText, ReceiptText, Sparkles, Users, WalletCards
} from 'lucide-react';
import AdminLoginButton from '@/components/AdminLoginButton';
import {
  defaultPayments, defaultRooms, defaultTenants, defaultTransactions,
  loadData, money, Payment, Room, Tenant, Transaction
} from '@/lib/store';

const statusMeta = {
  occupied: { label: 'Terisi', icon: BedDouble, cls: 'dash-status-occupied' },
  available: { label: 'Tersedia', icon: DoorOpen, cls: 'dash-status-available' },
  reserved: { label: 'Reservasi', icon: CalendarCheck, cls: 'dash-status-reserved' },
  maintenance: { label: 'Maintenance', icon: Activity, cls: 'dash-status-maintenance' },
} as const;

type CctvItem = { id:string; name:string; location:string; url:string; showOnDashboard:boolean };

function formatDate(value:string) {
  if (!value) return '-';
  return new Date(value + 'T00:00:00').toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
}

export default function Dashboard() {
  const [rooms, setRooms] = useState<Room[]>(defaultRooms);
  const [payments, setPayments] = useState<Payment[]>(defaultPayments);
  const [transactions, setTransactions] = useState<Transaction[]>(defaultTransactions);
  const [tenants, setTenants] = useState<Tenant[]>(defaultTenants);
  const [owner, setOwner] = useState('');
  const [property, setProperty] = useState('Kost-Pro');
  const [cctv, setCctv] = useState<CctvItem[]>([]);

  const loadDashboard = () => {
    setRooms(loadData('rooms', defaultRooms));
    setPayments(loadData('payments', defaultPayments));
    setTransactions(loadData('transactions', defaultTransactions));
    setTenants(loadData('tenants', defaultTenants).filter(x => (x.status || 'active') === 'active'));
    try {
      const settings = loadData<Record<string, unknown>>('settings', {});
      setOwner(String(settings.ownerName || settings.manager || ''));
      setProperty(String(settings.name || settings.propertyName || 'Kost-Pro'));
    } catch {}
    try {
      const raw = localStorage.getItem('kostpro_cctv');
      const data = raw ? JSON.parse(raw) : [];
      setCctv(Array.isArray(data)
        ? data.filter((x:any) => x && x.showOnDashboard && typeof x.url === 'string')
          .map((x:any) => ({ id:String(x.id || ''), name:String(x.name || 'CCTV'), location:String(x.location || ''), url:x.url, showOnDashboard:Boolean(x.showOnDashboard) }))
        : []);
    } catch { setCctv([]); }
  };

  useEffect(() => {
    loadDashboard();
    const refresh = () => loadDashboard();
    window.addEventListener('kostpro:data-saved', refresh);
    window.addEventListener('kostpro:data-scope-changed', refresh);
    return () => {
      window.removeEventListener('kostpro:data-saved', refresh);
      window.removeEventListener('kostpro:data-scope-changed', refresh);
    };
  }, []);

  const occupied = rooms.filter(x => x.status === 'occupied').length;
  const available = rooms.filter(x => x.status === 'available').length;
  const reserved = rooms.filter(x => x.status === 'reserved').length;
  const maintenance = rooms.filter(x => x.status === 'maintenance').length;
  const occupancy = rooms.length ? Math.round((occupied / rooms.length) * 100) : 0;
  const income = transactions.filter(x => x.type === 'income').reduce((sum, x) => sum + x.amount, 0);
  const expense = transactions.filter(x => x.type === 'expense').reduce((sum, x) => sum + x.amount, 0);
  const cashNet = income - expense;
  const unpaid = payments.filter(x => x.status !== 'paid').reduce((sum, x) => sum + x.amount, 0);
  const paidCount = payments.filter(x => x.status === 'paid').length;

  const monthlyBars = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = d.toLocaleDateString('id-ID', { month:'short' });
      const month = d.toLocaleDateString('id-ID', { month:'long', year:'numeric' });
      const value = transactions.filter(x => x.type === 'income' && x.date.slice(0,7) === d.toISOString().slice(0,7)).reduce((s,x) => s + x.amount, 0);
      return { key, month, value };
    });
  }, [transactions]);
  const maxBar = Math.max(...monthlyBars.map(x => x.value), 1);

  const recentTenants = tenants.slice().sort((a,b) => String(b.startDate).localeCompare(String(a.startDate))).slice(0,5);
  const recentPayments = payments.slice().sort((a,b) => String(b.paidAt || '').localeCompare(String(a.paidAt || ''))).slice(0,5);

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <div className="title">Dashboard</div>
          <div className="sub">Ringkasan operasional {property}{owner ? ' · dikelola '+owner : ''}</div>
        </div>
        <div className="dashboard-heading-actions">
          <AdminLoginButton />
        </div>
      </div>

      <section className="dashboard-hero dashboard-hero-property-bg">
        <div className="dashboard-hero-glow"/>
        <div className="dashboard-hero-copy">
          <div className="dashboard-hero-kicker">KOSTPRO MANAGEMENT SYSTEM</div>
          <h1>{property}</h1>
          <p>Kelola kamar, penghuni, billing, pembayaran, dan aktivitas property dari satu dashboard.</p>
          <div className="dashboard-hero-pills">
            <span><Activity size={14}/> {occupancy}% okupansi</span>
            <span><ReceiptText size={14}/> {money(unpaid)} piutang aktif</span>
            <span><BedDouble size={14}/> {occupied} kamar terisi</span>
          </div>
        </div>
      
      </section>

      <section className="dashboard-kpis">
        <Link href="/kamar" className="dashboard-kpi kpi-blue">
          <span className="dashboard-kpi-icon"><DoorOpen size={21}/></span>
          <span className="dashboard-kpi-label">Total Kamar</span>
          <strong>{rooms.length}</strong>
          <small>{available} tersedia sekarang</small>
          <ChevronRight size={17} className="dashboard-kpi-arrow"/>
        </Link>
        <Link href="/penghuni" className="dashboard-kpi kpi-green">
          <span className="dashboard-kpi-icon"><BedDouble size={21}/></span>
          <span className="dashboard-kpi-label">Kamar Terisi</span>
          <strong>{occupied}</strong>
          <small>{occupancy}% tingkat okupansi</small>
          <ChevronRight size={17} className="dashboard-kpi-arrow"/>
        </Link>
        <Link href="/tagihan" className="dashboard-kpi kpi-purple">
          <span className="dashboard-kpi-icon"><CalendarCheck size={21}/></span>
          <span className="dashboard-kpi-label">Reservasi</span>
          <strong>{reserved}</strong>
          <small>{maintenance} kamar maintenance</small>
          <ChevronRight size={17} className="dashboard-kpi-arrow"/>
        </Link>
        <Link href="/keuangan" className="dashboard-kpi kpi-gold">
          <span className="dashboard-kpi-icon"><WalletCards size={21}/></span>
          <span className="dashboard-kpi-label">Pendapatan Masuk</span>
          <strong>{money(income)}</strong>
          <small>{paidCount} transaksi lunas</small>
          <ChevronRight size={17} className="dashboard-kpi-arrow"/>
        </Link>
      </section>

      <section className="dashboard-main-grid">
        <div className="card dashboard-room-card">
          <div className="dashboard-card-head">
            <div><div className="section-title">Status Kamar</div><div className="sub">Kondisi unit property saat ini</div></div>
            <Link href="/kamar/status" className="dashboard-link">Kelola <ChevronRight size={15}/></Link>
          </div>
          <div className="dashboard-status-summary">
            {(Object.keys(statusMeta) as Array<keyof typeof statusMeta>).map(key => {
              const Meta = statusMeta[key];
              const count = key === 'occupied' ? occupied : key === 'available' ? available : key === 'reserved' ? reserved : maintenance;
              return <div className={'dashboard-status-chip '+Meta.cls} key={key}><Meta.icon size={15}/><b>{count}</b><span>{Meta.label}</span></div>;
            })}
          </div>
          <div className="dashboard-room-grid">
            {rooms.map(room => {
              const Meta = statusMeta[room.status];
              return <Link key={room.id} href={'/kamar?room='+encodeURIComponent(room.id)} className={'dashboard-room-tile '+Meta.cls}>
                <div className="dashboard-room-top"><span>{room.id}</span><Meta.icon size={17}/></div>
                <b>{room.status === 'occupied' ? (room.tenant === '-' ? 'Terisi' : room.tenant) : Meta.label}</b>
                <small>{money(room.price)}</small>
              </Link>;
            })}
            {!rooms.length && <div className="dashboard-empty">Belum ada kamar. Tambahkan kamar di Manajemen Kamar.</div>}
          </div>
        </div>

        <div className="card dashboard-occupancy-card">
          <div className="dashboard-card-head">
            <div><div className="section-title">Occupancy Overview</div><div className="sub">Komposisi status kamar</div></div>
          </div>
          <div className="dashboard-ring-wrap">
            <div className="dashboard-ring" style={{ ['--ring' as string]: occupancy*3.6+'deg' }}><div><strong>{occupancy}%</strong><span>Occupied</span></div></div>
            <div className="dashboard-ring-legend">
              <div><i className="legend-dot dot-green"/><span>Terisi</span><b>{occupied}</b></div>
              <div><i className="legend-dot dot-blue"/><span>Tersedia</span><b>{available}</b></div>
              <div><i className="legend-dot dot-purple"/><span>Reservasi</span><b>{reserved}</b></div>
              <div><i className="legend-dot dot-amber"/><span>Maintenance</span><b>{maintenance}</b></div>
            </div>
          </div>
          <div className="dashboard-occupancy-note"><Activity size={15}/> {rooms.length ? 'Sebanyak '+occupied+' dari '+rooms.length+' unit sedang menghasilkan okupansi.' : 'Tambahkan unit untuk mulai memantau okupansi.'}</div>
        </div>
      </section>

      <section className="dashboard-finance-grid">
        <div className="card dashboard-finance-card">
          <div className="dashboard-card-head">
            <div><div className="section-title">Financial Overview</div><div className="sub">Arus transaksi property</div></div>
            <Link href="/keuangan" className="dashboard-link">Lihat laporan <ChevronRight size={15}/></Link>
          </div>
          <div className="dashboard-finance-metrics">
            <div><span><ArrowUpRight size={15}/> Pendapatan</span><b>{money(income)}</b></div>
            <div><span><ArrowDownRight size={15}/> Pengeluaran</span><b>{money(expense)}</b></div>
            <div><span><WalletCards size={15}/> Total</span><b>{money(cashNet)}</b></div>
          </div>
          <div className="dashboard-bars">
            {monthlyBars.map(item => <div className="dashboard-bar-col" key={item.key} title={item.month+' · '+money(item.value)}><div className="dashboard-bar-value">{item.value ? money(item.value).replace('Rp','').trim() : '-'}</div><div className="dashboard-bar" style={{ height: Math.max(8, Math.round((item.value/maxBar)*120)) }}/><span>{item.key}</span></div>)}
          </div>
        </div>

        <div className="card dashboard-unpaid-card">
          <div className="dashboard-card-head">
            <div><div className="section-title">Billing Snapshot</div><div className="sub">Tagihan yang masih terbuka</div></div>
            <Link href="/tagihan" className="dashboard-link">Buka <ChevronRight size={15}/></Link>
          </div>
          <div className="dashboard-billing-total"><span>Total Billing / Piutang</span><strong>{money(unpaid)}</strong></div>
          <div className="dashboard-payment-list">
            {payments.slice(0,5).map(item => <div className="dashboard-payment-row" key={item.id}>
              <div><b>{item.tenant}</b><span>{item.room} · {item.month}</span></div>
              <div><strong>{money(item.amount)}</strong><span className={'badge '+(item.status === 'paid' ? 'green' : 'red')}>{item.status === 'paid' ? 'Lunas' : 'Belum Bayar'}</span></div>
            </div>)}
            {!payments.length && <div className="dashboard-empty">Belum ada billing aktif.</div>}
          </div>
        </div>
      </section>

      <section className="dashboard-bottom-grid">
        <div className="card">
          <div className="dashboard-card-head">
            <div><div className="section-title">Penghuni Aktif</div><div className="sub">Tamu yang sedang menempati kamar</div></div>
            <Link href="/penghuni" className="dashboard-link">Semua <ChevronRight size={15}/></Link>
          </div>
          <div className="dashboard-tenant-list">
            {recentTenants.map(item => <Link href="/penghuni" className="dashboard-tenant-row" key={item.id}>
              <span className="dashboard-avatar">{item.name.slice(0,1).toUpperCase()}</span>
              <span><b>{item.name}</b><small>{item.room} · mulai {formatDate(item.startDate)}</small></span>
              <ChevronRight size={16}/>
            </Link>)}
            {!recentTenants.length && <div className="dashboard-empty">Belum ada penghuni aktif.</div>}
          </div>
        </div>

        <div className="card">
          <div className="dashboard-card-head">
            <div><div className="section-title">Aktivitas Pembayaran</div><div className="sub">Transaksi terbaru</div></div>
            <Link href="/kwitansi" className="dashboard-link">Kwitansi <ChevronRight size={15}/></Link>
          </div>
          <div className="dashboard-tenant-list">
            {recentPayments.map(item => <div className="dashboard-tenant-row" key={item.id}>
              <span className="dashboard-avatar dashboard-avatar-purple"><ReceiptText size={16}/></span>
              <span><b>{item.tenant}</b><small>{item.room} · {item.paidAt ? formatDate(item.paidAt) : item.month}</small></span>
              <strong className={item.status === 'paid' ? 'dashboard-positive' : 'dashboard-negative'}>{money(item.amount)}</strong>
            </div>)}
            {!recentPayments.length && <div className="dashboard-empty">Belum ada transaksi pembayaran.</div>}
          </div>
        </div>
      </section>

      <section className="dashboard-quick-grid">
        <Link href="/kamar/check-in" className="dashboard-quick"><span><Users size={18}/></span><div><b>Check-In Tamu</b><small>Tambah penghuni baru</small></div><ChevronRight size={17}/></Link>
        <Link href="/tagihan" className="dashboard-quick"><span><ReceiptText size={18}/></span><div><b>Kelola Tagihan</b><small>Billing & pelunasan</small></div><ChevronRight size={17}/></Link>
        <Link href="/keuangan" className="dashboard-quick"><span><WalletCards size={18}/></span><div><b>Keuangan</b><small>Transaksi & laporan</small></div><ChevronRight size={17}/></Link>
        <Link href="/laporan" className="dashboard-quick"><span><FileText size={18}/></span><div><b>Laporan</b><small>Riwayat property</small></div><ChevronRight size={17}/></Link>
      </section>

      {cctv.length > 0 && <section className="card dashboard-cctv-card">
        <div className="dashboard-card-head"><div><div className="section-title">CCTV Shortcut</div><div className="sub">Akses kamera yang ditampilkan di dashboard</div></div><Link href="/cctv" className="dashboard-link">Semua CCTV <ChevronRight size={15}/></Link></div>
        <div className="dashboard-cctv-grid">{cctv.map(item => <Link href="/cctv" className="dashboard-cctv-item" key={item.id}><span><Activity size={16}/></span><div><b>{item.name}</b><small>{item.location || 'Buka kamera'}</small></div><ChevronRight size={16}/></Link>)}</div>
      </section>}
    </div>
  );
}

// dashboard visual system deployed with globals.css
