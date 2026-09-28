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
        <div className="sub">Pilih tamu/kamar aktif, lihat masa sewa dan harga, billing, pembayaran, transaksi terkait, serta ringkasan pendapatan dan pengeluaran.</div>
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
        <div className="section-title">Informasi Tamu</div>
        <div className="master-info-grid">
          <div><div className="sub">Nama</div><b>{selected.tenant.name}</b></div>
          <div><div className="sub">Kamar</div><b>{selected.tenant.room}</b></div>
          <div><div className="sub">Mulai Sewa</div><b>{selected.tenant.startDate}</b></div>
          <div><div className="sub">Berakhir</div><b>{selected.tenant.endDate || '-'}</b></div>
          <div><div className="sub">Sewa / Bulan</div><b>{money(selected.tenant.rent)}</b></div>
        </div>
      </div>

      <div className="grid" style={{ marginBottom: 18 }}>
        <div className="card"><div className="label master-label">TOTAL BILLING</div><div className="metric master-metric">{money(totalBilling)}</div></div>
        <div className="card"><div className="label master-label">SUDAH DIBAYAR</div><div className="metric master-metric">{money(totalPaid)}</div></div>
        <div className="card"><div className="label master-label">BELUM DIBAYAR</div><div className="metric master-metric">{money(totalUnpaid)}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 18, overflow: 'hidden' }}>
        <div className="master-report-sheet">
          <div className="master-report-heading">
            <div className="master-kicker">KOSTPRO • MASTER BILL</div>
            <div className="master-report-title">RINGKASAN BILLING & TRANSAKSI TAMU</div>
            <div className="master-report-sub">Preview informasi transaksi untuk tamu kamar aktif</div>
            <div className="master-guest-line">{selected.tenant.name} · Kamar {selected.tenant.room}</div>
          </div>

          <div className="master-report-grid">
            <div className="master-head">URAIAN</div>
            <div className="master-head right">DEBET</div>
            <div className="master-head right">KREDIT</div>

            <div className="master-section">DETAIL BILLING</div>
            {selected.payments.length ? selected.payments.map(p => (
              <div key={'bill-'+p.id} className="master-row">
                <div><b>{p.month}</b><span className="master-detail">{p.receiptNo || p.id}  · Nomor: {p.receiptNo || p.id} · Status: {p.status === 'paid' ? 'Sudah Dibayar' : 'Belum Dibayar'} · Metode: {p.method || '-'}</span></div>
                <div className="right">{money(p.amount)}</div>
                <div className="right">—</div>
              </div>
            )) : (
              <div className="master-empty">Belum ada billing untuk tamu ini.</div>
            )}
            <div className="master-total"><b>Total Billing</b><b className="right">{money(totalBilling)}</b><b className="right">—</b></div>

            <div className="master-section">PEMBAYARAN</div>
            {selected.payments.filter(p => p.status === 'paid').length ? selected.payments.filter(p => p.status === 'paid').map(p => (
              <div key={'pay-'+p.id} className="master-row">
                <div><b>{p.month}</b><span className="master-detail">{p.paidAt || '-'} · {p.method || 'Metode pembayaran'}</span></div>
                <div className="right">—</div>
                <div className="right">{money(p.amount)}</div>
              </div>
            )) : (
              <div className="master-empty">Belum ada pembayaran lunas.</div>
            )}
            <div className="master-total"><b>Sudah Dibayar</b><b className="right">—</b><b className="right">{money(totalPaid)}</b></div>

            <div className="master-section">TRANSAKSI TERKAIT TAMU</div>
            {selected.transactions.length ? selected.transactions.map(tx => (
              <div key={tx.id} className="master-row">
                <div><b>{tx.description}</b><span className="master-detail">{tx.date} · {tx.category}</span></div>
                <div className="right">{tx.type === 'expense' ? money(tx.amount) : '—'}</div>
                <div className="right">{tx.type === 'income' ? money(tx.amount) : '—'}</div>
              </div>
            )) : (
              <div className="master-empty">Belum ada transaksi terkait tamu ini.</div>
            )}
            <div className="master-total"><b>Ringkasan Pengeluaran</b><b className="right">{money(totalExpense)}</b><b className="right">—</b></div>
            <div className="master-total"><b>Ringkasan Pendapatan</div>

            <div className="master-net">
              <b>SISA TAGIHAN</b>
              <b className="right">{money(totalUnpaid)}</b>
              <b className="right">—</b>
            </div>
          </div>
        </div>
      </div>
    </>}
    <style jsx>{`
      .master-info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
      .master-label{font-size:10px!important;letter-spacing:.04em}.master-metric{font-size:20px!important;line-height:1.15}
      .master-report-sheet{border:1px solid #dfe3e8;border-radius:12px;background:#fff;padding:16px;box-shadow:0 8px 24px rgba(15,23,42,.06);overflow:hidden}
      .master-report-heading{text-align:center;margin-bottom:24px}
      .master-kicker{font-size:12px;font-weight:700;letter-spacing:1.2px;color:#6b7280}
      .master-report-title{font-size:19px;font-weight:800;margin-top:5px}
      .master-report-sub{font-size:11px;color:#6b7280;margin-top:4px}
      .master-guest-line{font-size:12px;font-weight:800;margin-top:10px}
      .master-report-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(90px,120px) minmax(90px,120px);font-size:11.5px;border-top:2px solid #111827;border-bottom:1px solid #111827}
      .master-report-grid>div{min-width:0}
      .master-head{padding:11px 8px;font-weight:800}.master-head.right,.right{text-align:right;white-space:nowrap}
      .master-section{grid-column:1 / -1;padding:14px 8px 7px;font-weight:800;background:#f8fafc}
      .master-row{display:contents}.master-row>div{padding:8px}
      .master-detail{display:block;font-size:10px;color:#6b7280;font-weight:400;margin-top:2px}
      .master-empty{grid-column:1 / -1;padding:8px 22px;color:#9ca3af}
      .master-total{display:contents}.master-total>div,.master-total>b{padding:10px 8px;border-top:1px solid #e5e7eb}
      .master-net{grid-column:1 / -1;display:grid;grid-template-columns:minmax(0,1fr) minmax(90px,120px) minmax(90px,120px);border-top:2px solid #111827;margin-top:6px;padding:14px 0;font-size:13px;font-weight:900}
      .master-net>*{padding:0 8px}
      @media(max-width:560px){
        .master-report-sheet{padding:12px;border-radius:10px}.master-report-grid{font-size:9.5px;grid-template-columns:minmax(0,1fr) minmax(72px,86px) minmax(72px,86px)}
        .master-report-grid>div{overflow-wrap:anywhere}.master-head,.master-row>div{padding-left:5px;padding-right:5px}
        .master-report-title{font-size:16px}.master-kicker{font-size:10px}.master-report-sub{font-size:10px}.master-guest-line{font-size:11px}
        .master-detail{font-size:8.5px}.master-net{grid-template-columns:minmax(0,1fr) minmax(72px,86px) minmax(72px,86px);font-size:11px}
        .master-net>*{padding-left:5px;padding-right:5px}.master-label{font-size:9px!important}.master-metric{font-size:17px!important}
      }
    `}</style>
  </>;

}