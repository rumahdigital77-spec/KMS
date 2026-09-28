'use client';
// Responsive report layout hardened for small screens.

import { useEffect, useMemo, useState } from 'react';
import { defaultTransactions, loadData, money, normalizeMoney, saveData, Transaction } from '@/lib/store';

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
  const resultDisplay = result < 0 ? '(' + money(Math.abs(result)) + ')' : '+' + money(result);

  const incomeTransactions = useMemo(() => transactions.filter((item) => item.type === 'income'), [transactions]);
  const expenseTransactions = useMemo(() => transactions.filter((item) => item.type === 'expense'), [transactions]);

  const add = async () => {
    const parsedAmount = Number(amt);
    if (!desc.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMsg('Keterangan dan nominal harus diisi. Nominal harus lebih besar dari Rp0.');
      return;
    }
    const amount = normalizeMoney(parsedAmount);
    if (amount <= 0) {
      setMsg('Nominal transaksi harus lebih besar dari Rp0.');
      return;
    }
    const next = [
      ...transactions,
      {
        id: 'TR-' + Date.now(),
        date: new Date().toISOString().slice(0, 10),
        description: desc.trim(),
        category: cat.trim() || 'Operasional',
        amount,
        type,
      },
    ];

    try {
      await saveData('transactions', next);
      setTransactions(next);
      setDesc('');
      setAmt('');
      setShow(false);
      setMsg('Transaksi berhasil disimpan ke database.');
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Transaksi gagal disimpan ke database.');
    }
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
          <div className="metric finance-metric">{money(income)}</div>
        </div>
        <div className="card">
          <div className="label">TOTAL BEBAN</div>
          <div className="metric finance-metric">{money(expense)}</div>
        </div>
        <div className="card">
          <div className="label">LABA / (RUGI) BERSIH</div>
          <div className={`metric finance-metric ${result < 0 ? 'result-negative' : 'result-positive'}`}>{resultDisplay}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div className="section-title" style={{ fontSize: 20 }}>Laporan Laba Rugi</div>
            <div className="sub">Laporan hasil usaha berdasarkan transaksi yang tercatat.</div>
          </div>
          <button className="btn secondary" onClick={() => window.print()}>Cetak Laporan</button>
        </div>

        <div className="report-sheet" style={{ border: '1px solid #dfe3e8', borderRadius: 12, background: '#fff', padding: '18px 18px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: '#6b7280' }}>KOSTPRO • LAPORAN KEUANGAN</div>
            <div style={{ fontSize: 21, fontWeight: 800, marginTop: 5 }}>LAPORAN LABA RUGI</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Berdasarkan transaksi yang tercatat dalam sistem</div>
          </div>

          <div className="report-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(90px,120px) minmax(90px,120px)', gap: 0, borderTop: '2px solid #111827', borderBottom: '1px solid #111827', fontSize: 12.5 }}>
            <div style={{ padding: '11px 8px', fontWeight: 800 }}>URAIAN</div>
            <div style={{ padding: '11px 8px', fontWeight: 800, textAlign: 'right', minWidth: 120 }}>DEBET</div>
            <div style={{ padding: '11px 8px', fontWeight: 800, textAlign: 'right', minWidth: 130 }}>KREDIT</div>

            <div style={{ gridColumn: '1 / -1', padding: '14px 8px 7px', fontWeight: 800, background: '#f8fafc' }}>PENDAPATAN</div>
            {incomeTransactions.length ? incomeTransactions.map((item) => (
              <div key={item.id} style={{ display: 'contents' }}>
                <div style={{ padding: '8px 8px 8px 22px', fontWeight: 700 }}>{item.description || 'Pendapatan'}</div>
                <div style={{ padding: '7px 8px', textAlign: 'right' }}>—</div>
                <div style={{ padding: '7px 8px', textAlign: 'right' }}>{money(item.amount)}</div>
              </div>
            )) : (
              <><div style={{ padding: '7px 8px 7px 22px', color: '#9ca3af' }}>Belum ada pendapatan</div><div /><div /></>
            )}
            <div style={{ padding: '10px 8px', fontWeight: 800, borderTop: '1px solid #e5e7eb' }}>Total Pendapatan</div>
            <div style={{ padding: '10px 8px', textAlign: 'right', borderTop: '1px solid #e5e7eb' }}>—</div>
            <div style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, borderTop: '1px solid #e5e7eb' }}>{money(income)}</div>

            <div style={{ gridColumn: '1 / -1', padding: '14px 8px 7px', fontWeight: 800, background: '#f8fafc' }}>PENGELUARAN</div>
            {expenseTransactions.length ? expenseTransactions.map((item) => (
              <div key={item.id} style={{ display: 'contents' }}>
                <div style={{ padding: '8px 8px 8px 22px', fontWeight: 700 }}>{item.description || 'Pengeluaran'}</div>
                <div style={{ padding: '7px 8px', textAlign: 'right' }}>{money(item.amount)}</div>
                <div style={{ padding: '7px 8px', textAlign: 'right' }}>—</div>
              </div>
            )) : (
              <><div style={{ padding: '7px 8px 7px 22px', color: '#9ca3af' }}>Belum ada beban</div><div /><div /></>
            )}
            <div style={{ padding: '10px 8px', fontWeight: 800, borderTop: '1px solid #e5e7eb' }}>Total Beban</div>
            <div style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, borderTop: '1px solid #e5e7eb' }}>{money(expense)}</div>
            <div style={{ padding: '10px 8px', textAlign: 'right', borderTop: '1px solid #e5e7eb' }}>—</div>

            <div style={{ gridColumn: '1 / -1', borderTop: '2px solid #111827', marginTop: 6 }} />
            <div style={{ padding: '14px 8px', fontWeight: 900, fontSize: 14 }}>LABA / (RUGI) BERSIH</div>
            <div style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 900 }}>{result < 0 ? '(' + money(Math.abs(result)) + ')' : '—'}</div>
            <div style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 900 }}>{result >= 0 ? money(result) : '—'}</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .result-positive{color:#15803d}
        .result-negative{color:#b91c1c}
        .finance-metric{font-size:24px!important;line-height:1.15;letter-spacing:-.02em}
        .report-sheet{max-width:100%;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.06)}
        .report-grid{width:100%;max-width:100%;overflow:hidden}
        .report-grid>div{transition:background .15s ease}
        .report-grid>div:nth-child(3n+1){letter-spacing:.005em}
        @media(max-width:560px){
          .finance-metric{font-size:20px!important}
          .report-sheet{padding:12px!important;border-radius:10px!important}
          .report-grid{font-size:10.5px!important;grid-template-columns:minmax(0,1fr) minmax(72px,86px) minmax(72px,86px)!important}
          .report-grid>div{min-width:0;overflow-wrap:anywhere}
          .report-sheet .section-title{font-size:17px!important}
          .report-sheet .report-grid>div{padding-left:5px!important;padding-right:5px!important}
        }
      `}</style>

    </>
  );
}

 