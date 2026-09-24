'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, MessageCircle, Users, Phone, CheckCircle2 } from 'lucide-react';
import { defaultRooms, loadData, money, Room, saveData } from '@/lib/store';

type Booking = {
  id: string;
  room: string;
  name: string;
  phone: string;
  startDate: string;
  duration: string;
  createdAt: string;
  status: 'pending';
};

const today = new Date().toISOString().slice(0, 10);

export default function BookingPage() {
  const [rooms, setRooms] = useState<Room[]>(defaultRooms);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [duration, setDuration] = useState('1 bulan');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setRooms(loadData<Room[]>('rooms', defaultRooms));
    setBookings(loadData<Booking[]>('bookings', []));
  }, []);

  const availableRooms = useMemo(
    () => rooms.filter(room => room.status === 'available'),
    [rooms]
  );

  const shareLink = (room: Room) => {
    const url = window.location.origin + '/booking?room=' + encodeURIComponent(room.id);
    const text = [
      'Halo, saya ingin booking kamar ' + room.id + '.',
      'Harga: ' + money(room.price) + '/bulan',
      'Silakan isi data booking melalui link berikut:',
      url,
    ].join('\n');
    const normalized = phone.replace(/\D/g, '').replace(/^0/, '62');
    if (normalized.length >= 10) {
      window.open('https://wa.me/' + normalized + '?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
    } else {
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
    }
  };

  const submit = () => {
    if (!roomId || !name.trim() || !phone.trim() || !startDate) {
      setMsg('Kamar, nama, nomor WhatsApp, dan tanggal masuk wajib diisi.');
      return;
    }
    const currentRooms = loadData<Room[]>('rooms', defaultRooms);
    const room = currentRooms.find(x => x.id === roomId);
    if (!room || room.status !== 'available') {
      setRooms(currentRooms);
      setMsg('Kamar sudah tidak tersedia. Silakan pilih kamar yang masih berstatus Tersedia.');
      return;
    }

    const currentBookings = loadData<Booking[]>('bookings', []);
    const booking: Booking = {
      id: 'BK-' + Date.now(),
      room: room.id,
      name: name.trim(),
      phone: phone.trim(),
      startDate,
      duration,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    const next = [...currentBookings, booking];
    setBookings(next);
    saveData('bookings', next);
    setMsg('Booking berhasil dicatat. Kamar tetap berstatus Tersedia sampai pengelola mengonfirmasi booking menjadi penghuni.');
    setName('');
    setPhone('');
    setRoomId('');
  };

  return (
    <>
      <div className="top">
        <div>
          <div className="title">Booking</div>
          <div className="sub">Ketersediaan kamar mengikuti status kamar saat ini</div>
        </div>
        <div className="badge blue"><CalendarCheck size={15} style={{verticalAlign:'middle',marginRight:5}} /> {availableRooms.length} kamar tersedia</div>
      </div>

      {msg && <div className="card" style={{marginBottom:18}}>{msg}</div>}

      <div className="grid">
        {availableRooms.map(room => (
          <div className="card" key={room.id}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
              <div>
                <div className="section-title">{room.id}</div>
                <div className="sub">Siap dibooking</div>
              </div>
              <span className="badge green">Tersedia</span>
            </div>
            <div className="metric" style={{fontSize:24,marginTop:14}}>{money(room.price)}</div>
            <div className="sub">per bulan</div>
            <div className="actions" style={{marginTop:16}}>
              <button className="btn" onClick={() => { setRoomId(room.id); setMsg(''); }}>
                Booking {room.id}
              </button>
              <button className="btn secondary" onClick={() => shareLink(room)}>
                <MessageCircle size={16} style={{verticalAlign:'middle',marginRight:6}} /> Share Link WA
              </button>
            </div>
          </div>
        ))}
      </div>

      {!availableRooms.length && (
        <div className="card" style={{marginTop:18}}>
          <div className="section-title">Tidak ada kamar tersedia</div>
          <div className="sub">Kamar dengan status Terisi atau Maintenance tidak ditampilkan untuk booking.</div>
        </div>
      )}

      <div className="card" style={{marginTop:18}}>
        <div className="section-title">Form Booking</div>
        <div className="sub" style={{marginBottom:14}}>Form ini dapat dibuka langsung dari link WhatsApp.</div>
        <div className="form">
          <div className="field">
            <label>Kamar tersedia</label>
            <select value={roomId} onChange={e => setRoomId(e.target.value)}>
              <option value="">Pilih kamar</option>
              {availableRooms.map(room => <option key={room.id} value={room.id}>{room.id} — {money(room.price)}/bulan</option>)}
            </select>
          </div>
          <div className="field">
            <label>Nama calon penghuni</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap" />
          </div>
          <div className="field">
            <label>Nomor WhatsApp</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08123456789" />
          </div>
          <div className="field">
            <label>Tanggal mulai</label>
            <input type="date" min={today} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Durasi sewa</label>
            <select value={duration} onChange={e => setDuration(e.target.value)}>
              <option>1 bulan</option><option>3 bulan</option><option>6 bulan</option><option>12 bulan</option>
            </select>
          </div>
        </div>
        <div className="actions">
          <button className="btn" onClick={submit}>Kirim Booking</button>
          {roomId && <button className="btn secondary" onClick={() => shareLink(availableRooms.find(x => x.id === roomId) || availableRooms[0])}><MessageCircle size={16} style={{verticalAlign:'middle',marginRight:6}} /> Share Form ke WhatsApp</button>}
        </div>
      </div>

      <div className="card" style={{marginTop:18}}>
        <div className="section-title">Booking Masuk</div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>Nama</th><th>Kamar</th><th>Mulai</th><th>Durasi</th><th>WhatsApp</th><th>Status</th></tr></thead>
            <tbody>
              {bookings.slice().reverse().map(booking => (
                <tr key={booking.id}>
                  <td><b>{booking.id}</b></td>
                  <td>{booking.name}</td>
                  <td>{booking.room}</td>
                  <td>{booking.startDate}</td>
                  <td>{booking.duration}</td>
                  <td>{booking.phone}</td>
                  <td><span className="badge amber"><CheckCircle2 size={13} style={{verticalAlign:'middle',marginRight:4}} /> Menunggu</span></td>
                </tr>
              ))}
              {!bookings.length && <tr><td colSpan={7}>Belum ada booking masuk.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
