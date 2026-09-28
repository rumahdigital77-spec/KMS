'use client';

import { useEffect, useMemo, useState } from 'react';
import { defaultPayments, defaultTenants, defaultTransactions, loadData, money, Payment, Tenant, Transaction } from '@/lib/store';

type MasterRow = {
  tenant: Tenant;
  payments: Payment[];
  transactions: Transaction[];
};

export default function MasterBill() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const active = loadData<Tenant[]>('tenants', defaultTenants)
      .filter(x => (x.status || 'active') === 'active');
    const allPayments = loadData<Payment[]>('payments', defaultPayments);
    const allTransactions = loadData<Transaction[]>('transactions', defaultTransactions);
    setTenants(active);
    setPayments(allPayments);
    setTransactions(allTransactions);
    const requested = new URLSearchParams(location.search).get('id');
    if (active.length) setSelectedId(requested && active.some(x => x.id === requested) ? requested : active[0].id);
  }, []);

  const rows = useMemo<MasterRow[]>(() => tenants.map(tenant => {
    const tenantPayments = payments.filter(p =>
      (p.tenantId && p.tenantId === tenant.id) ||
      (!p.tenantId && p.tenant === tenant.name && p.room === tenant.room)
    );
    const tenantTransactions = transactions.filter(tx =>
      tenantPayments.some(p => tx.referenceId === p.id) ||
      tx.description.toLowerCase().includes(tenant.name.toLowerCase()) ||
      tx.description.toLowerCase().includes(tenant.room.toLowerCase())
    );
    return { tenant, payments: tenantPayments, transactions: tenantTransactions };
  }), [tenants, payments, transactions]);

  const selected = rows.find(x => x.tenant.id === selectedId) || rows[0];

  const totalBilling = selected?.payments.reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalPaid = selected?.payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalUnpaid = selected?.payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalIncome = selected?.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalExpense = selected?.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;

  if (!tenants.length) {
    return <div className="card"><div className="section-title">Master Bill</div><div className="sub">Belum ada penghuni aktif. Master Bill akan menampilkan billing setelah tamu melakukan C.I dan berstatus aktif.</div></div>;
  }

  return <>
    <div className="top">
      <div>
        <div className="title">Master Bill — Preview</div>
        <div className="sub">Ringkasan billing dan transaksi tamu kamar aktif, ditampilkan sebagai preview informasi.</div>
      </div>
    </div>

    {msg && <div className="card" style={{ marginBottom: 18 }}>{msg}</div>}

    <div className="card" style={{ marginBottom: 18 }}>
      <div className="section-title">Pilih Tamu Kamar Aktif</div>
      <div className="form">
        <div className="field full">
          <label>Penghuni / Kamar</label>
          <select value={selected?.tenant.id || ''} onChange={e => { setSelectedId(e.target.value); setMsg(''); }}>
            {rows.map(row => <option key={row.tenant.id} value={row.tenant.id}>{row.tenant.name} — {row.tenant.room}</option>)}
          </select>
        </div>
      </div>
    </div>

    {selected && <>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="section-title">Detail Tamu</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
          <div><div className="sub">Nama</div><b>{selected.tenant.name}</b></div>
          <div><div className="sub">Kamar</div><b>{selected.tenant.room}</b></div>
          <div><div className="sub">Mulai Sewa</div><b>{selected.tenant.startDate}</b></div>
          <div><div className="sub">Berakhir</div><b>{selected.tenant.endDate || '-'}</b></div>
          <div><div className="sub">Sewa / Bulan</div><b>{money(selected.tenant.rent)}</b></div>
        </div>
      </div>

      <div className="grid" style={{ marginBottom: 18 }}>
        <div className="card" style={{ borderTop:"3px solid #667eea" }}><div className="label">TOTAL BILLING</div><div className="metric">{money(totalBilling)}</div><div className="sub">{selected.payments.length} periode billing</div></div>
        <div className="card" style={{ borderTop:"3px solid #16a34a" }}><div className="label">SUDAH DIBAYAR</div><div className="metric">{money(totalPaid)}</div><div className="sub">Penerimaan</div></div>
        <div className="card" style={{ borderTop:"3px solid #dc2626" }}><div className="label">BELUM DIBAYAR</div><div className="metric">{money(totalUnpaid)}</div><div className="sub">Piutang aktif</div></div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="section-title">Preview Billing</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Periode</th><th>Nomor Billing</th><th>Nominal</th><th>Status</th><th>Tanggal Bayar</th><th>Metode</th></tr></thead>
            <tbody>
              {selected.payments.map(p => <tr key={p.id}>
                <td>{p.month}</td>
                <td>{p.receiptNo || p.id}</td>
                <td>{money(p.amount)}</td>
                <td><span className={'badge ' + (p.status === 'paid' ? 'green' : 'red')}>{p.status === 'paid' ? 'Lunas' : 'Belum Bayar'}</span></td>
                <td>{p.paidAt || '-'}</td>
                <td>{p.method || '-'}</td>
              </tr>)}
              {!selected.payments.length && <tr><td colSpan={6}>Belum ada billing untuk tamu ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Preview Transaksi Tamu</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Tanggal</th><th>Deskripsi</th><th>Kategori</th><th>Jenis</th><th>Nominal</th></tr></thead>
            <tbody>
              {selected.transactions.map(tx => <tr key={tx.id}>
                <td>{tx.date}</td>
                <td>{tx.description}</td>
                <td>{tx.category}</td>
                <td><span className={'badge ' + (tx.type === 'income' ? 'green' : 'red')}>{tx.type === 'income' ? 'Debet' : 'Kredit'}</span></td>
                <td>{money(tx.amount)}</td>
              </tr>)}
              {!selected.transactions.length && <tr><td colSpan={5}>Belum ada transaksi terkait tamu ini.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 14 }}>
          <span className="sub">Pendapatan terkait: <b>{money(totalIncome)}</b></span>
          <span className="sub">Pengeluaran terkait: <b>{money(totalExpense)}</b></span>
        </div>
      </div>
    </>}
  </>;
}