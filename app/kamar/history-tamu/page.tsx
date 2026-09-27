'use client';

import { useEffect, useState } from 'react';
import { defaultPayments, loadData, money, Payment, saveData, Tenant } from '@/lib/store';

function olderThanOneMonth(date: string) {
  const d = new Date(date + 'T00:00:00');
  const cutoff = new Date();
  cutoff.setHours(0,0,0,0);
  cutoff.setMonth(cutoff.getMonth() - 1);
  return d <= cutoff;
}

export default function HistoryTamuKamar() {
  const [guests,setGuests]=useState<Tenant[]>([]);
  const [payments,setPayments]=useState<Payment[]>([]);
  const [msg,setMsg]=useState('');

  useEffect(() => {
    const run = async () => {
      let history = loadData<Tenant[]>('tenantHistory', []);
      let monthly = loadData<Tenant[]>('tenantMonthlyHistory', []);
      let paymentHistory = loadData<Payment[]>('paymentHistory', defaultPayments);
      let monthlyPayments = loadData<Payment[]>('paymentMonthlyHistory', []);
      const moving = history.filter(x => Boolean(x.endDate) && olderThanOneMonth(x.endDate!));

      if (moving.length) {
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
        setMsg(moving.length + ' data tamu C.O dipindahkan ke History Laporan Bulanan karena sudah lebih dari 1 bulan.');
      }

      setGuests(history);
      setPayments(paymentHistory.filter(p => history.some(g => (p.tenantId && p.tenantId === g.id) || (!p.tenantId && p.tenant === g.name && p.room === g.room))));
    };
    void run();
  }, []);

  return <div className="laporan-page">
    <div className="top">
      <div><div className="title">History Tamu Kamar</div><div className="sub">Database sementara untuk semua tamu yang sudah C.O. Data otomatis dipindahkan ke History Laporan Bulanan setelah lebih dari 1 bulan sejak C.O.</div></div>
    </div>
    {msg && <div className="card" style={{marginBottom:18}}>{msg}</div>}
    <div className="grid">
      <div className="card"><div className="label">Tamu C.O</div><div className="metric">{guests.length}</div></div>
      <div className="card"><div className="label">Pembayaran C.O</div><div className="metric">{payments.length}</div></div>
      <div className="card"><div className="label">Total Pembayaran</div><div className="metric" style={{fontSize:20}}>{money(payments.reduce((a,b)=>a+b.amount,0))}</div></div>
    </div>
    <div className="card" style={{marginTop:18}}>
      <div className="section-title">Database History Tamu C.O</div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Nama</th><th>Kamar</th><th>Telepon</th><th>Masuk</th><th>C.O</th><th>Harga/Bulan</th><th>Status</th></tr></thead>
      <tbody>{guests.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.room}</td><td>{x.phone||'-'}</td><td>{x.startDate}</td><td>{x.endDate||'-'}</td><td>{money(x.rent)}</td><td>{x.checkoutReason==='expired'?'Masa aktif berakhir':x.checkoutReason==='transferred'?'Pindah kamar':'C.O manual'}</td></tr>)}{!guests.length&&<tr><td colSpan={7}>Belum ada tamu C.O.</td></tr>}</tbody></table></div>
    </div>
  </div>;
}
