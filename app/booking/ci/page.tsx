'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CalendarDays, CheckCircle2, Home, Loader2, Phone, UserRound } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

type Booking = {
  id: string; guest_name: string; guest_phone: string; check_in: string;
  duration_months: number; status: string; room_id: string;
  room_name?: string; property_name?: string;
};

const supabase = createClient();

export default function BookingCheckInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id') || '';
  const [booking, setBooking] = useState<Booking | null>(null);
  const [name, setName] = useState(''); const [phone, setPhone] = useState('');
  const [checkIn, setCheckIn] = useState(''); const [duration, setDuration] = useState(1);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [msg, setMsg] = useState('');

  useEffect(() => {
    async function load() {
      if (!id) { setMsg('Booking tidak ditemukan.'); setLoading(false); return; }
      const { data, error } = await supabase.rpc('get_kostin_bookings_for_owner');
      if (error) { setMsg(error.message || 'Gagal memuat booking.'); setLoading(false); return; }
      const row = (Array.isArray(data) ? data : []).find((x: Booking) => x.id === id) as Booking | undefined;
      if (!row) { setMsg('Booking tidak ditemukan atau bukan milik property yang dapat diakses.'); setLoading(false); return; }
      if (row.status !== 'CONFIRMED') { setMsg('Booking belum berstatus CONFIRMED.'); setBooking(row); setLoading(false); return; }
      setBooking(row); setName(row.guest_name || ''); setPhone(row.guest_phone || '');
      setCheckIn(row.check_in || ''); setDuration(row.duration_months || 1); setLoading(false);
    }
    void load();
  }, [id]);

  async function save() {
    if (!booking || saving) return;
    if (!name.trim() || !phone.trim() || !checkIn || duration < 1) { setMsg('Lengkapi data C.I. terlebih dahulu.'); return; }
    setSaving(true); setMsg('');
    const { error } = await supabase.rpc('save_kostin_booking_checkin', {
      p_booking_id: booking.id, p_guest_name: name.trim(), p_guest_phone: phone.trim(),
      p_check_in: checkIn, p_duration_months: duration,
    });
    if (error) { setMsg(error.message || 'Gagal menyimpan C.I.'); setSaving(false); return; }
    setMsg('C.I. berhasil disimpan. Kamar sekarang OCCUPIED dan booking COMPLETED.');
    setSaving(false);
    setTimeout(() => router.push('/booking'), 900);
  }

  return (
    <main className="page booking-ci-premium">
      <div className="booking-ci-top">
        <div><span className="booking-eyebrow">CHECK-IN CENTER</span><h1>Form C.I. Booking</h1><p>Data dari KostIn sudah terisi. Petugas cukup memeriksa, mengubah bila perlu, lalu simpan.</p></div>
        <Link className="booking-back-btn" href="/booking"><ArrowLeft size={16}/> Kembali</Link>
      </div>

      {msg && <div className={'booking-ci-notice ' + (msg.includes('berhasil') ? 'success' : '')}><CheckCircle2 size={18}/><span>{msg}</span></div>}

      {loading ? <div className="booking-ci-loading"><Loader2 className="spin" size={28}/><b>Menyiapkan Form C.I...</b></div> :
        booking && booking.status === 'CONFIRMED' ? <section className="booking-ci-shell">
          <div className="booking-ci-banner">
            <div className="booking-ci-banner-icon"><CheckCircle2 size={25}/></div>
            <div><span>BOOKING CONFIRMED</span><b>{booking.room_name || booking.room_id}</b><small>{booking.property_name || 'Property KOSTPRO'}</small></div>
            <div className="booking-ci-state">SIAP C.I.</div>
          </div>

          <div className="booking-ci-grid">
            <div className="booking-ci-card">
              <div className="booking-ci-card-head"><span className="ci-card-icon"><UserRound size={17}/></span><div><h2>Data Tamu</h2><p>Data otomatis dari KostIn</p></div></div>
              <div className="booking-fields">
                <label><span>Nama Lengkap</span><div className="ci-input"><UserRound size={16}/><input value={name} onChange={e => setName(e.target.value)} /></div></label>
                <label><span>Nomor WhatsApp</span><div className="ci-input"><Phone size={16}/><input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" /></div></label>
                <label><span>Tanggal C.I.</span><div className="ci-input"><CalendarDays size={16}/><input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} /></div></label>
                <label><span>Durasi Menginap</span><div className="ci-input"><CalendarDays size={16}/><input type="number" min={1} value={duration} onChange={e => setDuration(Math.max(1, Number(e.target.value) || 1))}/><em>bulan</em></div></label>
              </div>
            </div>

            <aside className="booking-ci-card booking-ci-summary">
              <div className="booking-ci-card-head"><span className="ci-card-icon room"><Home size={17}/></span><div><h2>Ringkasan Kamar</h2><p>Status akan berubah saat disimpan</p></div></div>
              <div className="ci-room-preview"><div><small>KAMAR</small><strong>{booking.room_name || booking.room_id}</strong></div><span>CONFIRMED</span></div>
              <div className="ci-summary-row"><span>Property</span><b>{booking.property_name || '-'}</b></div>
              <div className="ci-summary-row"><span>Tanggal C.I.</span><b>{checkIn ? new Date(checkIn + 'T00:00:00').toLocaleDateString('id-ID') : '-'}</b></div>
              <div className="ci-summary-row"><span>Durasi</span><b>{duration} bulan</b></div>
              <div className="ci-status-transition"><span className="available-dot"/> AVAILABLE <ArrowLeft size={15}/><span className="occupied-dot"/> <b>OCCUPIED</b></div>
            </aside>
          </div>

          <div className="booking-ci-footer">
            <Link className="booking-cancel-btn" href="/booking">Batal</Link>
            <button className="booking-save-ci" onClick={() => void save()} disabled={saving}>
              {saving ? <><Loader2 className="spin" size={18}/> Menyimpan...</> : <><CheckCircle2 size={18}/> SIMPAN C.I.</>}
            </button>
          </div>
        </section> :
        <div className="booking-ci-loading"><XCircleIcon/><b>{msg || 'Form C.I. tidak tersedia.'}</b><Link className="booking-back-btn" href="/booking">Kembali ke Booking</Link></div>}
    </main>
  );
}

function XCircleIcon() {
  return <span className="booking-ci-error-icon">×</span>;
}
