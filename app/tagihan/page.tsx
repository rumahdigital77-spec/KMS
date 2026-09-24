'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { currentPropertyId } from '@/lib/property';
import { money } from '@/lib/store';

type Invoice = { id: string; tenant_id: string; period: string; amount: number; status: string; due_date: string | null };
type Tenant = { id: string; name: string };

export default function Tagihan() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [show, setShow] = useState(false);
  const [tenant, setTenant] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState(`${new Date().toISOString().slice(0, 7)}-01`);
  const [due, setDue] = useState('');
  const [selected, setSelected] = useState('');
  const [method, setMethod] = useState('transfer');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const pid = await currentPropertyId();
      const [invoiceResult, tenantResult] = await Promise.all([
        supabase.from('invoices').select('id,tenant_id,period,amount,status,due_date').eq('property_id', pid).order('period', { ascending: false }),
        supabase.from('tenants').select('id,name').eq('property_id', pid).eq('status', 'active').order('name'),
      ]);
      if (invoiceResult.error) throw invoiceResult.error;
      if (tenantResult.error) throw tenantResult.error;
      setInvoices((invoiceResult.data || []) as Invoice[]);
      setTenants((tenantResult.data || []) as Tenant[]);
    } catch { setMsg('Gagal memuat tagihan.'); }
  };

  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!tenant || !amount || !period) return setMsg('Penghuni, periode, dan nominal wajib diisi.');
    const nominal = Number(amount);
    if (!Number.isFinite(nominal) || nominal <= 0) return setMsg('Nominal tagihan harus lebih besar dari 0.');
    try {
      const pid = await currentPropertyId();
      const { data: existing, error: existingError } = await supabase.from('invoices').select('id').eq('property_id', pid).eq('tenant_id', tenant).eq('period', period).neq('status', 'cancelled').maybeSingle();
      if (existingError) throw existingError;
      if (existing) return setMsg('Tagihan untuk penghuni dan periode tersebut sudah ada.');
      const { error } = await supabase.from('invoices').insert({ property_id: pid, tenant_id: tenant, period, amount: nominal, status: 'unpaid', due_date: due || null });
      if (error) throw error;
      setShow(false); setAmount(''); setTenant(''); setMsg('Tagihan berhasil dibuat.'); await load();
    } catch (error) { setMsg(error instanceof Error ? error.message : 'Gagal membuat tagihan.'); }
  };

  const pay = async () => {
    const invoice = invoices.find((item) => item.id === selected);
    if (!invoice) return setMsg('Pilih tagihan.');
    if (invoice.status === 'paid') return setMsg('Tagihan sudah lunas.');
    const nominal = Number(paymentAmount);
    if (!Number.isFinite(nominal) || nominal <= 0) return setMsg('Nominal pembayaran wajib diisi.');
    try {
      const { error } = await supabase.rpc('record_payment', { p_invoice_id: invoice.id, p_amount: nominal, p_method: method, p_note: null });
      if (error) throw error;
      setSelected(''); setPaymentAmount(''); setMsg('Pembayaran berhasil dicatat.'); await load();
    } catch (error) { setMsg(error instanceof Error ? error.message : 'Gagal mencatat pembayaran.'); }
  };

  return (
    <>
      <div className="top"><div><div className="title">Tagihan & Pembayaran</div><div className="sub">Invoice dan pembayaran sekarang tersimpan terpisah per properti.</div></div><button className="btn" onClick={() => setShow(!show)}>+ Buat Tagihan</button></div>
      {msg && <div className="card" style={{ marginBottom: 18 }}>{msg}</div>}
      {show && <div className="card" style={{ marginBottom: 18 }}><div className="section-title">Buat Tagihan</div><div className="form">
        <div className="field"><label>Penghuni</label><select value={tenant} onChange={(e) => setTenant(e.target.value)}><option value="">Pilih penghuni</option>{tenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label>Periode</label><input type="date" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
        <div className="field"><label>Nominal</label><input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div className="field"><label>Jatuh Tempo</label><input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
      </div><div className="actions"><button className="btn" onClick={create}>Simpan Tagihan</button><button className="btn secondary" onClick={() => setShow(false)}>Batal</button></div></div>}
      <div className="card"><table className="table"><thead><tr><th>Penghuni</th><th>Periode</th><th>Nominal</th><th>Jatuh Tempo</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td><b>{tenants.find((item) => item.id === invoice.tenant_id)?.name || invoice.tenant_id}</b></td><td>{invoice.period}</td><td>{money(Number(invoice.amount))}</td><td>{invoice.due_date || '-'}</td><td><span className={`badge ${invoice.status === 'paid' ? 'green' : invoice.status === 'partial' ? 'amber' : 'red'}`}>{invoice.status === 'paid' ? 'Lunas' : invoice.status === 'partial' ? 'Sebagian' : 'Belum Bayar'}</span></td><td>{invoice.status !== 'paid' && <button className="btn secondary" onClick={() => { setSelected(invoice.id); setPaymentAmount(String(invoice.amount)); }}>Bayar</button>}</td></tr>)}</tbody></table></div>
      {selected && <div className="card" style={{ marginTop: 18 }}><div className="section-title">Catat Pembayaran</div><div className="form"><div className="field"><label>Nominal Dibayar</label><input type="number" min="1" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} /></div><div className="field"><label>Metode</label><select value={method} onChange={(e) => setMethod(e.target.value)}><option value="transfer">Transfer</option><option value="cash">Cash</option><option value="qris">QRIS</option></select></div></div><div className="actions"><button className="btn" onClick={pay}>Simpan Pembayaran</button><button className="btn secondary" onClick={() => setSelected('')}>Batal</button></div></div>}
    </>
  );
}
