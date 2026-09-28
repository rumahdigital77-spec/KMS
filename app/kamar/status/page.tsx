// Keep room status action guards deployed with the current production build.
'use client';

import { useEffect, useState } from 'react';
import { defaultRooms, defaultTenants, loadData, money, Room, Tenant, saveData } from '@/lib/store';

const label = (s: Room['status']) =>
  s === 'occupied' ? 'Terisi' : s === 'available' ? 'Tersedia' : 'Maintenance';

export default function EditRoomStatus() {
  const [rooms, setRooms] = useState<Room[]>(defaultRooms);
  const [msg, setMsg] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>(defaultTenants);

  useEffect(() => {
    const refresh = () => {
      setRooms(loadData<Room[]>('rooms', defaultRooms));
      setTenants(loadData<Tenant[]>('tenants', defaultTenants));
    };
    refresh();
    window.addEventListener('kostpro:data-saved', refresh);
    window.addEventListener('kostpro:data-scope-changed', refresh);
    return () => {
      window.removeEventListener('kostpro:data-saved', refresh);
      window.removeEventListener('kostpro:data-scope-changed', refresh);
    };
  }, []);

  const normalizeRoomRef = (value: unknown) =>
    String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/^kamar\s+/i, '')
      .replace(/\s+/g, '');

  const isOccupied = (room: Room) => {
    const roomStatus = String(room.status ?? '').trim().toLowerCase();
    const roomTenant = String(room.tenant ?? '').trim();

    // Treat both current and legacy "occupied/terisi" values as occupied.
    if (roomStatus === 'occupied' || roomStatus === 'terisi') return true;
    if (roomTenant !== '' && roomTenant !== '-') return true;

    const roomRef = normalizeRoomRef(room.id);
    return tenants.some((t) => {
      const tenantStatus = String(t.status ?? 'active').trim().toLowerCase();
      const tenantRoom = normalizeRoomRef(t.room);
      return (
        tenantRoom === roomRef &&
        String(t.name ?? '').trim() !== '' &&
        String(t.name ?? '').trim() !== '-' &&
        tenantStatus !== 'history'
      );
    });
  };

  const change = async (id: string, status: Room['status']) => {
    const current = rooms.find((r) => r.id === id);
    const occupied = Boolean(current && isOccupied(current));

    if (occupied && (status === 'available' || status === 'maintenance' || status === 'occupied')) {
      setMsg(
        'Kamar yang sedang terisi tidak dapat diubah dari Edit Room Status. Gunakan proses C.O. atau Penghuni Aktif.'
      );
      return;
    }

    const next = rooms.map((r) =>
      r.id === id
        ? { ...r, status, tenant: status === 'available' || status === 'maintenance' ? '-' : r.tenant }
        : r
    );
    setRooms(next);
    setMsg('');
    try {
      await saveData('rooms', next);
      setMsg('Status kamar berhasil diperbarui.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Gagal menyimpan status kamar.');
    }
  };

  const actions = (r: Room) => {
    const occupied = isOccupied(r);
    return (
      <div className="kamar-status-actions">
        <button
          type="button"
          className="btn"
          disabled={occupied || r.status === 'available'}
          aria-disabled={occupied || r.status === 'available'}
          data-room-occupied={occupied ? 'true' : 'false'}
          title={occupied ? 'Kamar terisi: tombol Siap Jual dinonaktifkan. Gunakan C.O. atau Penghuni Aktif.' : undefined}
          onClick={() => {
            if (occupied) return;
            void change(r.id, 'available');
          }}
        >
          Tersedia
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={occupied || r.status === 'maintenance'}
          aria-disabled={occupied || r.status === 'maintenance'}
          title={occupied ? 'Kamar terisi: gunakan C.O. atau Penghuni Aktif.' : undefined}
          onClick={() => change(r.id, 'maintenance')}
        >
          Maintenance
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={occupied || r.status === 'occupied'}
          aria-disabled={occupied || r.status === 'occupied'}
          title={occupied ? 'Kamar terisi: gunakan C.O. atau Penghuni Aktif.' : undefined}
          onClick={() => change(r.id, 'occupied')}
        >
          Terisi
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="top">
        <div>
          <div className="title">Edit Room Status</div>
          <div className="sub">Kelola status setiap kamar dengan cepat dan sederhana.</div>
        </div>
      </div>

      {msg && <div className="kamar-status-message">{msg}</div>}

      <div className="card kamar-status-editor">
        <div className="kamar-status-editor-head">
          <div>
            <div className="section-title">Status Kamar</div>
            <div className="kamar-status-editor-sub">Pilih status terbaru untuk setiap kamar.</div>
          </div>
          <span className="kamar-status-count">{rooms.length} Kamar</span>
        </div>

        <div className="kamar-status-cards">
          {rooms.map((r) => (
            <div className="kamar-status-card" key={r.id}>
              <div className="kamar-status-card-head">
                <div>
                  <div className="kamar-room-name">Kamar {r.id}</div>
                  <div className="kamar-room-tenant">{r.tenant === '-' ? 'Belum ada penghuni' : r.tenant}</div>
                </div>
                <span className={'badge ' + (r.status === 'occupied' ? 'green' : r.status === 'available' ? 'blue' : 'amber')}>
                  {label(r.status)}
                </span>
              </div>

              <div className="kamar-detail-grid">
                <div><span>Harga / bulan</span><b>{money(r.price)}</b></div>
                <div><span>Status</span><b>{label(r.status)}</b></div>
                <div><span>Penghuni</span><b>{r.tenant === '-' ? 'Kosong' : r.tenant}</b></div>
              </div>

              {actions(r)}
            </div>
          ))}
        </div>

        <div className="kamar-status-desktop">
          <table className="table kamar-status-table">
            <thead>
              <tr><th>Kamar</th><th>Penghuni</th><th>Harga / bulan</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.id}</b></td>
                  <td>{r.tenant}</td>
                  <td>{money(r.price)}</td>
                  <td><span className={'badge ' + (r.status === 'occupied' ? 'green' : r.status === 'available' ? 'blue' : 'amber')}>{label(r.status)}</span></td>
                  <td>{actions(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
