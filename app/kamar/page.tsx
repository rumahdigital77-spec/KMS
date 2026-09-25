'use client';

import { useEffect, useState } from 'react';
import {
  defaultPayments,
  defaultRooms,
  defaultTenants,
  defaultTransactions,
  loadData,
  money,
  Payment,
  Room,
  saveData,
  Tenant,
  Transaction,
} from '@/lib/store';

const statusMeta = {
  occupied: { label: 'Terisi', description: 'Sedang dihuni', bg: 'linear-gradient(145deg,#047857,#10b981)', soft: '#ecfdf5', text: '#047857', icon: '🛏️' },
  available: { label: 'Tersedia', description: 'Siap disewakan', bg: 'linear-gradient(145deg,#0369a1,#06b6d4)', soft: '#ecfeff', text: '#0369a1', icon: '🔑' },
  maintenance: { label: 'Perawatan', description: 'Tidak tersedia', bg: 'linear-gradient(145deg,#b45309,#f59e0b)', soft: '#fffbeb', text: '#b45309', icon: '🔧' },
} as const;

const statuses: Room['status'][] = ['occupied', 'available', 'maintenance'];

export default function Kamar() {
  const [rooms, setRooms] = useState<Room[]>(defaultRooms);
  const [add, setAdd] = useState(false);
  const [detail, setDetail] = useState<Room | null>(null);
  const [code, setCode] = useState('');
  const [price, setPrice] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'paid'>('unpaid');
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

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
          await Promise.all(local.map((room) => fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room }),
          })));
        }
      } catch {
        setRooms(local);
      }
      const query = new URLSearchParams(window.location.search);
      if (query.get('aksi') === 'tambah') setAdd(true);
    };
    load();
  }, []);

  const resetAddForm = () => {
    setCode('');
    setPrice('');
    setTenantName('');
    setTenantPhone('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setPaymentStatus('unpaid');
    setPaymentMethod('transfer');
    setAdd(false);
    setSaving(false);
  };

  const save = () => {
    if (saving) return;
    if (!code.trim() || !price) return setMsg('Kode dan harga wajib diisi.');
    if (rooms.some((room) => room.id.toLowerCase() === code.trim().toLowerCase())) {
      return setMsg('Kode kamar sudah ada.');
    }
    if (tenantName.trim() && !startDate) return setMsg('Tanggal mulai sewa wajib diisi.');

    const roomId = code.trim().toUpperCase();
    const monthlyRent = Number(price);
    const hasTenant = Boolean(tenantName.trim());
    setSaving(true);

    const room: Room = {
      id: roomId,
      tenant: hasTenant ? tenantName.trim() : '-',
      price: monthlyRent,
      status: hasTenant ? 'occupied' : 'available',
    };
    const nextRooms = [...rooms, room];

    saveData('rooms', nextRooms);
    setRooms(nextRooms);

    fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room }),
    }).catch(() => {});

    if (!hasTenant) {
      resetAddForm();
      setMsg('Kamar berhasil ditambahkan sebagai Tersedia.');
      return;
    }

    const tenant: Tenant = {
      id: 'T-' + Date.now(),
      name: tenantName.trim(),
      room: roomId,
      phone: tenantPhone.trim(),
      startDate,
      rent: monthlyRent,
      status: 'active',
    };

    const tenants = loadData<Tenant[]>('tenants', defaultTenants);
    saveData('tenants', [...tenants, tenant]);

    const month = new Date(startDate + 'T00:00:00').toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });
    const paymentId = 'P-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

    const payment: Payment = {
      id: paymentId,
      tenant: tenant.name,
      room: roomId,
      month,
      amount: monthlyRent,
      status: paymentStatus,
      ...(paymentStatus === 'paid'
        ? {
            paidAt: new Date().toISOString().slice(0, 10),
            method: paymentMethod,
          }
        : {}),
    };

    const payments = loadData<Payment[]>('payments', defaultPayments);

    if (paymentStatus === 'paid') {
      let receiptNo = payment.receiptNo;
      try {
        const raw = localStorage.getItem('kostpro_settings');
        const settings = raw ? JSON.parse(raw) : {};
        const nextNumber = Number(settings.receiptNext || 1);
        receiptNo = (settings.receiptPrefix || 'KW') + '-' + new Date().getFullYear() + '-' + String(nextNumber).padStart(5, '0');
        localStorage.setItem('kostpro_settings', JSON.stringify({ ...settings, receiptNext: nextNumber + 1 }));
      } catch {}

      payment.receiptNo = receiptNo;

      const history = loadData<Payment[]>('paymentHistory', []);
      saveData('paymentHistory', [...history.filter((item) => item.id !== payment.id), payment]);

      const transactions = loadData<Transaction[]>('transactions', defaultTransactions);
      const transaction: Transaction = {
        id: 'TR-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        date: payment.paidAt || new Date().toISOString().slice(0, 10),
        description: 'Pembayaran awal sewa ' + tenant.name + ' - ' + roomId + ' - ' + month,
        category: 'Pendapatan sewa',
        amount: monthlyRent,
        type: 'income',
        referenceId: payment.id,
      };
      saveData('transactions', [...transactions, transaction]);

      resetAddForm();
      setMsg('Kamar, penghuni, pembayaran awal, dan transaksi berhasil dicatat. Membuka kwitansi untuk dicetak...');
      window.location.href = '/kwitansi?id=' + encodeURIComponent(payment.id) + '&print=1';
      return;
    }

    saveData('payments', [...payments, payment]);
    resetAddForm();
    setMsg('Kamar dan penghuni berhasil dibuat. Tagihan pertama dibuat sebagai Belum Bayar.');
    window.location.href = '/tagihan?id=' + encodeURIComponent(payment.id) + '&baru=1';
  };

  const changeStatus = (id: string, status: Room['status']) => {
    const nextRooms = rooms.map((room) =>
      room.id === id
        ? { ...room, status, tenant: status === 'available' || status === 'maintenance' ? '-' : room.tenant }
        : room
    );
    setRooms(nextRooms);
    saveData('rooms', nextRooms);
    const room = nextRooms.find((item) => item.id === id);
    if (room) fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room }),
    }).catch(() => {});
    setDetail(room || null);
  };

  return (
    <>
      <div className="top">
        <div>
          <div className="title">Manajemen Kamar</div>
          <div className="sub">Pantau hunian dan kelola status setiap unit</div>
        </div>
        <button className="btn" onClick={() => setAdd(!add)}>+ Tambah Kamar</button>
      </div>

      {msg && <div className="card" style={{ marginBottom: 18 }}>{msg}</div>}

      <div className="grid">
        {statuses.map((status) => {
          const meta = statusMeta[status];
          const count = rooms.filter((room) => room.status === status).length;
          return (
            <div className="card" key={status} style={{ background: meta.bg, color: '#fff', border: 'none', boxShadow: '0 12px 28px rgba(15,23,42,.14)' }}>
              <div className="label" style={{ color: 'rgba(255,255,255,.82)' }}>{meta.icon} {meta.label}</div>
              <div className="metric" style={{ color: '#fff' }}>{count}</div>
              <div style={{ opacity: 0.82, fontSize: 13 }}>{meta.description}</div>
            </div>
          );
        })}
      </div>

      {add && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="section-title">Tambah Kamar + Penghuni & Pembayaran</div>
          <div className="sub" style={{ marginBottom: 14 }}>
            Isi nama penghuni jika kamar langsung ditempati. Jika pembayaran dibuat Lunas, sistem otomatis mencatat transaksi dan membuka kwitansi untuk dicetak.
          </div>
          <div className="form">
            <div className="field">
              <label>Kode Kamar</label>
              <input value={code} onChange={(e) => { setCode(e.target.value); }} placeholder="K-07" />
            </div>
            <div className="field">
              <label>Harga / bulan</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1500000" />
            </div>
            <div className="field">
              <label>Nama Penghuni (opsional)</label>
              <input value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="Nama penghuni" />
            </div>
            <div className="field">
              <label>Telepon</label>
              <input value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
            </div>
            <div className="field">
              <label>Mulai Sewa</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Status Pembayaran Awal</label>
              <select
                value={hasTenant ? paymentStatus : 'unpaid'}
                disabled={!tenantName.trim()}
                onChange={(e) => setPaymentStatus(e.target.value as 'unpaid' | 'paid')}
              >
                <option value="unpaid">Belum Bayar</option>
                <option value="paid">Lunas</option>
              </select>
            </div>
            <div className="field">
              <label>Model Payment</label>
              <select
                value={paymentMethod}
                disabled={!tenantName.trim() || paymentStatus !== 'paid'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="transfer">Transfer</option>
                <option value="cash">Cash</option>
                <option value="qris">QRIS</option>
              </select>
            </div>
          </div>
          <div className="actions">
            <button className="btn" onClick={save} disabled={saving}>
              {saving ? 'Menyimpan...' : paymentStatus === 'paid' && tenantName.trim() ? 'Simpan + Lunas + Cetak Kwitansi' : 'Simpan Kamar'}
            </button>
            <button className="btn secondary" onClick={resetAddForm} disabled={saving}>Batal</button>
          </div>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead><tr><th>Kamar</th><th>Penghuni</th><th>Harga / bulan</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {rooms.map((room) => {
              const meta = statusMeta[room.status];
              return (
                <tr key={room.id}>
                  <td><b>{room.id}</b></td>
                  <td>{room.tenant}</td>
                  <td>{money(room.price)}</td>
                  <td><span className="badge" style={{ background: meta.soft, color: meta.text, border: '1px solid rgba(15,23,42,.08)', fontWeight: 800 }}>{meta.icon} {meta.label}</span></td>
                  <td><button className="btn secondary" onClick={() => setDetail(room)}>Kelola Status</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="section-title">Kelola {detail.id}</div>
          <p>Penghuni: <b>{detail.tenant}</b></p>
          <p>Harga: <b>{money(detail.price)}</b></p>
          <p>Status saat ini: <span className="badge" style={{ background: statusMeta[detail.status].soft, color: statusMeta[detail.status].text, fontWeight: 800 }}>{statusMeta[detail.status].icon} {statusMeta[detail.status].label}</span></p>
          <div className="actions">
            {statuses.map((status) => {
              const meta = statusMeta[status];
              return <button key={status} className="btn" disabled={detail.status === status} onClick={() => changeStatus(detail.id, status)} style={{ background: meta.bg, color: '#fff', border: 'none', opacity: detail.status === status ? 0.55 : 1 }}>{meta.icon} {meta.label}</button>;
            })}
            <button className="btn secondary" onClick={() => setDetail(null)}>Tutup</button>
          </div>
          <div className="sub" style={{ marginTop: 10 }}>Status Terisi sebaiknya diisi melalui proses tambah penghuni agar data penghuni dan tagihan tetap sinkron.</div>
        </div>
      )}
    </>
  );
}
