'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, CheckCircle2, Clock3, RefreshCw, UserRound, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

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
    silent ? setRefreshing(true) : setLoading(true);
    const { data, error } = await supabase.rpc('get_kostin_bookings_for_owner');
    if (error) {
      setMsg(error.message || 'Gagal mengambil booking dari KostIn.');
      setRows([]);
    } else {
      setRows(Array.isArray(data) ? data as Booking[] : []);
      if (!silent) setMsg('');
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { void load(); }, []);

  async function updateStatus(id: string, status: string) {
    setMsg('');
    const { error } = await supabase.rpc('update_kostin_booking_status', {
      p_booking_id: id,
      p_status: status,
    });
    if (error) {
      setMsg(error.message || 'Gagal mengubah status booking.');
      return;
    }
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
    <main className="page">
      <div className="top">
        <div>
          <div className="title">Booking</div>
          <div className="sub">Kelola booking kamar yang masuk dari KostIn secara cepat dan terhubung.</div>
        </div>
        <div className="badge blue">
          <CalendarCheck size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />
          {counts.pending} booking menunggu
        </div>
      </div>

      {msg && <div className="card" style={{ marginBottom: 18 }}>{msg}</div>}

      <div className="grid">
        <div className="card">
          <div className="section-title">Booking Masuk</div>
          <div className="sub">Permintaan baru dari KostIn yang perlu diproses.</div>
          <div className="metric" style={{ fontSize: 28, marginTop: 14 }}>{counts.pending}</div>
          <div className="sub">menunggu approval</div>
        </div>
        <div className="card">
          <div className="section-title">Confirmed</div>
          <div className="sub">Booking yang siap masuk proses C.I.</div>
          <div className="metric" style={{ fontSize: 28, marginTop: 14 }}>{counts.confirmed}</div>
          <div className="sub">siap C.I.</div>
        </div>
        <div className="card">
          <div className="section-title">Selesai</div>
          <div className="sub">Booking yang sudah selesai check-in.</div>
          <div className="metric" style={{ fontSize: 28, marginTop: 14 }}>{counts.completed}</div>
          <div className="sub">completed</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="section-title">Daftar Booking</div>
            <div className="sub">Alur: Booking Masuk → APPROVE → CONFIRMED → C.I. → COMPLETED.</div>
          </div>
          <button className="btn secondary" onClick={() => void load(true)} disabled={refreshing}>
            <RefreshCw size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            {refreshing ? 'Memuat...' : 'Refresh'}
          </button>
        </div>

        <div className="actions" style={{ marginTop: 16, marginBottom: 12 }}>
          {[
            ['ALL', 'Semua', counts.all],
            ['PENDING', 'Menunggu', counts.pending],
            ['CONFIRMED', 'Confirmed', counts.confirmed],
            ['COMPLETED', 'Selesai', counts.completed],
            ['CANCELLED', 'Denied', counts.cancelled],
          ].map(([key, label, count]) => (
            <button key={String(key)} className={'btn ' + (filter === key ? '' : 'secondary')} onClick={() => setFilter(String(key))}>
              {String(label)} ({String(count)})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="sub" style={{ padding: 24 }}>Memuat booking...</div>
        ) : visible.length === 0 ? (
          <div className="sub" style={{ padding: 24 }}>Belum ada booking pada filter ini.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Nama</th><th>Kamar</th><th>Check-in</th><th>Durasi</th><th>Status</th><th>Aksi</th></tr>
              </thead>
              <tbody>
                {visible.map(b => (
                  <tr key={b.id}>
                    <td>
                      <b>{b.guest_name}</b>
                      <div className="sub">{b.guest_phone}</div>
                    </td>
                    <td>
                      <b>{b.room_name || b.room_id}</b>
                      <div className="sub">{b.property_name || b.property_id}</div>
                    </td>
                    <td>{new Date(b.check_in + 'T00:00:00').toLocaleDateString('id-ID')}</td>
                    <td>{b.duration_months} bulan</td>
                    <td><span className={'badge ' + (b.status === 'CONFIRMED' ? 'green' : b.status === 'PENDING' ? 'blue' : b.status === 'COMPLETED' ? 'green' : 'red')}>
                      {b.status === 'CANCELLED' ? 'DENIED' : b.status}
                    </span></td>
                    <td>
                      <div className="actions">
                        {b.status === 'PENDING' && <>
                          <button className="btn" onClick={() => void updateStatus(b.id, 'CONFIRMED')}><CheckCircle2 size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} /> APPROVE</button>
                          <button className="btn secondary" onClick={() => void updateStatus(b.id, 'CANCELLED')}><XCircle size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} /> DENIED</button>
                        </>}
                        {b.status === 'CONFIRMED' && <Link className="btn" href={'/booking/ci?id=' + encodeURIComponent(b.id)}><UserRound size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} /> C.I.</Link>}
                        {b.status === 'COMPLETED' && <span className="sub"><CheckCircle2 size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Selesai</span>}
                        {b.status === 'CANCELLED' && <span className="sub"><XCircle size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Denied</span>}
                        {b.status === 'CONFIRMED' && <span className="sub"><Clock3 size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Menunggu C.I.</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
