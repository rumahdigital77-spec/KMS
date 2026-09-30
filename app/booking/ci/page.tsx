'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

type Booking = {
  id: string;
  guest_name: string;
  guest_phone: string;
  check_in: string;
  duration_months: number;
  status: string;
  room_id: string;
  room_name?: string;
  property_name?: string;
};

const supabase = createClient();

export default function BookingCheckInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id') || '';
  const [booking, setBooking] = useState<Booking | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [duration, setDuration] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    async function load() {
      if (!id) { setMsg('Booking tidak ditemukan.'); setLoading(false); return; }
      const { data, error } = await supabase.rpc('get_kostin_bookings_for_owner');
      if (error) { setMsg(error.message || 'Gagal memuat booking.'); setLoading(false); return; }
      const row = (Array.isArray(data) ? data : []).find((x: Booking) => x.id === id) as Booking | undefined;
      if (!row) { setMsg('Booking tidak ditemukan atau bukan milik property aktif.'); setLoading(false); return; }
      if (row.status !== 'CONFIRMED') { setMsg('Booking belum berstatus CONFIRMED.'); setBooking(row); setLoading(false); return; }
      setBooking(row);
      setName(row.guest_name || '');
      setPhone(row.guest_phone || '');
      setCheckIn(row.check_in || '');
      setDuration(row.duration_months || 1);
      setLoading(false);
    }
    void load();
  }, [id]);

  async function save() {
    if (!booking) return;
    setSaving(true); setMsg('');
    const { error } = await supabase.rpc('save_kostin_booking_checkin', {
      p_booking_id: booking.id,
      p_guest_name: name,
      p_guest_phone: phone,
      p_check_in: checkIn,
      p_duration_months: duration,
    });
    if (error) { setMsg(error.message || 'Gagal menyimpan C.I.'); setSaving(false); return; }
    setMsg('C.I. tersimpan. Kamar OCCUPIED dan booking COMPLETED.');
    setSaving(false);
    setTimeout(() => router.push('/booking'), 700);
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">CHECK-IN</span>
          <h1>Form C.I. Booking</h1>
          <p>Data dari KostIn otomatis terisi. Petugas dapat memeriksa dan mengubah sebelum menyimpan.</p>
        </div>
        <Link className="secondaryBtn" href="/booking"><ArrowLeft size={16}/> Kembali</Link>
      </div>
      {msg && <div className="notice">{msg}</div>}
      {loading ? <div className="notice">Memuat data booking...</div> : booking && booking.status === 'CONFIRMED' ? (
        <section style={{maxWidth:760,background:'#fff',borderRadius:18,padding:24,boxShadow:'0 8px 30px rgba(15,23,42,.08)'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:18}}>
            <label>Nama Tamu<input value={name} onChange={e=>setName(e.target.value)} /></label>
            <label>Nomor WhatsApp<input value={phone} onChange={e=>setPhone(e.target.value)} /></label>
            <label>Tanggal C.I.<input type="date" value={checkIn} onChange={e=>setCheckIn(e.target.value)} /></label>
            <label>Durasi (bulan)<input type="number" min={1} value={duration} onChange={e=>setDuration(Math.max(1,Number(e.target.value)||1))} /></label>
          </div>
          <div style={{marginTop:20,padding:16,borderRadius:14,background:'#f8fafc'}}>
            <b>Kamar:</b> {booking.room_name || booking.room_id}<br/>
            <b>Property:</b> {booking.property_name || booking.room_id}
          </div>
          <button style={{marginTop:20}} onClick={()=>void save()} disabled={saving}>
            <CheckCircle2 size={17}/> {saving ? 'Menyimpan...' : 'SIMPAN C.I.'}
          </button>
        </section>
      ) : null}
    </main>
  );
}
