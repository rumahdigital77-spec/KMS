'use client';

import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { supabase } from '@/lib/supabase-browser';
import { currentPropertyId } from '@/lib/property';
import { money } from '@/lib/store';

type Row={id:string;amount:number;method:string|null;paid_at:string;invoice_id:string;invoice?:{period:string;tenant_id:string;tenants?:{name:string;room_id:string|null}}};

export default function Kwitansi(){
 const[rows,setRows]=useState<Row[]>([]),[id,setId]=useState(''),[msg,setMsg]=useState('');
 useEffect(()=>{(async()=>{try{const pid=await currentPropertyId();const{data,error}=await supabase.from('payments').select('id,amount,method,paid_at,invoice_id,invoices!inner(period,tenant_id,tenants(name,room_id))').eq('invoices.property_id',pid).order('paid_at',{ascending:false});if(error)throw error;setRows((data||[]) as unknown as Row[]);const q=new URLSearchParams(location.search).get('id');setId(q||((data||[])[0]?.id||''));}catch{setMsg('Gagal memuat kwitansi.')}})()},[]);
 const payment=rows.find(x=>x.id===id)||rows[0];
 const download=()=>{if(!payment)return;const tenant=payment.invoice?.tenants?.name||'-';const period=payment.invoice?.period||'-';const no='KW-'+payment.id.slice(0,8).toUpperCase();const pdf=new jsPDF();pdf.setFontSize(18);pdf.text('KWITANSI PEMBAYARAN',20,25);pdf.setFontSize(11);pdf.text('No: '+no,20,38);pdf.text('Penghuni: '+tenant,20,55);pdf.text('Periode: '+period,20,65);pdf.text('Tanggal: '+new Date(payment.paid_at).toLocaleDateString('id-ID'),20,75);pdf.text('Metode: '+(payment.method||'-'),20,85);pdf.setFontSize(18);pdf.text(money(Number(payment.amount)),20,110);pdf.save(no+'.pdf')};
 return <><div className="top"><div><div className="title">Kwitansi</div><div className="sub">Kwitansi berasal dari pembayaran yang sudah tercatat di Supabase.</div></div></div>{msg&&<div className="card">{msg}</div>}<div className="card no-print" style={{marginBottom:18}}><div className="form"><div className="field full"><label>Pembayaran Lunas</label><select value={id} onChange={e=>setId(e.target.value)}><option value="">Pilih pembayaran</option>{rows.map(x=><option key={x.id} value={x.id}>{x.invoice?.tenants?.name||'-'} — {money(Number(x.amount))} — {x.invoice?.period||'-'}</option>)}</select></div></div><div className="actions"><button className="btn" disabled={!payment} onClick={download}>Download PDF</button><button className="btn secondary" onClick={()=>window.print()}>Cetak</button></div></div>{payment&&<div className="kwitansi-preview"><h2>KWITANSI PEMBAYARAN</h2><p>No. Kwitansi: <b>KW-{payment.id.slice(0,8).toUpperCase()}</b></p><hr/><p>Diterima dari: <b>{payment.invoice?.tenants?.name||'-'}</b></p><p>Periode: <b>{payment.invoice?.period||'-'}</b></p><p>Tanggal: <b>{new Date(payment.paid_at).toLocaleDateString('id-ID')}</b></p><p>Metode: <b>{payment.method||'-'}</b></p><div className="receipt-total"><small>TOTAL DIBAYARKAN</small><strong>{money(Number(payment.amount))}</strong></div></div>}</>;
}