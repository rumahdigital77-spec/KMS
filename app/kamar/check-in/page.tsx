'use client';

import { useEffect, useState } from 'react';
import { defaultPayments, defaultRooms, defaultTenants, loadData, money, Payment, Room, Tenant, saveData } from '@/lib/store';

export default function CheckInTamu() {
  const [rooms, setRooms] = useState<Room[]>(defaultRooms);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [room, setRoom] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [rent, setRent] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = () => {
      const data = loadData<Room[]>('rooms', defaultRooms);
      setRooms(data);
      const first = data.find(x => x.status === 'available');
      if (first && !room) {
        setRoom(first.id);
        setRent(String(first.price || ''));
      }
    };
    load();
    const onSaved = () => load();
    window.addEventListener('kostpro:data-saved', onSaved);
    window.addEventListener('kostpro:data-scope-changed', onSaved);
    return () => {
      window.removeEventListener('kostpro:data-saved', onSaved);
      window.removeEventListener('kostpro:data-scope-changed', onSaved);
    };
  }, [room]);

  const availableRooms = rooms.filter(x => x.status === 'available');

  function chooseRoom(id: string) {
    setRoom(id);
    const selected = rooms.find(x => x.id === id);
    if (selected) setRent(String(selected.price || ''));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    const selected = rooms.find(x => x.id === room);
    if (!selected || selected.status !== 'available') return setMessage('Pilih kamar yang masih Available / Ready.');
    if (!name.trim()) return setMessage('Nama tamu wajib diisi.');
    if (!startDate) return setMessage('Tanggal Check In wajib diisi.');
    if (!rent || Number(rent) <= 0) return setMessage('Harga kamar wajib diisi.');

    const roomPrice = Number(rent);
    setSaving(true);

    try {
      const tenants = loadData<Tenant[]>('tenants', defaultTenants);
      const payments = loadData<Payment[]>('payments', defaultPayments);

      const tenant: Tenant = {
        id: 'TEN-' + Date.now(),
        name: name.trim(),
        room: selected.id,
        phone: phone.trim(),
        startDate,
        rent: roomPrice,
        ...(endDate ? { endDate } : {}),
        status: 'active',
      };

      const nextTenants = [...tenants, tenant];
      const nextRooms = rooms.map(x =>
        x.id === selected.id
          ? { ...x, tenant: tenant.name, price: roomPrice, status: 'occupied' as const }
          : x
      );

      const month = new Date(startDate + 'T00:00:00').toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
      });
      const payment: Payment = {
        id: 'P-' + Date.now(),
        tenant: tenant.name,
        room: selected.id,
        month,
        amount: roomPrice,
        status: 'unpaid',
      };
      const nextPayments = [...payments, payment];

      await Promise.all([
        saveData('tenants', nextTenants),
        saveData('rooms', nextRooms),
        saveData('payments', nextPayments),
      ]);

      setRooms(nextRooms);
      setName('');
      setPhone('');
      setEndDate('');
      setRoom('');
      setRent('');

      // Setelah C.I., langsung buka pembuatan/preview kwitansi dengan
      // nominal harga kamar yang baru disimpan. Kwitansi resmi tetap
      // hanya bisa dicetak/dikirim setelah pembayaran dilunasi.
      location.href = '/kwitansi?id=' + encodeURIComponent(payment.id) + '&baru=1';
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Check In gagal disimpan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="top">
        <div>
          <div className="title">Check In Tamu Kamar</div>
          <div className="sub">Input tamu baru hanya menampilkan kamar yang berstatus Available / Ready.</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 900 }}>
        <div className="section-title">Form Check In</div>
        <div className="sub" style={{ marginBottom: 14 }}>
          Harga Kamar menjadi nilai utama C.I. dan otomatis disinkronkan ke Penghuni Kamar,
          Manajemen Kamar, Tagihan, Keuangan, dan Kwitansi.
        </div>

        <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
          <div className="grid">
            <label>
              Nama Tamu
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap" />
            </label>
            <label>
              No. WhatsApp / Telepon
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
            </label>
            <label>
              Kamar Available / Ready
              <select value={room} onChange={e => chooseRoom(e.target.value)}>
                <option value="">Pilih kamar</option>
                {availableRooms.map(x => (
                  <option key={x.id} value={x.id}>{x.id} — {money(x.price)}</option>
                ))}
              </select>
            </label>
            <label>
              Harga Kamar / Bulan
              <input type="number" min="0" value={rent} onChange={e => setRent(e.target.value)} placeholder="Masukkan harga kamar" />
            </label>
            <label>
              Tanggal Check In
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </label>
            <label>
              Tanggal Check Out / Akhir Sewa (opsional)
              <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
            </label>
          </div>

          {!availableRooms.length && (
            <div className="sub">Tidak ada kamar Available / Ready. Silakan ubah status kamar terlebih dahulu.</div>
          )}

          {message && (
            <div style={{ padding: 12, borderRadius: 10, background: '#f0fdf4', color: '#166534', fontWeight: 700 }}>
              {message}
            </div>
          )}

          <button className="btn" type="submit" disabled={saving || !availableRooms.length}>
            {saving ? 'MENYIMPAN...' : 'CHECK IN TAMU'}
          </button>
        </form>
      </div>
    </>
  );
}
