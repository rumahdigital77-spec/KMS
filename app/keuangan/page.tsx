'use client';

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
          <div className="title finance-page-title">Laporan Keuangan</div>
          <div className="sub finance-page-sub">Arus kas, pendapatan, beban dan hasil usaha</div>
        </div>
        <button className="btn finance-add-btn" onClick={() => setShow(!show)}>+ Catat Transaksi</button>
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
          <div className="label finance-label">TOTAL PENDAPATAN</div>
          <div className="metric finance-metric">{money(income)}</div>
        </div>
        <div className="card">
          <div className="label finance-label">TOTAL BEBAN</div>
          <div className="metric finance-metric">{money(expense)}</div>
        </div>
        <div className="card">
          <div className="label finance-label">LABA / (RUGI) BERSIH</div>
          <div className={`metric finance-metric ${result < 0 ? 'result-negative' : 'result-positive'}`}>{resultDisplay}</div>
        </div>
      </div>

      <div className="card finance-report-card">
        <div className="finance-report-header">
          <div>
            <div className="section-title finance-report-title">Laporan Laba Rugi</div>
            <div className="sub">Laporan hasil usaha berdasarkan transaksi yang tercatat.</div>
          </div>
          <button className="btn secondary" onClick={() => window.print()}>Cetak Laporan</button>
        </div>

        <div className="report-sheet">
          <div className="report-heading">
            <div className="report-brand">KOSTPRO • LAPORAN KEUANGAN</div>
            <div className="report-title">LAPORAN LABA RUGI</div>
            <div className="report-subtitle">Berdasarkan transaksi yang tercatat dalam sistem</div>
          </div>

          <div className="report-table" role="table" aria-label="Laporan laba rugi">
            <div className="report-row report-head" role="row">
              <div role="columnheader">URAIAN</div>
              <div role="columnheader">DEBET</div>
              <div role="columnheader">KREDIT</div>
            </div>

            <div className="report-section" role="row">
              <div>PENDAPATAN</div>
            </div>

            {incomeTransactions.length ? incomeTransactions.map((item) => (
              <div className="report-row report-data" role="row" key={item.id}>
                <div className="report-description" role="cell">{item.description || 'Pendapatan'}</div>
                <div className="report-amount" role="cell">—</div>
                <div className="report-amount" role="cell">{money(item.amount)}</div>
              </div>
            )) : (
              <div className="report-row report-data" role="row">
                <div className="report-description report-empty" role="cell">Belum ada pendapatan</div>
                <div role="cell">—</div>
                <div role="cell">—</div>
              </div>
            )}

            <div className="report-row report-total" role="row">
              <div role="cell">Total Pendapatan</div>
              <div className="report-amount" role="cell">—</div>
              <div className="report-amount" role="cell">{money(income)}</div>
            </div>

            <div className="report-section" role="row">
              <div>PENGELUARAN</div>
            </div>

            {expenseTransactions.length ? expenseTransactions.map((item) => (
              <div className="report-row report-data" role="row" key={item.id}>
                <div className="report-description" role="cell">{item.description || 'Pengeluaran'}</div>
                <div className="report-amount" role="cell">{money(item.amount)}</div>
                <div className="report-amount" role="cell">—</div>
              </div>
            )) : (
              <div className="report-row report-data" role="row">
                <div className="report-description report-empty" role="cell">Belum ada beban</div>
                <div role="cell">—</div>
                <div role="cell">—</div>
              </div>
            )}

            <div className="report-row report-total" role="row">
              <div role="cell">Total Beban</div>
              <div className="report-amount" role="cell">{money(expense)}</div>
              <div className="report-amount" role="cell">—</div>
            </div>

            <div className="report-result-divider" aria-hidden="true" />

            <div className="report-row report-result" role="row">
              <div role="cell">LABA / (RUGI) BERSIH</div>
              <div className="report-amount" role="cell">{result < 0 ? '(' + money(Math.abs(result)) + ')' : '—'}</div>
              <div className="report-amount" role="cell">{result >= 0 ? money(result) : '—'}</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .result-positive{color:#15803d}
        .result-negative{color:#b91c1c}
        .finance-page-title{font-size:20px!important;font-weight:800!important;letter-spacing:-.025em}
        .finance-page-sub{font-size:12px!important;line-height:1.45}
        .finance-add-btn{font-size:12px!important;padding:8px 12px!important;font-weight:700!important}
        .finance-label{font-size:10px!important;letter-spacing:.08em;font-weight:800!important;line-height:1.3}
        .finance-metric{font-size:20px!important;line-height:1.15;font-weight:800!important;letter-spacing:-.02em;font-variant-numeric:tabular-nums lining-nums}

        .finance-report-card{margin-top:18px;overflow:hidden}
        .finance-report-header{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start;margin-bottom:22px}
        .finance-report-title{font-size:18px!important}
        .report-sheet{width:100%;box-sizing:border-box;border:1px solid #d8dee6;border-radius:12px;background:#fff;padding:20px;box-shadow:0 10px 30px rgba(15,23,42,.07);overflow:hidden}
        .report-heading{text-align:center;margin-bottom:22px}
        .report-brand{font-size:12px;font-weight:800;letter-spacing:1.2px;color:#6b7280}
        .report-title{font-size:19px;font-weight:800;margin-top:5px}
        .report-subtitle{font-size:11px;color:#6b7280;margin-top:4px}

        .report-table{width:100%;font-size:11px;font-variant-numeric:tabular-nums lining-nums}
        .report-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(112px,124px) minmax(112px,124px);width:100%;box-sizing:border-box}
        .report-row>div{min-width:0;box-sizing:border-box}
        .report-head{border-top:2px solid #111827;border-bottom:1px solid #111827;font-weight:800}
        .report-head>div{padding:11px 10px}
        .report-head>div:nth-child(n+2){text-align:right;white-space:nowrap}
        .report-section{display:block;padding:14px 10px 7px;font-weight:800;background:#f8fafc}
        .report-data>div{padding:8px 10px;min-height:36px;display:flex;align-items:flex-start}
        .report-description{padding-left:24px!important;font-weight:700;white-space:normal;overflow-wrap:anywhere;word-break:break-word;line-height:1.45}
        .report-amount{justify-content:flex-end;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:clip;line-height:1.45}
        .report-empty{color:#9ca3af;font-weight:500}
        .report-total{border-top:1px solid #e5e7eb;font-weight:800}
        .report-total>div{padding:10px}
        .report-total>div:nth-child(n+2){text-align:right;white-space:nowrap}
        .report-result-divider{border-top:2px solid #111827;margin-top:6px}
        .report-result{font-weight:900;font-size:13px}
        .report-result>div{padding:14px 10px}
        .report-result>div:nth-child(n+2){text-align:right;white-space:nowrap}

        @media(max-width:700px){
          .report-sheet{padding:14px;border-radius:10px}
          .report-row{grid-template-columns:minmax(0,1fr) minmax(92px,98px) minmax(92px,98px)}
          .report-table{font-size:10px}
          .report-head>div,.report-data>div,.report-total>div,.report-result>div{padding-left:6px;padding-right:6px}
          .report-description{padding-left:12px!important}
        }
        @media(max-width:480px){
          .finance-page-title{font-size:18px!important}
          .finance-page-sub{font-size:11px!important}
          .finance-add-btn{font-size:11px!important;padding:7px 10px!important}
          .finance-label{font-size:9px!important}
          .finance-metric{font-size:17px!important}
          .report-sheet{padding:10px}
          .report-brand{font-size:10px;letter-spacing:.9px}
          .report-title{font-size:16px}
          .report-subtitle{font-size:10px}
          .report-row{grid-template-columns:minmax(0,1fr) minmax(88px,92px) minmax(88px,92px)}
          .report-table{font-size:9px}
          .report-description{padding-left:8px!important}
          .report-data>div{min-height:34px}
          .report-result{font-size:10.5px}
        }
        @media print{
          .finance-report-card{margin-top:0;box-shadow:none}
          .report-sheet{box-shadow:none;border:0;padding:0}
          .report-row{grid-template-columns:minmax(0,1fr) 110px 110px}
          .report-description{overflow-wrap:break-word}
        }
      `}</style>
    </>
  );
}
