'use client';

import { useEffect, useState } from 'react';
import { loadData, money, Payment, Tenant } from '@/lib/store';

export default function HistoryLaporanBulanan() {
  const [guests,setGuests]=useState<Tenant[]>([]);
  const [payments,setPayments]=useState<Payment[]>([]);

  useEffect(() => {
    setGuests(loadData<Tenant[]>('tenantMonthlyHistory', []));
    setPayments(loadData<Payment[]>('paymentMonthlyHistory', []));
  }, []);

  const total = payments.reduce((a,b)=>a+b.amount,0);

  return <div className="laporan-page">
    <div className="top">
      <div><div className="title">History Laporan Bulanan</div><div className="sub">Arsip tamu C.O dan pembayaran yang telah melewati masa penyimpanan 1 bulan.</div></div>
    </div>
    <div className="grid">
      <div className="card"><div className="label">Arsip Tamu</div><div className="metric">{guests.length}</div></div>
      <div className="card"><div className="label">Pembayaran Arsip</div><div className="metric">{payments.length}</div></div>
      <div className="card"><div className="label">Total Pembayaran Arsip</div><div className="metric" style={{fontSize:20}}>{money(total)}</div></div>
    </div>
    <div className="card" style={{marginTop:18}}>
      <div className="section-title">Arsip Tamu C.O</div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Nama</th><th>Kamar</th><th>Masuk</th><th>C.O</th><th>Harga/Bulan</th><th>Keterangan</th></tr></thead>
      <tbody>{guests.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.room}</td><td>{x.startDate}</td><td>{x.endDate||'-'}</td><td>{money(x.rent)}</td><td>{x.checkoutReason==='expired'?'Masa aktif berakhir':x.checkoutReason==='transferred'?'Pindah kamar':'C.O manual'}</td></tr>)}{!guests.length&&<tr><td colSpan={6}>Belum ada arsip laporan bulanan.</td></tr>}</tbody></table></div>
    </div>
    <div className="card" style={{marginTop:18}}>
      <div className="section-title">Arsip Pembayaran</div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Guest</th><th>Kamar</th><th>Periode</th><th>Tanggal Lunas</th><th>Metode</th><th>Nominal</th><th>Kwitansi</th></tr></thead>
      <tbody>{payments.map(x=><tr key={x.id}><td><b>{x.tenant}</b></td><td>{x.room}</td><td>{x.month}</td><td>{x.paidAt||'-'}</td><td>{x.method||'-'}</td><td>{money(x.amount)}</td><td>{x.receiptNo||'-'}</td></tr>)}{!payments.length&&<tr><td colSpan={7}>Belum ada arsip pembayaran bulanan.</td></tr>}</tbody></table></div>
    </div>
  </div>;
}
