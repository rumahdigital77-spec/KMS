'use client';

import { useEffect, useMemo, useState } from 'react';
import { defaultPayments, loadData, money, Payment } from '@/lib/store';
import { jsPDF } from 'jspdf';

type Settings = {
  name: string;
  phone: string;
  address: string;
  manager: string;
  logo: string;
  signature: string;
  receiptPrefix: string;
  receiptNext: number;
};

const defaults: Settings = {
  name: 'KOSTPRO',
  phone: '',
  address: 'Alamat properti',
  manager: 'Pengelola Kost',
  logo: '',
  signature: '',
  receiptPrefix: 'KW',
  receiptNext: 1,
};

export default function Kwitansi() {
  const [payments, setPayments] = useState<Payment[]>(defaultPayments);
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [settings, setSettings] = useState<Settings>(defaults);

  useEffect(() => {
    setPayments(loadData('payments', defaultPayments));
    try {
      const raw = localStorage.getItem('kostpro_settings');
      if (raw) setSettings({ ...defaults, ...JSON.parse(raw) });
    } catch {}

    const queryId = new URLSearchParams(window.location.search).get('id');
    if (queryId) setId(queryId);
  }, []);

  const payment =
    payments.find((item) => item.id === id) ||
    payments.find((item) => item.status === 'paid') ||
    payments[0];
  const isPaid = payment?.status === 'paid';
  const no = payment?.receiptNo || '—';

  const message = useMemo(() => {
    if (!payment) return '';
    return [
      'KWITANSI PEMBAYARAN',
      settings.name,
      settings.address,
      settings.phone,
      `No. Kwitansi: ${no}`,
      `Penghuni: ${payment.tenant}`,
      `Kamar: ${payment.room}`,
      `Periode: ${payment.month}`,
      `Nominal: ${money(payment.amount)}`,
      `Metode: ${payment.method || 'transfer'}`,
      `Tanggal: ${payment.paidAt || new Date().toISOString().slice(0, 10)}`,
      '',
      'Terima kasih atas pembayarannya.',
    ].join('\n');
  }, [payment, settings, no]);

  const makePdf = () => {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    pdf.setFillColor(18, 52, 86);
    pdf.rect(0, 0, 210, 35, 'F');

    if (settings.logo) {
      try {
        const format = settings.logo.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
        pdf.addImage(settings.logo, format, 18, 7, 24, 20);
      } catch {}
    }

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(19);
    pdf.setFont('helvetica', 'bold');
    pdf.text(settings.name, 46, 16);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('KWITANSI PEMBAYARAN', 46, 24);
    pdf.text(`No. ${no}`, 150, 16);

    pdf.setTextColor(35, 42, 52);
    pdf.setFontSize(8);
    pdf.text(settings.address || 'Alamat properti', 18, 45);
    pdf.text(settings.phone || '', 18, 50);
    pdf.line(18, 55, 192, 55);
    pdf.setFontSize(11);
    pdf.text('DITERIMA DARI', 18, 69);
    pdf.setFont('helvetica', 'bold');
    pdf.text(payment?.tenant || '-', 18, 77);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Kamar: ${payment?.room || '-'}`, 18, 86);
    pdf.text(`Periode: ${payment?.month || '-'}`, 18, 95);
    pdf.text(`Tanggal: ${payment?.paidAt || '-'}`, 18, 104);
    pdf.text(`Metode: ${payment?.method || '-'}`, 18, 113);

    pdf.setFillColor(245, 247, 250);
    pdf.roundedRect(18, 124, 174, 33, 4, 4, 'F');
    pdf.setFontSize(10);
    pdf.text('TOTAL DIBAYARKAN', 27, 136);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(money(payment?.amount || 0), 27, 149);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('Pembayaran telah diterima dan dicatat.', 18, 170);

    if (settings.signature) {
      try {
        const format = settings.signature.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
        pdf.addImage(settings.signature, format, 145, 186, 42, 22);
      } catch {}
    }

    pdf.text(settings.manager || 'Pengelola Kost', 145, 214);
    pdf.line(145, 224, 192, 224);
    pdf.setFontSize(8);
    pdf.text('Tanda tangan', 157, 231);
    pdf.text('Dokumen elektronik - bukti pembayaran.', 18, 265);
    return pdf;
  };

  const download = () => {
    if (!payment || !isPaid) return alert('Kwitansi hanya dapat dibuat setelah tagihan dilunasi.');
    makePdf().save(`Kwitansi-${no}.pdf`);
  };

  const share = async (kind: 'email' | 'wa') => {
    if (!payment || !isPaid) return alert('Kwitansi hanya dapat dikirim setelah tagihan dilunasi.');

    const blob = makePdf().output('blob');
    const file = new File([blob], `Kwitansi-${no}.pdf`, { type: 'application/pdf' });

    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share({
          title: `Kwitansi ${no}`,
          text: `Kwitansi pembayaran ${payment.tenant}`,
          files: [file],
        });
        return;
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') return;
      }
    }

    if (kind === 'email') {
      if (!email) return alert('Isi email penerima terlebih dahulu.');
      window.location.href =
        `mailto:${email}?subject=${encodeURIComponent(`Kwitansi ${no}`)}&body=${encodeURIComponent(
          `${message}\n\nPDF sudah dibuat: Kwitansi-${no}.pdf`,
        )}`;
      return;
    }

    if (!phone) return alert('Isi nomor WhatsApp terlebih dahulu.');
    const normalized = phone.replace(/\D/g, '').replace(/^0/, '62');
    window.open(
      `https://wa.me/${normalized}?text=${encodeURIComponent(`${message}\n\nPDF: Kwitansi-${no}.pdf`)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <>
      <div className="top no-print">
        <div>
          <div className="title">Kwitansi</div>
          <div className="sub">Kwitansi dibuat dari pembayaran yang sudah LUNAS</div>
        </div>
      </div>

      <div className="card no-print" style={{ marginBottom: 18 }}>
        <div className="form">
          <div className="field full">
            <label>Pilih Pembayaran Lunas</label>
            <select value={id} onChange={(event) => setId(event.target.value)}>
              {payments
                .filter((item) => item.status === 'paid')
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} — {item.tenant} — {money(item.amount)}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label>Email penerima</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" />
          </div>
          <div className="field">
            <label>WhatsApp penerima</label>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="08123456789" />
          </div>
        </div>
        <div className="actions">
          {isPaid ? (
            <>
              <button className="btn" onClick={download}>Download PDF</button>
              <button className="btn secondary" onClick={() => window.print()}>Cetak</button>
              <button className="btn secondary" onClick={() => share('email')}>Kirim PDF via Email</button>
              <button className="btn secondary" onClick={() => share('wa')}>Kirim PDF via WhatsApp</button>
            </>
          ) : (
            <button className="btn secondary" onClick={() => (window.location.href = '/tagihan')}>
              Kembali ke Pelunasan
            </button>
          )}
        </div>
      </div>

      {payment && (
        <>
          {!isPaid && (
            <div className="card no-print" style={{ marginBottom: 18 }}>
              Tagihan ini <b>belum lunas</b>. Kwitansi resmi belum dapat dibuat. Selesaikan pelunasan di halaman Tagihan terlebih dahulu.
            </div>
          )}

          <div className="kwitansi-preview">
            <div className="receipt-head">
              <div className="brand">
                {settings.logo && <img src={settings.logo} alt="Logo" />}
                <div>
                  <div className="receipt-logo">{settings.name}</div>
                  <div className="receipt-sub">SISTEM MANAJEMEN KOST</div>
                  <div className="receipt-address">{settings.address}<br />{settings.phone}</div>
                </div>
              </div>
              <div className="receipt-no"><small>NO. KWITANSI</small><strong>{no}</strong></div>
            </div>
            <div className="receipt-title">KWITANSI PEMBAYARAN</div>
            <div className="receipt-grid">
              <div><small>DITERIMA DARI</small><strong>{payment.tenant}</strong></div>
              <div><small>TANGGAL</small><strong>{payment.paidAt || '-'}</strong></div>
              <div><small>KAMAR</small><strong>{payment.room}</strong></div>
              <div><small>PERIODE</small><strong>{payment.month}</strong></div>
              <div><small>METODE</small><strong>{payment.method || '-'}</strong></div>
            </div>
            <div className="receipt-total"><small>TOTAL DIBAYARKAN</small><strong>{money(payment.amount)}</strong><span>Pembayaran telah diterima dan dicatat.</span></div>
            <div className="receipt-footer">
              <div>Terima kasih atas pembayaran Anda.</div>
              <div className="signature">{settings.signature && <img src={settings.signature} alt="Tanda tangan" />}<span>{settings.manager}</span><small>Tanda tangan</small></div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`@media print{.no-print{display:none!important}body{background:white!important}.main{margin:0!important;padding:0!important}.kwitansi-preview{box-shadow:none!important;border:0!important;margin:0 auto!important;width:180mm!important}}.kwitansi-preview{max-width:760px;margin:0 auto;background:#fff;border:1px solid #dfe4ea;border-radius:14px;padding:38px;box-shadow:0 12px 35px rgba(0,0,0,.08);font-family:Arial,sans-serif;color:#1f2937}.receipt-head{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #123456;padding-bottom:20px}.brand{display:flex;gap:14px;align-items:flex-start}.brand img{width:58px;height:48px;object-fit:contain}.receipt-logo{font-size:25px;font-weight:800;letter-spacing:1px;color:#123456}.receipt-sub{font-size:10px;letter-spacing:2px;color:#667085;margin-top:4px}.receipt-address{font-size:12px;color:#667085;margin-top:12px;line-height:1.5}.receipt-no{text-align:right;display:flex;flex-direction:column;gap:6px}.receipt-no small,.receipt-grid small,.receipt-total small{font-size:10px;color:#667085;letter-spacing:1px}.receipt-no strong{font-size:14px}.receipt-title{text-align:center;font-size:18px;font-weight:800;letter-spacing:1px;margin:28px 0}.receipt-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px 30px}.receipt-grid div{display:flex;flex-direction:column;gap:6px}.receipt-grid strong{font-size:15px}.receipt-total{margin-top:30px;padding:22px;border-radius:10px;background:#f4f7fa;border-left:5px solid #123456;display:flex;flex-direction:column;gap:7px}.receipt-total strong{font-size:30px;color:#123456}.receipt-total span{font-size:11px;color:#667085}.receipt-footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:55px;font-size:12px}.signature{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:150px}.signature img{max-width:150px;height:55px;object-fit:contain}.signature small{color:#667085}@media(max-width:640px){.kwitansi-preview{padding:22px}.receipt-head,.receipt-footer{flex-direction:column}.receipt-no{text-align:left}.receipt-grid{grid-template-columns:1fr}}`}</style>
    </>
  );
}
