'use client';

// KOSTPRO active tenant UI

import { useEffect, useState } from 'react';
import { defaultRooms, defaultTenants, defaultPayments, loadData, money, normalizeMoney, Room, saveData, Tenant, Payment } from '@/lib/store';

function addOneMonth(date:string) {
  const d = new Date(date + 'T00:00:00');
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function defaultEndDate(start:string) {
  return addOneMonth(start);
}

function effectiveEndDate(t:Tenant) {
  return t.endDate || defaultEndDate(t.startDate);
}

function periodLabel(date:string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { month:'long', year:'numeric' });
}

export default function Penghuni() {
  const [t,setT] = useState<Tenant[]>(defaultTenants);
  const [r,setR] = useState<Room[]>(defaultRooms);
  const [show,setShow] = useState(false);
  const [edit,setEdit] = useState<Tenant|null>(null);
  const [name,setName] = useState('');
  const [room,setRoom] = useState('');
  const [phone,setPhone] = useState('');
  const [date,setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [endDate,setEndDate] = useState('');
  const [rent,setRent] = useState('');
  const [msg,setMsg] = useState('');
  const [moveTenant,setMoveTenant] = useState<Tenant|null>(null);
  const [moveRoom,setMoveRoom] = useState('');
  const [busy,setBusy] = useState(false);
  const [selectedActiveRoom,setSelectedActiveRoom] = useState('');

  useEffect(() => {
    const run = async () => {
      await archiveOldCheckoutHistory();
      let tenants = loadData<Tenant[]>('tenants', defaultTenants);
      let history = loadData<Tenant[]>('tenantHistory', []);
      let rooms = loadData<Room[]>('rooms', defaultRooms);
      const today = new Date().toISOString().slice(0,10);
      const expired = tenants.filter(x => (x.status || 'active') === 'active' && effectiveEndDate(x) <= today);

      if (expired.length) {
        const ids = new Set(expired.map(x => x.id));
        const moved = expired.map(x => ({ ...x, endDate: effectiveEndDate(x), status:'history' as const, checkoutReason:'expired' as const }));
        history = [...history, ...moved.filter(x => !history.some(h => h.id === x.id))];
        tenants = tenants.filter(x => !ids.has(x.id));

        const payments = loadData<Payment[]>('payments', defaultPayments);
        const paymentHistory = loadData<Payment[]>('paymentHistory', []);
        const movedPayments = payments.filter(p => expired.some(tn => ((p.tenantId && p.tenantId === tn.id) || (!p.tenantId && p.tenant === tn.name && p.room === tn.room)) && p.status === 'paid'));
        const keepPayments = payments.filter(p => !movedPayments.some(h => h.id === p.id));
        const mergedPaymentHistory = [
          ...paymentHistory,
          ...movedPayments.filter(p => !paymentHistory.some(h => h.id === p.id))
        ];
        rooms = rooms.map(x => expired.some(tn => tn.room === x.id)
          ? { ...x, tenant:'-', status:'available' as const }
          : x);

        try {
          await Promise.all([
            saveData('tenantHistory', history),
            saveData('paymentHistory', mergedPaymentHistory),
            saveData('tenants', tenants),
            saveData('payments', keepPayments),
            saveData('rooms', rooms),
          ]);
          setMsg(expired.map(x => x.name).join(', ') + ' otomatis C.O. karena masa sewa berakhir. Pembayaran lunas dipindahkan ke History Payment.');
        } catch (error) {
          setMsg(error instanceof Error ? `Gagal menyimpan C.O. otomatis: ${error.message}` : 'Gagal menyimpan C.O. otomatis ke database.');
        }
      }

      setT(tenants.filter(x => (x.status || 'active') === 'active'));
      setR(rooms);
      if (new URLSearchParams(location.search).get('aksi') === 'tambah') setShow(true);
    };
    void run();
  }, []);

  const reset = () => {
    setName(''); setRoom(''); setPhone('');
    setDate(new Date().toISOString().slice(0,10));
    setEndDate(''); setRent(''); setEdit(null); setShow(false); setMoveTenant(null); setMoveRoom('');
  };

  const add = async () => {
    if (busy) return;
    const rm = r.find(x => x.id === room);
    const monthlyRent = normalizeMoney(rent || rm?.price);
    if (!name.trim() || !rm) return setMsg('Nama dan kamar wajib diisi.');
    if (rm.status !== 'available') return setMsg('Kamar tidak tersedia.');
    if (!monthlyRent) return setMsg('Harga sewa wajib diisi.');
    if (!date) return setMsg('Tanggal mulai sewa wajib diisi.');
    const resolvedEndDate = endDate || defaultEndDate(date);
    if (resolvedEndDate <= date) return setMsg('Tanggal berakhir harus setelah tanggal mulai sewa.');

    const nt:Tenant = {
      id:'T-'+Date.now(), name:name.trim(), room, phone:phone.trim(), startDate:date,
      endDate:resolvedEndDate, rent:monthlyRent, status:'active'
    };
    const nr = r.map(x => x.id === room ? { ...x, tenant:nt.name, price:monthlyRent, status:'occupied' as const } : x);
    const allTenants = loadData<Tenant[]>('tenants', defaultTenants);
    const tt = [...allTenants, nt];
    const month = periodLabel(date);
    const paymentId = 'P-'+Date.now();
    const np = [
      ...loadData<Payment[]>('payments', defaultPayments),
      { id:paymentId, tenantId:nt.id, tenant:nt.name, room, month, amount:monthlyRent, status:'unpaid' as const } as Payment
    ];

    try {
      setBusy(true);
      await Promise.all([saveData('tenants',tt), saveData('rooms',nr), saveData('payments',np)]);
      setT(tt.filter(x => (x.status || 'active') === 'active')); setR(nr);
      location.href='/tagihan?id='+encodeURIComponent(paymentId)+'&baru=1';
    } catch(error) {
      setMsg(error instanceof Error ? `Gagal menyimpan data: ${error.message}` : 'Gagal menyimpan data ke database.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (x:Tenant) => {
    setEdit(x); setName(x.name); setRoom(x.room); setPhone(x.phone);
    setDate(x.startDate); setEndDate(x.endDate || defaultEndDate(x.startDate));
    setRent(String(x.rent)); setShow(true);
    setMsg('Edit data penghuni. Nominal tagihan aktif yang belum lunas ikut diselaraskan.');
  };

  const update = async () => {
    if (busy) return;
    if (!edit || !name.trim()) return setMsg('Nama wajib diisi.');
    const newRoom = r.find(x => x.id === room);
    if (!newRoom) return setMsg('Kamar wajib dipilih.');
    if (room !== edit.room && newRoom.status !== 'available') return setMsg('Kamar tujuan tidak tersedia.');

    const monthlyRent = normalizeMoney(rent || newRoom.price);
    if (!monthlyRent) return setMsg('Harga sewa wajib diisi.');
    if (!date) return setMsg('Tanggal mulai sewa wajib diisi.');
    const resolvedEndDate = endDate || defaultEndDate(date);
    if (resolvedEndDate <= date) return setMsg('Tanggal berakhir harus setelah tanggal mulai sewa.');

    const updated:Tenant = {
      ...edit, name:name.trim(), room, phone:phone.trim(), startDate:date,
      endDate:resolvedEndDate, rent:monthlyRent, status:'active'
    };
    const allTenants = loadData<Tenant[]>('tenants', defaultTenants);
    const tt = allTenants.map(x => x.id === edit.id ? updated : x);
    const rr = r.map(x => {
      if (x.id === edit.room && x.id !== room) return { ...x, tenant:'-', status:'available' as const };
      if (x.id === room) return { ...x, tenant:updated.name, price:monthlyRent, status:'occupied' as const };
      return x;
    });

    const payments = loadData<Payment[]>('payments', defaultPayments);
    const np = payments.map(p =>
      p.status === 'unpaid' && ((p.tenantId && p.tenantId === edit.id) || (!p.tenantId && p.tenant === edit.name && p.room === edit.room))
        ? { ...p, tenantId:updated.id, tenant:updated.name, room:updated.room, amount:monthlyRent }
        : p
    );

    try {
      setBusy(true);
      await Promise.all([saveData('tenants',tt), saveData('rooms',rr), saveData('payments',np)]);
      setT(tt.filter(x => (x.status || 'active') === 'active')); setR(rr); reset(); setMsg('Data penghuni dan tagihan aktif berhasil diselaraskan.');
    } catch(error) {
      setMsg(error instanceof Error ? `Gagal menyimpan perubahan: ${error.message}` : 'Gagal menyimpan perubahan ke database.');
    } finally {
      setBusy(false);
    }
  };

  const archiveOldCheckoutHistory = async () => {
    let history = loadData<Tenant[]>('tenantHistory', []);
    let monthly = loadData<Tenant[]>('tenantMonthlyHistory', []);
    let paymentHistory = loadData<Payment[]>('paymentHistory', defaultPayments);
    let monthlyPayments = loadData<Payment[]>('paymentMonthlyHistory', []);
    const cutoff = new Date();
    cutoff.setHours(0,0,0,0);
    cutoff.setMonth(cutoff.getMonth() - 1);
    const moving = history.filter(x => x.endDate && new Date(x.endDate + 'T00:00:00') <= cutoff);
    if (!moving.length) return;
    const ids = new Set(moving.map(x => x.id));
    monthly = [...monthly, ...moving.filter(x => !monthly.some(m => m.id === x.id))];
    history = history.filter(x => !ids.has(x.id));
    const paid = paymentHistory.filter(p => moving.some(g => (p.tenantId && p.tenantId === g.id) || (!p.tenantId && p.tenant === g.name && p.room === g.room)));
    monthlyPayments = [...monthlyPayments, ...paid.filter(p => !monthlyPayments.some(m => m.id === p.id))];
    paymentHistory = paymentHistory.filter(p => !paid.some(x => x.id === p.id));
    await Promise.all([
      saveData('tenantHistory', history),
      saveData('tenantMonthlyHistory', monthly),
      saveData('paymentHistory', paymentHistory),
      saveData('paymentMonthlyHistory', monthlyPayments),
    ]);
  };

  const checkout = async (x:Tenant) => {
    if (busy) return;
    if (!confirm('C.O / Check Out '+x.name+' dari '+x.room+'? Data akan dipindahkan ke History Tamu.')) return;
    const today = new Date().toISOString().slice(0,10);
    const history = loadData<Tenant[]>('tenantHistory', []);
    const moved = { ...x, endDate:today, status:'history' as const, checkoutReason:'checkout' as const };
    const hh = [...history.filter(h => h.id !== x.id), moved];
    const tt = t.filter(y => y.id !== x.id);
    const payments = loadData<Payment[]>('payments', defaultPayments);
    const paymentHistory = loadData<Payment[]>('paymentHistory', []);
    const movedPayments = payments.filter(p => ((p.tenantId && p.tenantId === x.id) || (!p.tenantId && p.tenant === x.name && p.room === x.room)) && p.status === 'paid');
    const keepPayments = payments.filter(p => !movedPayments.some(h => h.id === p.id));
    const mergedPaymentHistory = [...paymentHistory, ...movedPayments.filter(p => !paymentHistory.some(h => h.id === p.id))];
    const rr = r.map(y => y.id === x.room ? { ...y, tenant:'-', status:'available' as const } : y);

    try {
      setBusy(true);
      await Promise.all([
        saveData('tenantHistory',hh),
        saveData('paymentHistory',mergedPaymentHistory),
        saveData('tenants',tt),
        saveData('rooms',rr),
        saveData('payments',keepPayments)
      ]);
      setT(tt); setR(rr);
      setMsg(x.name+' sudah C.O. Kamar kembali Available. Tagihan belum lunas tetap berada di Tagihan; pembayaran lunas masuk History Payment.');
    } catch(error) {
      setMsg(error instanceof Error ? `Gagal menyimpan C.O.: ${error.message}` : 'Gagal menyimpan C.O. ke database.');
    } finally {
      setBusy(false);
    }
  };

  const moveTenantToRoom = async () => {
    if (busy) return;
    if (!moveTenant || !moveRoom || moveRoom === moveTenant.room) {
      setMsg('Pilih kamar tujuan yang berbeda.');
      return;
    }
    const target = r.find(room => room.id === moveRoom);
    if (!target || target.status !== 'available') {
      setMsg('Kamar tujuan tidak tersedia.');
      return;
    }

    const nextRooms = r.map(room => {
      if (room.id === moveTenant.room) return { ...room, tenant:'-', status:'available' as const };
      if (room.id === moveRoom) return { ...room, tenant:moveTenant.name, price:normalizeMoney(moveTenant.rent), status:'occupied' as const };
      return room;
    });
    const nextTenants = t.map(tenant =>
      tenant.id === moveTenant.id ? { ...tenant, room:moveRoom } : tenant
    );
    const payments = loadData<Payment[]>('payments', defaultPayments);
    const nextPayments = payments.map(payment =>
      payment.status === 'unpaid' &&
      ((payment.tenantId && payment.tenantId === moveTenant.id) ||
       (!payment.tenantId && payment.tenant === moveTenant.name && payment.room === moveTenant.room))
        ? { ...payment, tenantId:moveTenant.id, tenant:moveTenant.name, room:moveRoom, amount:normalizeMoney(moveTenant.rent) }
        : payment
    );

    try {
      setBusy(true);
      await Promise.all([
        saveData('tenants', nextTenants),
        saveData('rooms', nextRooms),
        saveData('payments', nextPayments),
      ]);
      setT(nextTenants);
      setR(nextRooms);
      setMoveTenant(null);
      setMoveRoom('');
      setMsg(moveTenant.name+' berhasil pindah dari '+moveTenant.room+' ke '+moveRoom+'. Tagihan yang belum lunas ikut diperbarui ke kamar baru.');
    } catch (error) {
      setMsg(error instanceof Error ? 'Gagal pindah kamar: '+error.message : 'Gagal pindah kamar ke database.');
    } finally {
      setBusy(false);
    }
  };

  const extend = async (x:Tenant) => {
    if (busy) return;
    const currentEnd = effectiveEndDate(x);
    const today = new Date().toISOString().slice(0,10);
    if (currentEnd < today) {
      return setMsg('Masa sewa penghuni ini sudah berakhir. Silakan proses C.O. atau input ulang sebagai penghuni aktif.');
    }
    const nextEnd = addOneMonth(currentEnd);
    const month = periodLabel(currentEnd);
    const payments = loadData<Payment[]>('payments', defaultPayments);
    const exists = payments.some(p => ((p.tenantId && p.tenantId === x.id) || (!p.tenantId && p.tenant === x.name && p.room === x.room)) && p.month === month);
    const nextPayment:Payment = {
      id:'P-'+Date.now(), tenantId:x.id, tenant:x.name, room:x.room, month,
      amount:normalizeMoney(x.rent), status:'unpaid'
    };
    const tt = t.map(y => y.id === x.id ? { ...y, endDate:nextEnd, status:'active' as const } : y);
    const np = exists ? payments : [...payments, nextPayment];

    try {
      setBusy(true);
      await Promise.all([saveData('tenants',tt), saveData('payments',np)]);
      setT(tt);
      setMsg(exists
        ? 'Masa sewa diperpanjang sampai '+nextEnd+'. Tagihan periode tersebut sudah tersedia.'
        : 'Masa sewa diperpanjang sampai '+nextEnd+'. Tagihan periode baru sebesar '+money(x.rent)+' sudah dibuat.');
    } catch(error) {
      setMsg(error instanceof Error ? `Gagal menyimpan perpanjangan: ${error.message}` : 'Gagal menyimpan perpanjangan ke database.');
    } finally {
      setBusy(false);
    }
  };

  return <>
    <div className="top">
      <div><div className="title">Penghuni Aktif</div><div className="sub">Kelola tamu yang masih tinggal.</div></div>
      <button className="btn" disabled={busy} onClick={()=>{reset();setShow(v=>!v)}}>+ Tambah Penghuni</button>
    </div>
    {msg && <div className="card" style={{marginBottom:18}}>{msg}</div>}
    {moveTenant && <div className="card" style={{marginBottom:18}}>
      <div className="section-title">Pindah Kamar — {moveTenant.name}</div>
      <div className="sub" style={{marginBottom:12}}>Kamar saat ini: <b>{moveTenant.room}</b>. Hanya kamar Available yang dapat dipilih.</div>
      <div className="form">
        <div className="field"><label>Kamar Tujuan</label><select value={moveRoom} onChange={e=>setMoveRoom(e.target.value)}>
          <option value="">Pilih kamar tujuan</option>
          {r.filter(room=>room.status==='available' && room.id!==moveTenant.room).map(room=><option key={room.id} value={room.id}>{room.id} — {money(room.price)}</option>)}
        </select></div>
      </div>
      <div className="actions">
        <button className="btn" disabled={busy} onClick={moveTenantToRoom}>{busy?'Menyimpan...':'Pindah Kamar'}</button>
        <button className="btn secondary" disabled={busy} onClick={()=>{setMoveTenant(null);setMoveRoom('')}}>Batal</button>
      </div>
    </div>}
    {show && <div className="card" style={{marginBottom:18}}>
      <div className="section-title">{edit?'Edit Penghuni':'Tambah Penghuni'}</div>
      <div className="form">
        <div className="field"><label>Nama</label><input value={name} onChange={e=>setName(e.target.value)}/></div>
        <div className="field"><label>Kamar</label><select value={room} onChange={e=>{setRoom(e.target.value);const x=r.find(y=>y.id===e.target.value);if(x)setRent(String(x.price))}}><option value="">Pilih kamar</option>{r.filter(x=>x.status==='available'||(edit&&x.id===edit.room)).map(x=><option key={x.id} value={x.id}>{x.id} — {money(x.price)}</option>)}</select></div>
        <div className="field"><label>Telepon</label><input value={phone} onChange={e=>setPhone(e.target.value)}/></div>
        <div className="field"><label>Mulai Sewa</label><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
        <div className="field"><label>Berakhir</label><input type="date" value={endDate || defaultEndDate(date)} min={date} onChange={e=>setEndDate(e.target.value)}/></div>
        <div className="field"><label>Sewa / bulan</label><input type="number" min="0" value={rent} onChange={e=>setRent(e.target.value)}/></div>
      </div>
      <div className="actions"><button className="btn" disabled={busy} onClick={edit?update:add}>{busy?'Menyimpan...':edit?'Simpan Perubahan':'Simpan Penghuni'}</button><button className="btn secondary" disabled={busy} onClick={reset}>Batal</button></div>
    </div>}
    <div className="card penghuni-active-panel">
      <div className="active-panel-head">
        <div>
          <div className="section-title">Penghuni Aktif</div>
          <div className="sub">Pilih kamar aktif untuk melihat seluruh informasi penghuni dan tindakan yang tersedia.</div>
        </div>
        <div className="active-count"><b>{t.length}</b><span>Kamar Aktif</span></div>
      </div>

      <div className="active-selector">
        <label>Pilih Kamar Aktif</label>
        <select value={selectedActiveRoom} onChange={e=>setSelectedActiveRoom(e.target.value)}>
          <option value="">Pilih kamar aktif...</option>
          {t.map(x=><option key={x.id} value={x.id}>{x.room} — {x.name}</option>)}
        </select>
      </div>

      {selectedActiveRoom && (() => {
        const activeTenant = t.find(x=>x.id===selectedActiveRoom);
        if (!activeTenant) return null;
        return <div className="active-detail">
          <div className="active-detail-top">
            <div>
              <div className="active-room-label">KAMAR {activeTenant.room}</div>
              <div className="active-tenant-name">{activeTenant.name}</div>
            </div>
            <div className="badge blue">AKTIF</div>
          </div>
          <div className="active-detail-grid">
            <div><span>Telepon</span><b>{activeTenant.phone || '-'}</b></div>
            <div><span>Mulai Sewa</span><b>{activeTenant.startDate}</b></div>
            <div><span>Berakhir</span><b>{effectiveEndDate(activeTenant)}</b></div>
            <div><span>Sewa / Bulan</span><b>{money(activeTenant.rent)}</b></div>
          </div>
          <div className="active-actions">
            <button className="btn secondary" disabled={busy} onClick={()=>startEdit(activeTenant)}>Edit</button>
            <button className="btn secondary" disabled={busy} onClick={()=>extend(activeTenant)}>Perpanjang</button>
            <button className="btn secondary" disabled={busy} onClick={()=>{setMoveTenant(activeTenant);setMoveRoom('')}}>Pindah Kamar</button>
            <button className="btn" disabled={busy} onClick={()=>checkout(activeTenant)}>C.O</button>
            <button className="btn secondary" disabled={busy} onClick={()=>{ location.href='/master-bill?id='+encodeURIComponent(activeTenant.id); }}>Master Bill</button>
          </div>
        </div>;
      })()}

      {!t.length && <div className="active-empty">Belum ada penghuni aktif.</div>}
    </div>nt';

import { useEffect, useState } from 'react';
import { defaultRooms, defaultTenants, defaultPayments, loadData, money, normalizeMoney, Room, saveData, Tenant, Payment } from '@/lib/store';

function addOneMonth(date:string) {
  const d = new Date(date + 'T00:00:00');
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function defaultEndDate(start:string) {
  return addOneMonth(start);
}

function effectiveEndDate(t:Tenant) {
  return t.endDate || defaultEndDate(t.startDate);
}

function periodLabel(date:string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { month:'long', year:'numeric' });
}

export default function Penghuni() {
  const [t,setT] = useState<Tenant[]>(defaultTenants);
  const [r,setR] = useState<Room[]>(defaultRooms);
  const [show,setShow] = useState(false);
  const [edit,setEdit] = useState<Tenant|null>(null);
  const [name,setName] = useState('');
  const [room,setRoom] = useState('');
  const [phone,setPhone] = useState('');
  const [date,setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [endDate,setEndDate] = useState('');
  const [rent,setRent] = useState('');
  const [msg,setMsg] = useState('');
  const [moveTenant,setMoveTenant] = useState<Tenant|null>(null);
  const [moveRoom,setMoveRoom] = useState('');
  const [busy,setBusy] = useState(false);
  const [selectedActiveRoom,setSelectedActiveRoom] = useState('');

  useEffect(() => {
    const run = async () => {
      await archiveOldCheckoutHistory();
      let tenants = loadData<Tenant[]>('tenants', defaultTenants);
      let history = loadData<Tenant[]>('tenantHistory', []);
      let rooms = loadData<Room[]>('rooms', defaultRooms);
      const today = new Date().toISOString().slice(0,10);
      const expired = tenants.filter(x => (x.status || 'active') === 'active' && effectiveEndDate(x) <= today);

      if (expired.length) {
        const ids = new Set(expired.map(x => x.id));
        const moved = expired.map(x => ({ ...x, endDate: effectiveEndDate(x), status:'history' as const, checkoutReason:'expired' as const }));
        history = [...history, ...moved.filter(x => !history.some(h => h.id === x.id))];
        tenants = tenants.filter(x => !ids.has(x.id));

        const payments = loadData<Payment[]>('payments', defaultPayments);
        const paymentHistory = loadData<Payment[]>('paymentHistory', []);
        const movedPayments = payments.filter(p => expired.some(tn => ((p.tenantId && p.tenantId === tn.id) || (!p.tenantId && p.tenant === tn.name && p.room === tn.room)) && p.status === 'paid'));
        const keepPayments = payments.filter(p => !movedPayments.some(h => h.id === p.id));
        const mergedPaymentHistory = [
          ...paymentHistory,
          ...movedPayments.filter(p => !paymentHistory.some(h => h.id === p.id))
        ];
        rooms = rooms.map(x => expired.some(tn => tn.room === x.id)
          ? { ...x, tenant:'-', status:'available' as const }
          : x);

        try {
          await Promise.all([
            saveData('tenantHistory', history),
            saveData('paymentHistory', mergedPaymentHistory),
            saveData('tenants', tenants),
            saveData('payments', keepPayments),
            saveData('rooms', rooms),
          ]);
          setMsg(expired.map(x => x.name).join(', ') + ' otomatis C.O. karena masa sewa berakhir. Pembayaran lunas dipindahkan ke History Payment.');
        } catch (error) {
          setMsg(error instanceof Error ? `Gagal menyimpan C.O. otomatis: ${error.message}` : 'Gagal menyimpan C.O. otomatis ke database.');
        }
      }

      setT(tenants.filter(x => (x.status || 'active') === 'active'));
      setR(rooms);
      if (new URLSearchParams(location.search).get('aksi') === 'tambah') setShow(true);
    };
    void run();
  }, []);

  const reset = () => {
    setName(''); setRoom(''); setPhone('');
    setDate(new Date().toISOString().slice(0,10));
    setEndDate(''); setRent(''); setEdit(null); setShow(false); setMoveTenant(null); setMoveRoom('');
  };

  const add = async () => {
    if (busy) return;
    const rm = r.find(x => x.id === room);
    const monthlyRent = normalizeMoney(rent || rm?.price);
    if (!name.trim() || !rm) return setMsg('Nama dan kamar wajib diisi.');
    if (rm.status !== 'available') return setMsg('Kamar tidak tersedia.');
    if (!monthlyRent) return setMsg('Harga sewa wajib diisi.');
    if (!date) return setMsg('Tanggal mulai sewa wajib diisi.');
    const resolvedEndDate = endDate || defaultEndDate(date);
    if (resolvedEndDate <= date) return setMsg('Tanggal berakhir harus setelah tanggal mulai sewa.');

    const nt:Tenant = {
      id:'T-'+Date.now(), name:name.trim(), room, phone:phone.trim(), startDate:date,
      endDate:resolvedEndDate, rent:monthlyRent, status:'active'
    };
    const nr = r.map(x => x.id === room ? { ...x, tenant:nt.name, price:monthlyRent, status:'occupied' as const } : x);
    const allTenants = loadData<Tenant[]>('tenants', defaultTenants);
    const tt = [...allTenants, nt];
    const month = periodLabel(date);
    const paymentId = 'P-'+Date.now();
    const np = [
      ...loadData<Payment[]>('payments', defaultPayments),
      { id:paymentId, tenantId:nt.id, tenant:nt.name, room, month, amount:monthlyRent, status:'unpaid' as const } as Payment
    ];

    try {
      setBusy(true);
      await Promise.all([saveData('tenants',tt), saveData('rooms',nr), saveData('payments',np)]);
      setT(tt.filter(x => (x.status || 'active') === 'active')); setR(nr);
      location.href='/tagihan?id='+encodeURIComponent(paymentId)+'&baru=1';
    } catch(error) {
      setMsg(error instanceof Error ? `Gagal menyimpan data: ${error.message}` : 'Gagal menyimpan data ke database.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (x:Tenant) => {
    setEdit(x); setName(x.name); setRoom(x.room); setPhone(x.phone);
    setDate(x.startDate); setEndDate(x.endDate || defaultEndDate(x.startDate));
    setRent(String(x.rent)); setShow(true);
    setMsg('Edit data penghuni. Nominal tagihan aktif yang belum lunas ikut diselaraskan.');
  };

  const update = async () => {
    if (busy) return;
    if (!edit || !name.trim()) return setMsg('Nama wajib diisi.');
    const newRoom = r.find(x => x.id === room);
    if (!newRoom) return setMsg('Kamar wajib dipilih.');
    if (room !== edit.room && newRoom.status !== 'available') return setMsg('Kamar tujuan tidak tersedia.');

    const monthlyRent = normalizeMoney(rent || newRoom.price);
    if (!monthlyRent) return setMsg('Harga sewa wajib diisi.');
    if (!date) return setMsg('Tanggal mulai sewa wajib diisi.');
    const resolvedEndDate = endDate || defaultEndDate(date);
    if (resolvedEndDate <= date) return setMsg('Tanggal berakhir harus setelah tanggal mulai sewa.');

    const updated:Tenant = {
      ...edit, name:name.trim(), room, phone:phone.trim(), startDate:date,
      endDate:resolvedEndDate, rent:monthlyRent, status:'active'
    };
    const allTenants = loadData<Tenant[]>('tenants', defaultTenants);
    const tt = allTenants.map(x => x.id === edit.id ? updated : x);
    const rr = r.map(x => {
      if (x.id === edit.room && x.id !== room) return { ...x, tenant:'-', status:'available' as const };
      if (x.id === room) return { ...x, tenant:updated.name, price:monthlyRent, status:'occupied' as const };
      return x;
    });

    const payments = loadData<Payment[]>('payments', defaultPayments);
    const np = payments.map(p =>
      p.status === 'unpaid' && ((p.tenantId && p.tenantId === edit.id) || (!p.tenantId && p.tenant === edit.name && p.room === edit.room))
        ? { ...p, tenantId:updated.id, tenant:updated.name, room:updated.room, amount:monthlyRent }
        : p
    );

    try {
      setBusy(true);
      await Promise.all([saveData('tenants',tt), saveData('rooms',rr), saveData('payments',np)]);
      setT(tt.filter(x => (x.status || 'active') === 'active')); setR(rr); reset(); setMsg('Data penghuni dan tagihan aktif berhasil diselaraskan.');
    } catch(error) {
      setMsg(error instanceof Error ? `Gagal menyimpan perubahan: ${error.message}` : 'Gagal menyimpan perubahan ke database.');
    } finally {
      setBusy(false);
    }
  };

  const archiveOldCheckoutHistory = async () => {
    let history = loadData<Tenant[]>('tenantHistory', []);
    let monthly = loadData<Tenant[]>('tenantMonthlyHistory', []);
    let paymentHistory = loadData<Payment[]>('paymentHistory', defaultPayments);
    let monthlyPayments = loadData<Payment[]>('paymentMonthlyHistory', []);
    const cutoff = new Date();
    cutoff.setHours(0,0,0,0);
    cutoff.setMonth(cutoff.getMonth() - 1);
    const moving = history.filter(x => x.endDate && new Date(x.endDate + 'T00:00:00') <= cutoff);
    if (!moving.length) return;
    const ids = new Set(moving.map(x => x.id));
    monthly = [...monthly, ...moving.filter(x => !monthly.some(m => m.id === x.id))];
    history = history.filter(x => !ids.has(x.id));
    const paid = paymentHistory.filter(p => moving.some(g => (p.tenantId && p.tenantId === g.id) || (!p.tenantId && p.tenant === g.name && p.room === g.room)));
    monthlyPayments = [...monthlyPayments, ...paid.filter(p => !monthlyPayments.some(m => m.id === p.id))];
    paymentHistory = paymentHistory.filter(p => !paid.some(x => x.id === p.id));
    await Promise.all([
      saveData('tenantHistory', history),
      saveData('tenantMonthlyHistory', monthly),
      saveData('paymentHistory', paymentHistory),
      saveData('paymentMonthlyHistory', monthlyPayments),
    ]);
  };

  const checkout = async (x:Tenant) => {
    if (busy) return;
    if (!confirm('C.O / Check Out '+x.name+' dari '+x.room+'? Data akan dipindahkan ke History Tamu.')) return;
    const today = new Date().toISOString().slice(0,10);
    const history = loadData<Tenant[]>('tenantHistory', []);
    const moved = { ...x, endDate:today, status:'history' as const, checkoutReason:'checkout' as const };
    const hh = [...history.filter(h => h.id !== x.id), moved];
    const tt = t.filter(y => y.id !== x.id);
    const payments = loadData<Payment[]>('payments', defaultPayments);
    const paymentHistory = loadData<Payment[]>('paymentHistory', []);
    const movedPayments = payments.filter(p => ((p.tenantId && p.tenantId === x.id) || (!p.tenantId && p.tenant === x.name && p.room === x.room)) && p.status === 'paid');
    const keepPayments = payments.filter(p => !movedPayments.some(h => h.id === p.id));
    const mergedPaymentHistory = [...paymentHistory, ...movedPayments.filter(p => !paymentHistory.some(h => h.id === p.id))];
    const rr = r.map(y => y.id === x.room ? { ...y, tenant:'-', status:'available' as const } : y);

    try {
      setBusy(true);
      await Promise.all([
        saveData('tenantHistory',hh),
        saveData('paymentHistory',mergedPaymentHistory),
        saveData('tenants',tt),
        saveData('rooms',rr),
        saveData('payments',keepPayments)
      ]);
      setT(tt); setR(rr);
      setMsg(x.name+' sudah C.O. Kamar kembali Available. Tagihan belum lunas tetap berada di Tagihan; pembayaran lunas masuk History Payment.');
    } catch(error) {
      setMsg(error instanceof Error ? `Gagal menyimpan C.O.: ${error.message}` : 'Gagal menyimpan C.O. ke database.');
    } finally {
      setBusy(false);
    }
  };

  const moveTenantToRoom = async () => {
    if (busy) return;
    if (!moveTenant || !moveRoom || moveRoom === moveTenant.room) {
      setMsg('Pilih kamar tujuan yang berbeda.');
      return;
    }
    const target = r.find(room => room.id === moveRoom);
    if (!target || target.status !== 'available') {
      setMsg('Kamar tujuan tidak tersedia.');
      return;
    }

    const nextRooms = r.map(room => {
      if (room.id === moveTenant.room) return { ...room, tenant:'-', status:'available' as const };
      if (room.id === moveRoom) return { ...room, tenant:moveTenant.name, price:normalizeMoney(moveTenant.rent), status:'occupied' as const };
      return room;
    });
    const nextTenants = t.map(tenant =>
      tenant.id === moveTenant.id ? { ...tenant, room:moveRoom } : tenant
    );
    const payments = loadData<Payment[]>('payments', defaultPayments);
    const nextPayments = payments.map(payment =>
      payment.status === 'unpaid' &&
      ((payment.tenantId && payment.tenantId === moveTenant.id) ||
       (!payment.tenantId && payment.tenant === moveTenant.name && payment.room === moveTenant.room))
        ? { ...payment, tenantId:moveTenant.id, tenant:moveTenant.name, room:moveRoom, amount:normalizeMoney(moveTenant.rent) }
        : payment
    );

    try {
      setBusy(true);
      await Promise.all([
        saveData('tenants', nextTenants),
        saveData('rooms', nextRooms),
        saveData('payments', nextPayments),
      ]);
      setT(nextTenants);
      setR(nextRooms);
      setMoveTenant(null);
      setMoveRoom('');
      setMsg(moveTenant.name+' berhasil pindah dari '+moveTenant.room+' ke '+moveRoom+'. Tagihan yang belum lunas ikut diperbarui ke kamar baru.');
    } catch (error) {
      setMsg(error instanceof Error ? 'Gagal pindah kamar: '+error.message : 'Gagal pindah kamar ke database.');
    } finally {
      setBusy(false);
    }
  };

  const extend = async (x:Tenant) => {
    if (busy) return;
    const currentEnd = effectiveEndDate(x);
    const today = new Date().toISOString().slice(0,10);
    if (currentEnd < today) {
      return setMsg('Masa sewa penghuni ini sudah berakhir. Silakan proses C.O. atau input ulang sebagai penghuni aktif.');
    }
    const nextEnd = addOneMonth(currentEnd);
    const month = periodLabel(currentEnd);
    const payments = loadData<Payment[]>('payments', defaultPayments);
    const exists = payments.some(p => ((p.tenantId && p.tenantId === x.id) || (!p.tenantId && p.tenant === x.name && p.room === x.room)) && p.month === month);
    const nextPayment:Payment = {
      id:'P-'+Date.now(), tenantId:x.id, tenant:x.name, room:x.room, month,
      amount:normalizeMoney(x.rent), status:'unpaid'
    };
    const tt = t.map(y => y.id === x.id ? { ...y, endDate:nextEnd, status:'active' as const } : y);
    const np = exists ? payments : [...payments, nextPayment];

    try {
      setBusy(true);
      await Promise.all([saveData('tenants',tt), saveData('payments',np)]);
      setT(tt);
      setMsg(exists
        ? 'Masa sewa diperpanjang sampai '+nextEnd+'. Tagihan periode tersebut sudah tersedia.'
        : 'Masa sewa diperpanjang sampai '+nextEnd+'. Tagihan periode baru sebesar '+money(x.rent)+' sudah dibuat.');
    } catch(error) {
      setMsg(error instanceof Error ? `Gagal menyimpan perpanjangan: ${error.message}` : 'Gagal menyimpan perpanjangan ke database.');
    } finally {
      setBusy(false);
    }
  };

  return <>
    <div className="top">
      <div><div className="title">Penghuni Aktif</div><div className="sub">Kelola tamu yang masih tinggal.</div></div>
      <button className="btn" disabled={busy} onClick={()=>{reset();setShow(v=>!v)}}>+ Tambah Penghuni</button>
    </div>
    {msg && <div className="card" style={{marginBottom:18}}>{msg}</div>}
    {moveTenant && <div className="card" style={{marginBottom:18}}>
      <div className="section-title">Pindah Kamar — {moveTenant.name}</div>
      <div className="sub" style={{marginBottom:12}}>Kamar saat ini: <b>{moveTenant.room}</b>. Hanya kamar Available yang dapat dipilih.</div>
      <div className="form">
        <div className="field"><label>Kamar Tujuan</label><select value={moveRoom} onChange={e=>setMoveRoom(e.target.value)}>
          <option value="">Pilih kamar tujuan</option>
          {r.filter(room=>room.status==='available' && room.id!==moveTenant.room).map(room=><option key={room.id} value={room.id}>{room.id} — {money(room.price)}</option>)}
        </select></div>
      </div>
      <div className="actions">
        <button className="btn" disabled={busy} onClick={moveTenantToRoom}>{busy?'Menyimpan...':'Pindah Kamar'}</button>
        <button className="btn secondary" disabled={busy} onClick={()=>{setMoveTenant(null);setMoveRoom('')}}>Batal</button>
      </div>
    </div>}
    {show && <div className="card" style={{marginBottom:18}}>
      <div className="section-title">{edit?'Edit Penghuni':'Tambah Penghuni'}</div>
      <div className="form">
        <div className="field"><label>Nama</label><input value={name} onChange={e=>setName(e.target.value)}/></div>
        <div className="field"><label>Kamar</label><select value={room} onChange={e=>{setRoom(e.target.value);const x=r.find(y=>y.id===e.target.value);if(x)setRent(String(x.price))}}><option value="">Pilih kamar</option>{r.filter(x=>x.status==='available'||(edit&&x.id===edit.room)).map(x=><option key={x.id} value={x.id}>{x.id} — {money(x.price)}</option>)}</select></div>
        <div className="field"><label>Telepon</label><input value={phone} onChange={e=>setPhone(e.target.value)}/></div>
        <div className="field"><label>Mulai Sewa</label><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
        <div className="field"><label>Berakhir</label><input type="date" value={endDate || defaultEndDate(date)} min={date} onChange={e=>setEndDate(e.target.value)}/></div>
        <div className="field"><label>Sewa / bulan</label><input type="number" min="0" value={rent} onChange={e=>setRent(e.target.value)}/></div>
      </div>
      <div className="actions"><button className="btn" disabled={busy} onClick={edit?update:add}>{busy?'Menyimpan...':edit?'Simpan Perubahan':'Simpan Penghuni'}</button><button className="btn secondary" disabled={busy} onClick={reset}>Batal</button></div>
    </div>}
    <div className="card penghuni-active-panel">
      <div className="active-panel-head">
        <div>
          <div className="section-title">Penghuni Aktif</div>
          <div className="sub">Pilih kamar aktif untuk melihat informasi penghuni dan tindakan yang tersedia.</div>
        </div>
        <div className="active-count"><b>{t.length}</b><span>Kamar Aktif</span></div>
      </div>
      <div className="active-selector">
        <label htmlFor="active-room-select">Pilih Kamar Aktif</label>
        <select id="active-room-select" value={selectedActiveRoom} disabled={!t.length} onChange={e=>setSelectedActiveRoom(e.target.value)}>
          <option value="">{t.length ? 'Pilih kamar aktif...' : 'Belum ada kamar aktif'}</option>
          {t.map(x=><option key={x.id} value={x.id}>{x.room} — {x.name}</option>)}
        </select>
      </div>
      {selectedActiveRoom && (() => {
        const activeTenant = t.find(x=>x.id===selectedActiveRoom);
        if (!activeTenant) return null;
        return (
          <div className="active-detail">
            <div className="active-detail-top">
              <div>
                <div className="active-room-label">KAMAR {activeTenant.room}</div>
                <div className="active-tenant-name">{activeTenant.name}</div>
              </div>
              <div className="badge blue">AKTIF</div>
            </div>
            <div className="active-detail-grid">
              <div><span>Telepon</span><b>{activeTenant.phone || '-'}</b></div>
              <div><span>Mulai Sewa</span><b>{activeTenant.startDate}</b></div>
              <div><span>Berakhir</span><b>{effectiveEndDate(activeTenant)}</b></div>
              <div><span>Sewa / Bulan</span><b>{money(activeTenant.rent)}</b></div>
            </div>
            <div className="active-actions">
              <button className="btn secondary" disabled={busy} onClick={()=>startEdit(activeTenant)}>Edit</button>
              <button className="btn secondary" disabled={busy} onClick={()=>extend(activeTenant)}>Perpanjang</button>
              <button className="btn secondary" disabled={busy} onClick={()=>{setMoveTenant(activeTenant);setMoveRoom('')}}>Pindah Kamar</button>
              <button className="btn" disabled={busy} onClick={()=>checkout(activeTenant)}>C.O</button>
              <button className="btn secondary" disabled={busy} onClick={()=>{ location.href='/master-bill?id='+encodeURIComponent(activeTenant.id); }}>Master Bill</button>
            </div>
          </div>
        );
      })()}
      {!t.length && <div className="active-empty">Belum ada penghuni aktif.</div>}
    </div>
    <style jsx>{`
      .active-panel-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:20px}
      .active-count{min-width:88px;padding:10px 14px;border:1px solid #e5e7eb;border-radius:14px;background:linear-gradient(145deg,#fff,#f7f8fb);text-align:center;box-shadow:0 6px 18px rgba(15,23,42,.06)}
      .active-count b{display:block;font-size:22px;line-height:1.1;font-variant-numeric:tabular-nums}
      .active-count span{display:block;margin-top:4px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em}
      .active-selector{padding:18px;border:1px solid #e5e7eb;border-radius:18px;background:linear-gradient(145deg,#fff,#f8fafc);box-shadow:0 8px 24px rgba(15,23,42,.05)}
      .active-selector label{display:block;margin-bottom:8px;font-size:12px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.06em}
      .active-selector select{width:100%;height:48px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;padding:0 14px;font-weight:700;color:#0f172a;outline:none}
      .active-detail{margin-top:16px;padding:20px;border-radius:18px;background:linear-gradient(145deg,#f8fafc,#fff);border:1px solid #e2e8f0}
      .active-detail-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
      .active-room-label{font-size:11px;font-weight:800;letter-spacing:.08em;color:#64748b}
      .active-tenant-name{margin-top:4px;font-size:24px;font-weight:850;letter-spacing:-.02em;color:#0f172a}
      .active-detail-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}
      .active-detail-grid>div{padding:13px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}
      .active-detail-grid span{display:block;font-size:11px;color:#64748b;margin-bottom:5px}
      .active-detail-grid b{display:block;font-size:14px;color:#0f172a;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
      .active-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
      .active-empty{padding:30px;text-align:center;color:#64748b}
      @media(max-width:700px){
        .active-panel-head{align-items:flex-start}
        .active-count{min-width:78px}
        .active-tenant-name{font-size:20px}
        .active-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .active-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
        .active-actions .btn{width:100%}
      }
    `}</style>
  </>;\n}
