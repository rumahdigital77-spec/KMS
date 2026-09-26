'use client';

import { useEffect, useState } from 'react';
import {
  defaultPayments,
  defaultTransactions,
  loadData,
  money,
  Payment,
  saveData,
  syncPaymentTransactions,
  Transaction,
} from '@/lib/store';

export default function Tagihan() {
  const [payments, setPayments] = useState<Payment[]>(defaultPayments);
  const [processing, setProcessing] = useState(false);
  const [show, setShow] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [method, setMethod] = useState('transfer');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const currentPayments = loadData<Payment[]>('payments', defaultPayments);
    syncPaymentTransactions();
    setPayments(currentPayments);

    const query = new URLSearchParams(window.location.search);
    const paymentId = query.get('id');

    if (paymentId) {
      setSelectedId(paymentId);
      setShow(true);
      if (query.get('baru') === '1') {
        setMessage(
          'Penghuni baru berhasil dibuat. Tagihan pertama sudah dibuat. Pilih metode pembayaran lalu simpan.'
        );
      }
    } else if (query.get('aksi') === 'catat') {
      setShow(true);
    }
  }, []);

  const pay = () => {
    if (processing) return;

    if (!selectedId) {
      setMessage('Pilih tagihan.');
      return;
    }

    const current = payments.find((item) => item.id === selectedId);

    if (!current) {
      setMessage('Tagihan tidak ditemukan.');
      return;
    }

    if (current.status === 'paid') {
      setMessage('Tagihan ini sudah lunas.');
      return;
    }

    setProcessing(true);

    const paidAt = new Date().toISOString().slice(0, 10);
    let receiptNo = current.receiptNo;

    try {
      const settings = loadData<Record<string, any>>('settings', {});
      const nextNumber = Number(settings.receiptNext || 1);

      if (!receiptNo) {
        receiptNo =
          (settings.receiptPrefix || 'KW') +
          '-' +
          new Date().getFullYear() +
          '-' +
          String(nextNumber).padStart(5, '0');

        saveData('settings', { ...settings, receiptNext: nextNumber + 1 });
      }
    } catch {
      // Receipt numbering failure must not prevent payment recording.
    }

    const paidPayment: Payment = {
      ...current,
      status: 'paid',
      paidAt,
      method,
      receiptNo,
    };

    const activePayments = payments.filter((item) => item.id !== selectedId);

    const paymentHistory = loadData<Payment[]>('paymentHistory', []);
    const historyWithoutDuplicate = paymentHistory.filter(
      (item) => item.id !== paidPayment.id
    );
    const nextPaymentHistory = [...historyWithoutDuplicate, paidPayment];

    const existingTransactions = loadData<Transaction[]>(
      'transactions',
      defaultTransactions
    );

    const alreadyRecorded = existingTransactions.some(
      (item) => item.referenceId === current.id
    );

    const transaction: Transaction = {
      id: 'TR-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      date: paidAt,
      description:
        'Pelunasan sewa ' +
        current.tenant +
        ' - ' +
        current.room +
        ' - ' +
        current.month,
      category: 'Pendapatan sewa',
      amount: Number(current.amount) || 0,
      type: 'income',
      referenceId: current.id,
    };

    const nextTransactions = alreadyRecorded
      ? existingTransactions
      : [...existingTransactions, transaction];

    saveData('payments', activePayments);
    saveData('paymentHistory', nextPaymentHistory);
    saveData('transactions', nextTransactions);

    setPayments(activePayments);
    setShow(false);
    setProcessing(false);
    setMessage(
      alreadyRecorded
        ? 'Tagihan lunas dan dipindahkan ke history. Membuka kwitansi...'
        : 'Pelunasan berhasil. Transaksi dan kwitansi sudah dicatat. Membuka kwitansi...'
    );

    window.location.href =
      '/kwitansi?id=' + encodeURIComponent(current.id);
  };

  const openPayment = (id: string) => {
    setSelectedId(id);
    setShow(true);
    setMessage('');
  };

  return (
    <>
      <div className="top">
        <div>
          <div className="title">Tagihan & Pembayaran</div>
          <div className="sub">
            Alur: penghuni baru - tagihan - pelunasan - transaksi - kwitansi
          </div>
        </div>

        <button
          className="btn"
          onClick={() => {
            setShow(!show);
            setMessage('');
          }}
        >
          + Catat Pembayaran
        </button>
      </div>

      {message && (
        <div className="card" style={{ marginBottom: 18 }}>
          {message}
        </div>
      )}

      {show && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="section-title">Pelunasan Tagihan</div>
          <div className="sub" style={{ marginBottom: 14 }}>
            Pilih tagihan yang akan dibayar. Setelah disimpan, sistem otomatis
            mencatat transaksi dan membuka kwitansi.
          </div>

          <div className="form">
            <div className="field full">
              <label>Tagihan</label>
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                <option value="">Pilih tagihan belum lunas</option>
                {payments
                  .filter((item) => item.status === 'unpaid')
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.tenant} - {item.room} - {money(item.amount)}
                    </option>
                  ))}
              </select>
            </div>

            <div className="field">
              <label>Metode</label>
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value)}
              >
                <option value="transfer">Transfer</option>
                <option value="cash">Cash</option>
                <option value="qris">QRIS</option>
              </select>
            </div>
          </div>

          <div className="actions">
            <button
              className="btn"
              onClick={pay}
              disabled={processing}
            >
              {processing ? 'Menyimpan...' : 'Simpan & Lunas + Buat Kwitansi'}
            </button>

            <button
              className="btn secondary"
              onClick={() => setShow(false)}
              disabled={processing}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Penghuni</th>
              <th>Kamar</th>
              <th>Periode</th>
              <th>Nominal</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((item) => (
              <tr key={item.id}>
                <td>
                  <b>{item.tenant}</b>
                </td>
                <td>{item.room}</td>
                <td>{item.month}</td>
                <td>{money(item.amount)}</td>
                <td>
                  <span
                    className={
                      'badge ' + (item.status === 'paid' ? 'green' : 'red')
                    }
                  >
                    {item.status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                  </span>
                </td>
                <td>
                  {item.status === 'unpaid' ? (
                    <button
                      className="btn secondary"
                      onClick={() => openPayment(item.id)}
                    >
                      Pelunasan -&gt; Kwitansi
                    </button>
                  ) : (
                    <button
                      className="btn secondary"
                      onClick={() =>
                        (window.location.href =
                          '/kwitansi?id=' + encodeURIComponent(item.id))
                      }
                    >
                      Lihat Kwitansi
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
