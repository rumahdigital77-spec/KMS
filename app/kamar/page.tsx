'use client';

import { useEffect, useState } from 'react';
import { defaultRooms, loadData, money, Room, saveData } from '@/lib/store';

const statusMeta = {
  occupied: {
    label: 'Terisi',
    description: 'Sedang dihuni',
    bg: 'linear-gradient(145deg,#047857,#10b981)',
    soft: '#ecfdf5',
    text: '#047857',
    icon: '🛏️',
  },
  available: {
    label: 'Tersedia',
    description: 'Siap disewakan',
    bg: 'linear-gradient(145deg,#0369a1,#06b6d4)',
    soft: '#ecfeff',
    text: '#0369a1',
    icon: '🔑',
  },
  maintenance: {
    label: 'Perawatan',
    description: 'Tidak tersedia',
    bg: 'linear-gradient(145deg,#b45309,#f59e0b)',
    soft: '#fffbeb',
    text: '#b45309',
    icon: '🔧',
  },
} as const;

const statuses: Room['status'][] = ['occupied', 'available', 'maintenance'];

export default function Kamar() {
  const [rooms, setRooms] = useState<Room[]>(defaultRooms);
  const [add, setAdd] = useState(false);
  const [detail, setDetail] = useState<Room | null>(null);
  const [code, setCode] = useState('');
  const [price, setPrice] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      const local = loadData<Room[]>('rooms', defaultRooms);

      try {
        const res = await fetch('/api/rooms', { cache: 'no-store' });
        const data = await res.json();

        if (res.ok && Array.isArray(data.rooms) && data.rooms.length) {
          setRooms(data.rooms);
          saveData('rooms', data.rooms);
        } else {
          setRooms(local);
          await Promise.all(
            local.map((room) =>
              fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room }),
              })
            )
          );
        }
      } catch {
        setRooms(local);
      }

      const query = new URLSearchParams(window.location.search);
      if (query.get('aksi') === 'tambah') setAdd(true);
    };

    load();
  }, []);

  const save = () => {
    if (!code.trim() || !price) {
      setMsg('Kode dan harga wajib diisi.');
      return;
    }

    if (
      rooms.some(
        (room) => room.id.toLowerCase() === code.trim().toLowerCase()
      )
    ) {
      setMsg('Kode kamar sudah ada.');
      return;
    }

    const room: Room = {
      id: code.trim().toUpperCase(),
      tenant: '-',
      price: Number(price),
      status: 'available',
    };

    const nextRooms = [...rooms, room];
    setRooms(nextRooms);
    saveData('rooms', nextRooms);

    fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room }),
    }).catch(() => {});

    setCode('');
    setPrice('');
    setAdd(false);
    setMsg('Kamar berhasil ditambahkan sebagai Tersedia.');
  };

  const changeStatus = (id: string, status: Room['status']) => {
    const nextRooms = rooms.map((room) =>
      room.id === id
        ? {
            ...room,
            status,
            tenant:
              status === 'available' || status === 'maintenance'
                ? '-'
                : room.tenant,
          }
        : room
    );

    setRooms(nextRooms);
    saveData('rooms', nextRooms);

    const room = nextRooms.find((item) => item.id === id);

    if (room) {
      fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room }),
      }).catch(() => {});
    }

    setDetail(room || null);
  };

  return (
    <>
      <div className="top">
        <div>
          <div className="title">Manajemen Kamar</div>
          <div className="sub">
            Pantau hunian dan kelola status setiap unit
          </div>
        </div>
        <button className="btn" onClick={() => setAdd(!add)}>
          + Tambah Kamar
        </button>
      </div>

      {msg && (
        <div className="card" style={{ marginBottom: 18 }}>
          {msg}
        </div>
      )}

      <div className="grid">
        {statuses.map((status) => {
          const meta = statusMeta[status];
          const count = rooms.filter((room) => room.status === status).length;

          return (
            <div
              className="card"
              key={status}
              style={{
                background: meta.bg,
                color: '#fff',
                border: 'none',
                boxShadow: '0 12px 28px rgba(15,23,42,.14)',
              }}
            >
              <div
                className="label"
                style={{ color: 'rgba(255,255,255,.82)' }}
              >
                {meta.icon} {meta.label}
              </div>
              <div className="metric" style={{ color: '#fff' }}>
                {count}
              </div>
              <div style={{ opacity: 0.82, fontSize: 13 }}>
                {meta.description}
              </div>
            </div>
          );
        })}
      </div>

      {add && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="section-title">Tambah Kamar</div>
          <div className="form">
            <div className="field">
              <label>Kode Kamar</label>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="K-07"
              />
            </div>
            <div className="field">
              <label>Harga / bulan</label>
              <input
                type="number"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>
          </div>
          <div className="actions">
            <button className="btn" onClick={save}>
              Simpan Kamar
            </button>
            <button className="btn secondary" onClick={() => setAdd(false)}>
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Kamar</th>
              <th>Penghuni</th>
              <th>Harga / bulan</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => {
              const meta = statusMeta[room.status];

              return (
                <tr key={room.id}>
                  <td>
                    <b>{room.id}</b>
                  </td>
                  <td>{room.tenant}</td>
                  <td>{money(room.price)}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: meta.soft,
                        color: meta.text,
                        border: '1px solid rgba(15,23,42,.08)',
                        fontWeight: 800,
                      }}
                    >
                      {meta.icon} {meta.label}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn secondary"
                      onClick={() => setDetail(room)}
                    >
                      Kelola Status
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="section-title">Kelola {detail.id}</div>
          <p>
            Penghuni: <b>{detail.tenant}</b>
          </p>
          <p>
            Harga: <b>{money(detail.price)}</b>
          </p>
          <p>
            Status saat ini:{' '}
            <span
              className="badge"
              style={{
                background: statusMeta[detail.status].soft,
                color: statusMeta[detail.status].text,
                fontWeight: 800,
              }}
            >
              {statusMeta[detail.status].icon} {statusMeta[detail.status].label}
            </span>
          </p>

          <div className="actions">
            {statuses.map((status) => {
              const meta = statusMeta[status];

              return (
                <button
                  key={status}
                  className="btn"
                  disabled={detail.status === status}
                  onClick={() => changeStatus(detail.id, status)}
                  style={{
                    background: meta.bg,
                    color: '#fff',
                    border: 'none',
                    opacity: detail.status === status ? 0.55 : 1,
                  }}
                >
                  {meta.icon} {meta.label}
                </button>
              );
            })}

            <button className="btn secondary" onClick={() => setDetail(null)}>
              Tutup
            </button>
          </div>

          <div className="sub" style={{ marginTop: 10 }}>
            Status Terisi sebaiknya diisi melalui proses tambah penghuni agar
            data penghuni dan tagihan tetap sinkron.
          </div>
        </div>
      )}
    </>
  );
}
