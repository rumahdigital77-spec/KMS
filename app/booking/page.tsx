'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, MessageCircle, CheckCircle2, Copy } from 'lucide-react';
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
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [publicMode, setPublicMode] = useState(false);
  const [managerPhone, setManagerPhone] = useState('');

  useEffect(() => {
    const loadedRooms = loadData<Room[]>('rooms', defaultRooms);
    setRooms(loadedRooms);
    setBookings(loadData<Booking[]>('bookings', []));
    try {
      const settings = JSON.parse(localStorage.getItem('kostpro_settings') || '{}');
      setManagerPhone(String(settings.phone || ''));
    } catch {}
    const query = new URLSearchParams(window.location.search);
    setPublicMode(query.get('public') === '1');
    fetch('/api/rooms',{cache:'no-store'}).then(r=>r.json()).then(data=>{
      if(Array.isArray(data.rooms) && data.rooms.length){setRooms(data.rooms);saveData('rooms',data.rooms);}
    }).catch(()=>{});
    fetch('/api/bookings',{cache:'no-store'}).then(r=>r.json()).then(data=>{
      if(Array.isArray(data.bookings)){
        const mapped=data.bookings.map((x:any)=>({id:String(x.id),room:x.room_id,name:x.name,phone:x.phone,startDate:x.start_date,duration:x.duration,createdAt:x.created_at,status:x.status}));
        setBookings(mapped);saveData('bookings',mapped);
      }
    }).catch(()=>{});
    const requestedRoom = new URLSearchParams(window.location.search).get('room');
    if (requestedRoom) {
      const room = loadedRooms.find(x => x.id === requestedRoom);
      if (room?.status === 'available') {
        setRoomId(room.id);
        setSelectedRoom(room);
      } else if (room) {
        setMsg('Kamar ' + room.id + ' sudah tidak tersedia. Silakan pilih kamar lain yang berstatus Tersedia.');
      }
    }
  }, []);

  const availableRooms = useMemo(
    () => rooms.filter(room => room.status === 'available'),
    [rooms]
  );

  const bookingUrl = (room: Room) =>
    window.location.origin + '/booking?public=1&room=' + encodeURIComponent(room.id);

  const shareLink = (room: Room) => {
    const url = bookingUrl(room);
    const text = [
      'Halo, saya ingin booking kamar ' + room.id + '.',
      'Harga: ' + money(room.price) + '/bulan',
      'Silakan isi data booking melalui link berikut:',
      url,
    ].join('\n');
    const normalized = phone.replace(/\D/g, '').replace(/^0/, '62');
    const waUrl = normalized.length >= 10
      ? 'https://wa.me/' + normalized + '?text=' + encodeURIComponent(text)
      : 'https://wa.me/?text=' + encodeURIComponent(text);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const copyLink = async (room: Room) => {
    const url = bookingUrl(room);
    try {
      await navigator.clipboard.writeText(url);
      setMsg('Link booking ' + room.id + ' berhasil disalin. Silakan tempel ke WhatsApp.');
    } catch {
      window.prompt('Salin link booking berikut:', url);
    }
  };

  const submit = () => {
    if (!roomId || !name.trim() || !phone.trim() || !startDate) {
      setMsg('Kamar, nama, nomor WhatsApp, dan tanggal masuk wajib diisi.');
      return;
    }
    const room = rooms.find(x => x.id === roomId) || loadData<Room[]>( 'rooms', defaultRooms).find(x => x.id === roomId);
    if (!room || room.status !== 'available') {
      setMsg('Kamar sudah tidak tersedia. Silakan pilih kamar yang masih berstatus Tersedia.');
      return;
    }

    const send=async()=>{
      try{
        setMsg('Mengirim booking...');
        const response=await fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId:room.id,name:name.trim(),phone:phone.trim(),startDate,duration})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok) throw new Error(data.error||'Database online belum terhubung. Silakan hubungkan Supabase di Vercel.');
        const booking:Booking={id:String(data.booking.id),room:data.booking.room_id,name:data.booking.name,phone:data.booking.phone,startDate:data.booking.start_date,duration:data.booking.duration,createdAt:data.booking.created_at,status:'pending'};
        const next=[booking,...loadData<Booking[]>('bookings',[]).filter(x=>x.id!==booking.id)];
        setBookings(next);saveData('bookings',next);
        setMsg('Booking berhasil dikirim. Data sudah masuk ke sistem pengelola.');
        setName('');setPhone('');setRoomId('');setSelectedRoom(null);
      }catch(error){
        setMsg(error instanceof Error?error.message:'Gagal mengirim booking. Coba lagi.');
      }
    };
    send();
  };

  return (
    <>
      <div className="top">
        <div>
          <div className="title">{publicMode ? 'Form Booking Kamar' : 'Booking'}</div>
          <div className="sub">{publicMode ? 'Isi data untuk mengajukan booking kamar' : 'Ketersediaan kamar mengikuti status kamar saat ini'}</div>
        </div>
        {!publicMode && <div className="badge blue"><CalendarCheck size={15} style={{verticalAlign:'middle',marginRight:5}} /> {availableRooms.length} kamar tersedia</div>}
      </div>

      {msg && <div className="card" style={{marginBottom:18}}>{msg}</div>}

      {!publicMode && <div className="grid">
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
              <button className="btn" onClick={() => { setRoomId(room.id); setSelectedRoom(room); setMsg('Form booking untuk ' + room.id + ' sudah dipilih. Silakan isi data calon penghuni.'); document.getElementById('booking-form')?.scrollIntoView({behavior:'smooth',block:'start'}); }}>
                Booking {room.id}
              </button>
              <button className="btn secondary" onClick={() => shareLink(room)}>
                <MessageCircle size={16} style={{verticalAlign:'middle',marginRight:6}} /> Share Link WA
              </button>
              <button className="btn secondary" onClick={() => copyLink(room)} title="Salin link booking">
                <Copy size={16} style={{verticalAlign:'middle',marginRight:6}} /> Salin Link
              </button>
            </div>
          </div>
        ))}
      </div>}

      {!publicMode && !availableRooms.length && (
        <div className="card" style={{marginTop:18}}>
          <div className="section-title">Tidak ada kamar tersedia</div>
          <div className="sub">Kamar dengan status Terisi atau Maintenance tidak ditampilkan untuk booking.</div>
        </div>
      )}

      <div id="booking-form" className="card" style={{marginTop:18}}>
        <div className="section-title">{publicMode ? 'Isi Data Booking' : 'Form Booking'}</div>
        <div className="sub" style={{marginBottom:14}}>{publicMode ? 'Data akan diteruskan kepada pengelola untuk diproses.' : 'Form ini dapat dibuka langsung dari link WhatsApp.'}</div>
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

      {!publicMode && <div className="card" style={{marginTop:18}}>
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
      </div>}
    </>
  );
}
