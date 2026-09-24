'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { money } from '@/lib/store';

export default function Dashboard() {
  const [property, setProperty] = useState<{name:string;owner_name:string|null;manager:string|null;logo:string|null}>({name:'Kost Harmoni',owner_name:null,manager:null,logo:null});
  const [rooms,setRooms]=useState<any[]>([]);
  const [invoices,setInvoices]=useState<any[]>([]);
  const [expenses,setExpenses]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{(async()=>{
    try{
      const {data:p}=await supabase.from('properties').select('id,name,owner_name,manager,logo').eq('id',await supabase.rpc('current_property_id').then(x=>x.data)).maybeSingle();
      if(p)setProperty(p);
      const pid=p?.id;
      if(!pid){setLoading(false);return;}
      const [a,b,c]=await Promise.all([
        supabase.from('rooms').select('id,room_code,rent,status').eq('property_id',pid),
        supabase.from('invoices').select('id,amount,status').eq('property_id',pid),
        supabase.from('expenses').select('amount').eq('property_id',pid)
      ]);
      setRooms(a.data||[]);setInvoices(b.data||[]);setExpenses(c.data||[]);
    } finally {setLoading(false)}
  })()},[]);

  const occupied=rooms.filter(x=>x.status==='occupied').length;
  const unpaid=invoices.filter(x=>x.status!=='paid').reduce((a,x)=>a+Number(x.amount),0);
  const paid=invoices.filter(x=>x.status==='paid').reduce((a,x)=>a+Number(x.amount),0);
  const expense=expenses.reduce((a,x)=>a+Number(x.amount),0);
  const pct=rooms.length?Math.round(occupied/rooms.length*100):0;

  if(loading)return <div className="card">Memuat dashboard...</div>;
  return <div style={{display:'grid',gap:22}}>
    <div className="top"><div><div className="title">Dashboard</div><div className="sub">Selamat datang{property.owner_name?', '+property.owner_name:''} · {property.name}</div></div><Link className="btn" href="/penghuni">＋ Tambah Penghuni</Link></div>
    <div className="card"><div className="section-title">{property.name}</div><div className="sub">{property.manager?'Dikelola oleh '+property.manager:'Kelola operasional properti dari satu tempat.'}</div><div className="actions" style={{marginTop:16}}><span className="badge blue">{pct}% okupansi</span><span className="badge amber">{money(unpaid)} belum dibayar</span></div></div>
    <div className="grid">
      <div className="card"><div className="label">Total Kamar</div><div className="metric">{rooms.length}</div></div>
      <div className="card"><div className="label">Kamar Terisi</div><div className="metric">{occupied}</div></div>
      <div className="card"><div className="label">Pendapatan Lunas</div><div className="metric" style={{fontSize:20}}>{money(paid)}</div></div>
      <div className="card"><div className="label">Pengeluaran</div><div className="metric" style={{fontSize:20}}>{money(expense)}</div></div>
    </div>
  </div>;
}
