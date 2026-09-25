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

const numberWords = [
  'Nol','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan',
  'Sepuluh','Sebelas',
];

function terbilang(value: number): string {
  const n = Math.floor(Math.abs(Number(value) || 0));
  if (n < 12) return numberWords[n];
  if (n < 20) return terbilang(n - 10) + ' Belas';
  if (n < 100) return terbilang(Math.floor(n / 10)) + ' Puluh' + (n % 10 ? ' ' + terbilang(n % 10) : '');
  if (n < 200) return 'Seratus' + (n % 100 ? ' ' + terbilang(n % 100) : '');
  if (n < 1000) return terbilang(Math.floor(n / 100)) + ' Ratus' + (n % 100 ? ' ' + terbilang(n % 100) : '');
  if (n < 2000) return 'Seribu' + (n % 1000 ? ' ' + terbilang(n % 1000) : '');
  if (n < 1000000) return terbilang(Math.floor(n / 1000)) + ' Ribu' + (n % 1000 ? ' ' + terbilang(n % 1000) : '');
  if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + ' Juta' + (n % 1000000 ? ' ' + terbilang(n % 1000000) : '');
  if (n < 1000000000000) return terbilang(Math.floor(n / 1000000000)) + ' Miliar' + (n % 1000000000 ? ' ' + terbilang(n % 1000000000) : '');
  return terbilang(Math.floor(n / 1000000000000)) + ' Triliun' + (n % 1000000000000 ? ' ' + terbilang(n % 1000000000000) : '');
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function Kwitansi() {
  const [payments, setPayments] = useState<Payment[]>(defaultPayments);
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [settings, setSettings] = useState<Settings>(defaults);

  useEffect(() => {
    const active = loadData<Payment[]>('payments', defaultPayments);
    const history = loadData<Payment[]>('paymentHistory', []);
    const paid = [...history, ...active.filter((item) => item.status === 'paid' && !history.some((h) => h.id === item.id))]
      .filter((item) => item.status === 'paid');
    setPayments(paid);

    try {
      const raw = localStorage.getItem('kostpro_settings');
      if (raw) setSettings({ ...defaults, ...JSON.parse(raw) });
    } catch {}

    const query = new URLSearchParams(window.location.search);
    const queryId = query.get('id');
    if (queryId) setId(queryId);

    if (queryId && query.get('print') === '1') {
      window.setTimeout(() => window.print(), 800);
    }
  }, []);

  const payment = payments.find((item) => item.id === id);
  const isPaid = payment?.status === 'paid';
  const receiptNo = payment?.receiptNo || '—';
  const amountWords = payment ? terbilang(payment.amount) + ' Rupiah' : '';

  const message = useMemo(() => {
    if (!payment) return '';
    return [
      'KWITANSI PEMBAYARAN',
      settings.name,
      settings.address,
      settings.phone,
      'No. Kwitansi: ' + receiptNo,
      'Diterima dari: ' + payment.tenant,
      'Kamar: ' + payment.room,
      'Periode: ' + payment.month,
      'Nominal: ' + money(payment.amount),
      'Terbilang: ' + amountWords,
      'Metode: ' + (payment.method || 'Transfer'),
      'Tanggal: ' + formatDate(payment.paidAt),
    ].join('\n');
  }, [payment, settings, receiptNo, amountWords]);

  const makePdf = () => {
    if (!payment) throw new Error('Pembayaran tidak ditemukan.');

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    pdf.setTextColor(31, 41, 55);

    if (settings.logo) {
      try {
        const format = settings.logo.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
        pdf.addImage(settings.logo, format, 18, 16, 25, 20);
      } catch {}
    }

    const left = settings.logo ? 50 : 18;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text(settings.name || 'KOSTPRO', left, 20);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(settings.address || 'Alamat properti', left, 27);
    if (settings.phone) pdf.text(settings.phone, left, 32);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('KWITANSI PEMBAYARAN', 105, 48, { align: 'center' });
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('No. ' + receiptNo, 192, 20, { align: 'right' });
    pdf.line(18, 55, 192, 55);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DITERIMA DARI', 18, 68);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.text(payment.tenant || '-', 18, 76);

    pdf.setFontSize(9);
    pdf.text('Kamar', 18, 88);
    pdf.text('Periode', 75, 88);
    pdf.text('Tanggal Pembayaran', 135, 88);
    pdf.setFont('helvetica', 'bold');
    pdf.text(payment.room || '-', 18, 95);
    pdf.text(payment.month || '-', 75, 95);
    pdf.text(formatDate(payment.paidAt), 135, 95);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Metode Pembayaran', 18, 108);
    pdf.setFont('helvetica', 'bold');
    pdf.text((payment.method || 'Transfer').toUpperCase(), 18, 115);

    pdf.setFillColor(245, 247, 250);
    pdf.roundedRect(18, 126, 174, 42, 4, 4, 'F');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('TOTAL DIBAYARKAN', 27, 139);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text(money(payment.amount), 27, 151);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(9);
    pdf.text('Terbilang: ' + amountWords, 27, 161, { maxWidth: 155 });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Status: LUNAS', 18, 181);
    pdf.text('Bukti pembayaran ini diterbitkan berdasarkan catatan transaksi pada sistem.', 18, 188, { maxWidth: 174 });

    if (settings.signature) {
      try {
        const format = settings.signature.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
        pdf.addImage(settings.signature, format, 148, 202, 38, 22);
      } catch {}
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(settings.manager || 'Pengelola Kost', 148, 232, { align: 'center' });
    pdf.line(140, 235, 196, 235);
    pdf.setFontSize(7);
    pdf.text('Penerima / Pengelola', 168, 241, { align: 'center' });
    pdf.text('Dokumen elektronik — simpan sebagai bukti pembayaran.', 18, 270);

    return pdf;
  };

  const download = () => {
    if (!payment || !isPaid) return alert('Kwitansi hanya dapat dibuat setelah pembayaran lunas.');
    makePdf().save('Kwitansi-' + receiptNo + '.pdf');
  };

  const print = () => {
    if (!payment || !isPaid) return alert('Kwitansi hanya dapat dicetak setelah pembayaran lunas.');
    window.print();
  };

  const share = async (kind: 'email' | 'wa') => {
    if (!payment || !isPaid) return alert('Kwitansi hanya dapat dikirim setelah pembayaran lunas.');
    const blob = makePdf().output('blob');
    const file = new File([blob], 'Kwitansi-' + receiptNo + '.pdf', { type: 'application/pdf' });

    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share({ title: 'Kwitansi ' + receiptNo, text: 'Kwitansi pembayaran ' + payment.tenant, files: [file] });
        return;
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') return;
      }
    }

    if (kind === 'email') {
      if (!email) return alert('Isi email penerima terlebih dahulu.');
      window.location.href = 'mailto:' + email + '?subject=' + encodeURIComponent('Kwitansi ' + receiptNo) + '&body=' + encodeURIComponent(message);
      return;
    }

    if (!phone) return alert('Isi nomor WhatsApp terlebih dahulu.');
    const normalized = phone.replace(/\D/g, '').replace(/^0/, '62');
    window.open('https://wa.me/' + normalized + '?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div className="top no-print">
        <div>
          <div className="title">Kwitansi</div>
          <div className="sub">Dokumen bukti penerimaan pembayaran yang terstruktur dan profesional</div>
        </div>
      </div>

      <div className="card no-print" style={{ marginBottom: 18 }}>
        <div className="form">
          <div className="field full">
            <label>Pilih Pembayaran Lunas</label>
            <select value={id} onChange={(event) => setId(event.target.value)}>
              <option value="">Pilih pembayaran</option>
              {payments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id} — {item.tenant} — {money(item.amount)} — {item.month}
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
              <button className="btn secondary" onClick={print}>Cetak</button>
              <button className="btn secondary" onClick={() => share('email')}>Kirim Email</button>
              <button className="btn secondary" onClick={() => share('wa')}>Kirim WhatsApp</button>
            </>
          ) : (
            <button className="btn secondary" onClick={() => (window.location.href = '/tagihan')}>Kembali ke Tagihan</button>
          )}
        </div>
      </div>

      {!payment && (
        <div className="card no-print">
          Pembayaran tidak ditemukan. Pilih pembayaran yang sudah lunas dari daftar.
        </div>
      )}

      {payment && (
        <div className="kwitansi-preview">
          <div className="receipt-head">
            <div className="brand">
              {settings.logo && <img src={settings.logo} alt="Logo" />}
              <div>
                <div className="receipt-logo">{settings.name}</div>
                <div className="receipt-sub">PROPERTY / KOST MANAGEMENT</div>
                <div className="receipt-address">{settings.address}<br />{settings.phone}</div>
              </div>
            </div>
            <div className="receipt-no">
              <small>NO. KWITANSI</small>
              <strong>{receiptNo}</strong>
              <span>{formatDate(payment.paidAt)}</span>
            </div>
          </div>

          <div className="receipt-title">KWITANSI PEMBAYARAN</div>

          <div className="receipt-grid">
            <div><small>DITERIMA DARI</small><strong>{payment.tenant}</strong></div>
            <div><small>STATUS</small><strong className="paid-status">LUNAS</strong></div>
            <div><small>UNIT / KAMAR</small><strong>{payment.room}</strong></div>
            <div><small>PERIODE</small><strong>{payment.month}</strong></div>
            <div><small>TANGGAL PEMBAYARAN</small><strong>{formatDate(payment.paidAt)}</strong></div>
            <div><small>METODE PEMBAYARAN</small><strong>{(payment.method || 'Transfer').toUpperCase()}</strong></div>
          </div>

          <div className="receipt-description">
            <div>
              <small>URAIAN PEMBAYARAN</small>
              <strong>Sewa kamar {payment.room} untuk periode {payment.month}</strong>
            </div>
            <div className="amount"><small>JUMLAH</small><strong>{money(payment.amount)}</strong></div>
          </div>

          <div className="receipt-total">
            <small>TERBILANG</small>
            <strong>{amountWords}</strong>
            <span>Rupiah</span>
          </div>

          <div className="receipt-note">
            Pembayaran telah diterima dan dicatat dalam sistem. Dokumen ini merupakan bukti pembayaran untuk transaksi yang tercantum di atas.
          </div>

          <div className="receipt-footer">
            <div>Terima kasih atas pembayaran Anda.</div>
            <div className="signature">
              {settings.signature && <img src={settings.signature} alt="Tanda tangan" />}
              <span>{settings.manager}</span>
              <small>Pengelola / Penerima</small>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .kwitansi-preview{max-width:780px;margin:0 auto;background:#fff;border:1px solid #dfe4ea;border-radius:14px;padding:40px;box-shadow:0 14px 40px rgba(15,23,42,.08);font-family:Arial,sans-serif;color:#1f2937}
        .receipt-head{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #123456;padding-bottom:22px}
        .brand{display:flex;gap:15px;align-items:flex-start}.brand img{width:60px;height:50px;object-fit:contain}
        .receipt-logo{font-size:25px;font-weight:800;letter-spacing:1px;color:#123456}.receipt-sub{font-size:10px;letter-spacing:2px;color:#667085;margin-top:4px}
        .receipt-address{font-size:12px;color:#667085;margin-top:10px;line-height:1.5}.receipt-no{text-align:right;display:flex;flex-direction:column;gap:5px}
        .receipt-no small,.receipt-grid small,.receipt-description small,.receipt-total small{font-size:9px;color:#667085;letter-spacing:1px}.receipt-no strong{font-size:15px;color:#123456}.receipt-no span{font-size:10px;color:#667085}
        .receipt-title{text-align:center;font-size:19px;font-weight:800;letter-spacing:1.5px;margin:28px 0}
        .receipt-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px 34px}.receipt-grid div{display:flex;flex-direction:column;gap:6px}.receipt-grid strong{font-size:14px}.paid-status{color:#047857}
        .receipt-description{display:flex;justify-content:space-between;gap:25px;margin-top:30px;padding:18px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}.receipt-description div:first-child{display:flex;flex-direction:column;gap:7px}.receipt-description strong{font-size:14px}.receipt-description .amount{text-align:right;min-width:180px}.receipt-description .amount strong{font-size:18px;color:#123456}
        .receipt-total{margin-top:22px;padding:20px 22px;border-radius:10px;background:#f4f7fa;border-left:5px solid #123456;display:flex;flex-direction:column;gap:6px}.receipt-total strong{font-size:18px;color:#123456;text-transform:capitalize}.receipt-total span{font-size:11px;color:#667085}
        .receipt-note{margin-top:20px;padding:12px 14px;background:#f8fafc;border-radius:8px;font-size:11px;color:#667085;line-height:1.6}
        .receipt-footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:55px;font-size:12px}.signature{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:170px}.signature img{max-width:150px;height:55px;object-fit:contain}.signature small{color:#667085}
        @media(max-width:640px){.kwitansi-preview{padding:22px}.receipt-head,.receipt-footer,.receipt-description{flex-direction:column}.receipt-no{text-align:left}.receipt-grid{grid-template-columns:1fr}.receipt-description .amount{text-align:left}}
        @media print{.no-print{display:none!important}body{background:#fff!important}.main{margin:0!important;padding:0!important}.kwitansi-preview{width:180mm;max-width:none;margin:0 auto;padding:12mm;border:0;box-shadow:none;border-radius:0}.receipt-title{margin:18px 0}.receipt-grid{gap:14px 25px}.receipt-description{margin-top:18px}.receipt-total{margin-top:15px}.receipt-footer{margin-top:30px}}
      `}</style>
    </>
  );
}
