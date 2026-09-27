'use client';

import { useEffect, useState } from 'react';
import { defaultRooms, defaultTenants, loadData, money, Room, Tenant } from '@/lib/store';

export default function PenghuniKamar() {
  const [rooms, setRooms] = useState<Room[]>(defaultRooms);
  const [tenants, setTenants] = useState<Tenant[]>(defaultTenants);

  useEffect(() => {
    const load = () => {
      setRooms(loadData<Room[]>('rooms', defaultRooms));
      setTenants(loadData<Tenant[]>('tenants', defaultTenants));
    };
    load();
    window.addEventListener('kostpro:data-saved', load);
    window.addEventListener('kostpro:data-scope-changed', load);
    return () => {
      window.removeEventListener('kostpro:data-saved', load);
      window.removeEventListener('kostpro:data-scope-changed', load);
    };
  }, []);

  const activeRooms = rooms.filter(room => {
    if (room.status !== 'occupied') return false;
    const tenant = tenants.find(t => t.room === room.id && t.status === 'active');
    return Boolean(tenant);
  });

  const getRent = (room: Room) => {
    const tenant = tenants.find(t => t.room === room.id && t.status === 'active');
    return tenant?.rent || room.price;
  };

  return <>
    <div className="top">
      <div>
        <div className="title">Penghuni Kamar</div>
        <div className="sub">Hanya menampilkan kamar yang sedang terisi oleh penghuni aktif.</div>
      </div>
    </div>
    <div className="card">
      <div className="section-title">Daftar Penghuni Kamar Aktif</div>
      <table className="table">
        <thead><tr><th>Kamar</th><th>Penghuni</th><th>Harga / bulan</th><th>Status</th></tr></thead>
        <tbody>
          {activeRooms.length === 0 ? (
            <tr><td colSpan={4}>Belum ada kamar yang terisi aktif.</td></tr>
          ) : activeRooms.map(room => {
            const tenant = tenants.find(t => t.room === room.id && t.status === 'active');
            const rent = getRent(room);
            return <tr key={room.id}>
              <td><b>{room.id}</b></td>
              <td>{tenant?.name || room.tenant}</td>
              <td>{money(rent)}</td>
              <td><span className="badge green">Terisi Aktif</span></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  </>;
}
