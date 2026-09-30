'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, CheckCircle2, Clock3, RefreshCw, UserRound, XCircle, ArrowRight, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import BookingPremiumStyles from '@/components/BookingPremiumStyles';

type Booking = {
  id: string; guest_name: string; guest_phone: string; check_in: string;
  duration_months: number; status: string; created_at: string;
  property_id: string; room_id: string; room_name?: string; property_name?: string;
};

const supabase = createClient();

export default function BookingPage() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('ALL');

  async function load(silent = false) {
    if (silent) setRefreshing(true); else setLoading(true);
    const { data, error } = await supabase.rpc('get_kostin_bookings_for_owner');
    if (error) {
      setMsg(error.message || 'Gagal mengambil booking dari KostIn.');
      setRows([]);
    } else {
      setRows(Array.isArray(data) ? data as Booking[] : []);
      if (!silent) setMsg('');
    }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { void load(); }, []);

  async function updateStatus(id: string, status: string) {
    setMsg('');
    const { error } = await supabase.rpc('update_kostin_booking_status', { p_booking_id: id, p_status: status });
    if (error) { setMsg(error.message || 'Gagal mengubah status booking.'); return; }
    setMsg(status === 'CONFIRMED' ? 'Booking berhasil APPROVE dan siap C.I.' : 'Booking berhasil DENIED.');
    await load(true);
  }

  const counts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter(b => b.status === 'PENDING').length,
    confirmed: rows.filter(b => b.status === 'CONFIRMED').length,
    completed: rows.filter(b => b.status === 'COMPLETED').length,
    cancelled: rows.filter(b => b.status === 'CANCELLED').length,
  }), [rows]);

  const visible = filter === 'ALL' ? rows : rows.filter(b => b.status === filter);

  return (
    <><BookingPremiumStyles/><main className="page booking-premium">
      <header className="booking-hero">
        <div>
          <span className="booking-eyebrow"><Sparkles size={13}/> KOSTIN BOOKING CENTER</span>
          <h1>Booking</h1>
          <p>Kelola booking masuk, approve, check-in, dan perubahan status kamar dalam satu alur.</p>
        </div>
        <button className="booking-refresh" onClick={() => void load(true)} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spin' : ''}/> {refreshing ? 'Memuat...' : 'Refresh'}
        </button>
      </header>

      <section className="booking-flow-card">
        <div className="booking-flow-title">Alur Booking <span>REAL-TIME</span></div>
        <div className="booking-flow">
          {[
            ['1', 'Booking Masuk', Clock3],
            ['2', 'APPROVE / DENIED', CheckCircle2],
            ['3', 'CONFIRMED', CheckCircle2],
            ['4', 'FORM C.I.', UserRound],
            ['5', 'SIMPAN C.I.', CalendarCheck],
            ['6', 'COMPLETED', CheckCircle2],
          ].map(([n, label, Icon], i) => (
            <div className="booking-flow-step" key={String(n)}>
              <div className="booking-flow-icon"><Icon size={17}/></div>
              <div><b>{label as string}</b><small>{i === 0 ? 'Dari KostIn' : i === 3 ? 'Data otomatis terisi' : i === 4 ? 'Kamar → OCCUPIED' : i === 5 ? 'Booking selesai' : 'Proses'}</small></div>
              {i < 5 && <ArrowRight className="booking-flow-arrow" size={16}/>}
            </div>
          ))}
        </div>
      </section>

      {msg && <div className="booking-notice"><CheckCircle2 size={17}/><span>{msg}</span></div>}

      <section className="booking-stats">
        <button className={filter === 'ALL' ? 'active' : ''} onClick={() => setFilter('ALL')}><span>Semua</span><b>{counts.all}</b></button>
        <button className={filter === 'PENDING' ? 'active' : ''} onClick={() => setFilter('PENDING')}><span>Menunggu</span><b>{counts.pending}</b></button>
        <button className={filter === 'CONFIRMED' ? 'active' : ''} onClick={() => setFilter('CONFIRMED')}><span>Confirmed</span><b>{counts.confirmed}</b></button>
        <button className={filter === 'COMPLETED' ? 'active' : ''} onClick={() => setFilter('COMPLETED')}><span>Completed</span><b>{counts.completed}</b></button>
        <button className={filter === 'CANCELLED' ? 'active' : ''} onClick={() => setFilter('CANCELLED')}><span>Denied</span><b>{counts.cancelled}</b></button>
      </section>

      <section className="booking-list-card">
        <div className="booking-list-head">
          <div><h2>Daftar Booking</h2><p>Setiap booking hanya dapat diproses sesuai status alurnya.</p></div>
          <span className="booking-live-dot"><i/> LIVE SYNC</span>
        </div>
        {loading ? <div className="booking-empty"><RefreshCw className="spin" size={25}/><b>Memuat booking...</b></div> :
          visible.length === 0 ? <div className="booking-empty"><CalendarCheck size={30}/><b>Belum ada booking</b><span>Booking dari KostIn akan muncul otomatis di sini.</span></div> :
          <div className="booking-table-wrap">
            <table className="booking-table">
              <thead><tr><th>BOOKING</th><th>KAMAR</th><th>CHECK-IN</th><th>DURASI</th><th>STATUS</th><th>AKSI</th></tr></thead>
              <tbody>{visible.map(b => (
                <tr key={b.id}>
                  <td><div className="booking-guest"><span><UserRound size={16}/></span><div><b>{b.guest_name}</b><small>{b.guest_phone}</small></div></div></td>
                  <td><strong className="booking-room">{b.room_name || b.room_id}</strong><small className="booking-property">{b.property_name || b.property_id}</small></td>
                  <td>{new Date(b.check_in + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td>{b.duration_months} bulan</td>
                  <td><span className={'booking-status-pill ' + b.status.toLowerCase()}>{b.status === 'CANCELLED' ? 'DENIED' : b.status}</span></td>
                  <td><div className="booking-actions">
                    {b.status === 'PENDING' && <>
                      <button className="approve-btn" onClick={() => void updateStatus(b.id, 'CONFIRMED')}><CheckCircle2 size={15}/> APPROVE</button>
                      <button className="deny-btn" onClick={() => void updateStatus(b.id, 'CANCELLED')}><XCircle size={15}/> DENIED</button>
                    </>}
                    {b.status === 'CONFIRMED' && <Link className="ci-btn" href={'/booking/ci?id=' + encodeURIComponent(b.id)}><UserRound size={15}/> C.I.</Link>}
                    {b.status === 'COMPLETED' && <span className="completed-label"><CheckCircle2 size={16}/> COMPLETED</span>}
                    {b.status === 'CANCELLED' && <span className="denied-label"><XCircle size={16}/> DENIED</span>}
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>}
      </section>
    </main></>
  );
}
