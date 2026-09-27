'use client';
import { useEffect, useState } from 'react';
import { defaultRooms, loadData, Room, money } from '@/lib/store';

export default function PenghuniKamar() {
  const [rooms, setRooms] = useState<Room[]>(defaultRooms);
  useEffect(() => { setRooms(loadData<Room[]>('rooms', defaultRooms)); }, []);
  return <>
    <div className="top"><div><div className="title">Penghuni Kamar</div><div className="sub">Informasi penghuni berdasarkan kamar yang ditempati.</div></div></div>
    <div className="card"><div className="section-title">Daftar Penghuni per Kamar</div>
      <table className="table"><thead><tr><th>Kamar</th><th>Penghuni</th><th>Harga / bulan</th><th>Status</th></tr></thead>
      <tbody>{rooms.map(room => <tr key={room.id}><td><b>{room.id}</b></td><td>{room.tenant === '-' ? 'Belum ada penghuni' : room.tenant}</td><td>{money(room.price)}</td><td><span className={'badge '+(room.status==='occupied'?'green':room.status==='available'?'blue':'amber')}>{room.status==='occupied'?'Terisi':room.status==='available'?'Tersedia':'Maintenance'}</span></td></tr>)}</tbody></table>
    </div>
  </>;
}
