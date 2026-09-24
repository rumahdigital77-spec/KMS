'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { currentPropertyId } from '@/lib/property';
import { money } from '@/lib/store';

type Expense={id:string;category:string;description:string|null;amount:number;spent_at:string};
export default function Keuangan(){
 const[x,setX]=useState<Expense[]>([]),[show,setShow]=useState(false),[cat,setCat]=useState('Operasional'),[desc,setDesc]=useState(''),[amt,setAmt]=useState(''),[msg,setMsg]=useState('');
 const load=async()=>{try{const pid=await currentPropertyId();const{data,error}=await supabase.from('expenses').select('id,category,description,amount,spent_at').eq('property_id',pid).order('spent_at',{ascending:false});if(error)throw error;setX((data||[]) as Expense[])}catch{setMsg('Gagal memuat pengeluaran.')}};
 useEffect(()=>{load()},[]);
 const add=async()=>{if(!desc||!amt)return setMsg('Keterangan dan nominal wajib diisi.');try{const pid=await currentPropertyId();const{error}=await supabase.from('expenses').insert({property_id:pid,category:cat,description:desc,amount:Number(amt),spent_at:new Date().toISOString().slice(0,10)});if(error)throw error;setDesc('');setAmt('');setShow(false);setMsg('Pengeluaran berhasil dicatat.');await load()}catch{setMsg('Gagal mencatat pengeluaran.')}};
 const total=x.reduce((a,b)=>a+Number(b.amount),0);
 return <><div className="top"><div><div className="title">Keuangan</div><div className="sub">Pengeluaran operasional per properti.</div></div><button className="btn" onClick={()=>setShow(!show)}>+ Catat Pengeluaran</button></div>{msg&&<div className="card" style={{marginBottom:18}}>{msg}</div>}{show&&<div className="card" style={{marginBottom:18}}><div className="section-title">Catat Pengeluaran</div><div className="form"><div className="field"><label>Kategori</label><input value={cat} onChange={e=>setCat(e.target.value)}/></div><div className="field"><label>Nominal</label><input type="number" value={amt} onChange={e=>setAmt(e.target.value)}/></div><div className="field full"><label>Keterangan</label><input value={desc} onChange={e=>setDesc(e.target.value)}/></div></div><div className="actions"><button className="btn" onClick={add}>Simpan</button><button className="btn secondary" onClick={()=>setShow(false)}>Batal</button></div></div>}<div className="grid"><div className="card"><div className="label">Total Pengeluaran</div><div className="metric">{money(total)}</div></div></div><div className="card" style={{marginTop:18}}><table className="table"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th></tr></thead><tbody>{x.map(v=><tr key={v.id}><td>{v.spent_at}</td><td>{v.category}</td><td>{v.description||'-'}</td><td>{money(Number(v.amount))}</td></tr>)}</tbody></table></div></>;
}