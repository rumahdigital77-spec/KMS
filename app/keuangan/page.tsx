'use client';

import { useEffect, useMemo, useState } from 'react';
import { defaultTransactions, loadData, money, saveData, Transaction } from '@/lib/store';

export default function Keuangan() {
  const [transactions, setTransactions] = useState<Transaction[]>(defaultTransactions);
  const [show, setShow] = useState(false);
  const [type, setType] = useState<Transaction['type']>('expense');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('Operasional');
  const [amt, setAmt] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setTransactions(loadData('transactions', defaultTransactions));
    if (new URLSearchParams(location.search).get('aksi') === 'tambah') setShow(true);
  }, []);

  const income = useMemo(
    () => transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0),
    [transactions]
  );
  const expense = useMemo(
    () => transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0),
    [transactions]
  );
  const result = income - expense;

  const expenseByCategory = useMemo(() => {
    const grouped = new Map<string, number>();
    transactions
      .filter((item) => item.type === 'expense')
      .forEach((item) => grouped.set(item.category || 'Beban Lainnya', (grouped.get(item.category || 'Beban Lainnya') || 0) + item.amount));
    return Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  const incomeByCategory = useMemo(() => {
    const grouped = new Map<string, number>();
    transactions
      .filter((item) => item.type === 'income')
      .forEach((item) => grouped.set(item.category || 'Pendapatan Lainnya', (grouped.get(item.category || 'Pendapatan Lainnya') || 0) + item.amount));
    return Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  const add = () => {
    if (!desc || !amt) {
      setMsg('Keterangan dan nominal wajib diisi.');
      return;
    }
    const next = [
      ...transactions,
      {
        id: 'TR-' + Date.now(),
        date: new Date().toISOString().slice(0, 10),
        description: desc,
        category: cat,
        amount: +amt,
        type,
      },
    ];
    setTransactions(next);
    saveData('transactions', next);
    setDesc('');
    setAmt('');
    setShow(false);
    setMsg('Transaksi berhasil dicatat.');
  };

  return (
    <>
      <div className="top">
        <div>
          <div className="title">Laporan Keuangan</div>
          <div className="sub">Arus kas, pendapatan, beban dan hasil usaha</div>
        </div>
        <button className="btn" onClick={() => setShow(!show)}>+ Catat Transaksi</button>
      </div>

      {msg && <div className="card" style={{ marginBottom: 18 }}>{msg}</div>}

      {show && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="section-title">Catat Transaksi</div>
          <div className="form">
            <div className="field">
              <label>Jenis</label>
              <select value={type} onChange={(e) => setType(e.target.value as Transaction['type'])}>
                <option value="expense">Pengeluaran / Beban</option>
                <option value="income">Pendapatan</option>
              </select>
            </div>
            <div className="field">
              <label>Kategori / Akun</label>
              <input value={cat} onChange={(e) => setCat(e.target.value)} />
            </div>
            <div className="field full">
              <label>Keterangan</label>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div className="field">
              <label>Nominal</label>
              <input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} />
            </div>
          </div>
          <div className="actions">
            <button className="btn" onClick={add}>Simpan Transaksi</button>
            <button className="btn secondary" onClick={() => setShow(false)}>Batal</button>
          </div>
        </div>
      )}

      <div className="grid">
        <div className="card">
          <div className="label">TOTAL PENDAPATAN</div>
          <div className="metric">{money(income)}</div>
        </div>
        <div className="card">
          <div className="label">TOTAL BEBAN</div>
          <div className="metric">{money(expense)}</div>
        </div>
        <div className="card">
          <div className="label">LABA / (RUGI) BERSIH</div>
          <div className="metric">{money(result)}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div className="section-title" style={{ fontSize: 22 }}>Laporan Laba Rugi</div>
            <div className="sub">Laporan hasil usaha berdasarkan transaksi yang tercatat.</div>
          </div>
          <button className="btn secondary" onClick={() => window.print()}>Cetak Laporan</button>
        </div>

        <div style={{ border: '1px solid #dfe3e8', borderRadius: 12, background: '#fff', padding: '22px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: '#6b7280' }}>KOSTPRO • LAPORAN KEUANGAN</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 5 }}>LAPORAN LABA RUGI</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Berdasarkan transaksi yang tercatat dalam sistem</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 0, borderTop: '2px solid #111827', borderBottom: '1px solid #111827', fontSize: 13 }}>
            <div style={{ padding: '11px 8px', fontWeight: 800 }}>URAIAN</div>
            <div style={{ padding: '11px 8px', fontWeight: 800, textAlign: 'right', minWidth: 130 }}>DEBET</div>
            <div style={{ padding: '11px 8px', fontWeight: 800, textAlign: 'right', minWidth: 130 }}>KREDIT</div>

            <div style={{ gridColumn: '1 / -1', padding: '14px 8px 7px', fontWeight: 800, background: '#f8fafc' }}>PENDAPATAN</div>
            {incomeByCategory.length ? incomeByCategory.map(([category, amount]) => (
              <div key={'income-' + category} style={{ display: 'contents' }}>
                <div style={{ padding: '7px 8px 7px 22px' }}>{category}</div>
                <div style={{ padding: '7px 8px', textAlign: 'right' }}>—</div>
                <div style={{ padding: '7px 8px', textAlign: 'right' }}>{money(amount)}</div>
              </div>
            )) : (
              <><div style={{ padding: '7px 8px 7px 22px', color: '#9ca3af' }}>Belum ada pendapatan</div><div /><div /></>
            )}
            <div style={{ padding: '10px 8px', fontWeight: 800, borderTop: '1px solid #e5e7eb' }}>Total Pendapatan</div>
            <div style={{ padding: '10px 8px', textAlign: 'right', borderTop: '1px solid #e5e7eb' }}>—</div>
            <div style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, borderTop: '1px solid #e5e7eb' }}>{money(income)}</div>

            <div style={{ gridColumn: '1 / -1', padding: '14px 8px 7px', fontWeight: 800, background: '#f8fafc' }}>BEBAN / PENGELUARAN</div>
            {expenseByCategory.length ? expenseByCategory.map(([category, amount]) => (
              <div key={'expense-' + category} style={{ display: 'contents' }}>
                <div style={{ padding: '7px 8px 7px 22px' }}>{category}</div>
                <div style={{ padding: '7px 8px', textAlign: 'right' }}>{money(amount)}</div>
                <div style={{ padding: '7px 8px', textAlign: 'right' }}>—</div>
              </div>
            )) : (
              <><div style={{ padding: '7px 8px 7px 22px', color: '#9ca3af' }}>Belum ada beban</div><div /><div /></>
            )}
            <div style={{ padding: '10px 8px', fontWeight: 800, borderTop: '1px solid #e5e7eb' }}>Total Beban</div>
            <div style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, borderTop: '1px solid #e5e7eb' }}>{money(expense)}</div>
            <div style={{ padding: '10px 8px', textAlign: 'right', borderTop: '1px solid #e5e7eb' }}>—</div>

            <div style={{ gridColumn: '1 / -1', borderTop: '2px solid #111827', marginTop: 6 }} />
            <div style={{ padding: '14px 8px', fontWeight: 900, fontSize: 15 }}>LABA / (RUGI) BERSIH</div>
            <div style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 900 }}>{result < 0 ? money(Math.abs(result)) : '—'}</div>
            <div style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 900 }}>{result >= 0 ? money(result) : '—'}</div>
          </div>

          <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 10, border: '1px solid #dfe3e8', background: '#f8fafc' }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Hasil periode: {result >= 0 ? 'LABA BERSIH' : 'RUGI BERSIH'}</div>
            <div className="sub" style={{ marginTop: 4 }}>
              Pendapatan (Kredit) {money(income)} dikurangi Beban (Debet) {money(expense)} = {money(result)}.
            </div>
          </div>

          <div style={{ marginTop: 16, fontSize: 11, color: '#6b7280', lineHeight: 1.6 }}>
            Catatan: penyajian Debet/Kredit di atas digunakan untuk klasifikasi pendapatan dan beban pada laporan laba rugi. Ini bukan jurnal umum berpasangan; transaksi jurnal lengkap memerlukan akun lawan seperti Kas/Bank.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-title">Transaksi Terbaru</div>
        <table className="table">
          <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Jenis</th><th>Nominal</th></tr></thead>
          <tbody>
            {transactions.map((item) => (
              <tr key={item.id}>
                <td>{item.date}</td>
                <td>{item.description}</td>
                <td>{item.category}</td>
                <td>{item.type === 'income' ? 'Pendapatan' : 'Beban'}</td>
                <td>{item.type === 'expense' ? '-' : ''}{money(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
