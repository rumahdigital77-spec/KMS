'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { currentPropertyId } from '@/lib/property';
import { money } from '@/lib/store';

type Tenant={id:string;name:string;room_id:string|null;phone:string;start_date:string|null;end_date:string|null;monthly_rent:number;checkout_reason:string|null};

export default function HistoryTamu(){
 const[h,setH]=useState<Tenant[]>([]),[msg,setMsg]=useState(''),[loading,setLoading]=useState(true);
 const load=async()=>{
  try{
   const pid=await currentPropertyId();
   const{data,error}=await supabase.from('tenants').select('id,name,room_id,phone,start_date,end_date,monthly_rent,checkout_reason,rooms(room_code)').eq('property_id',pid).eq('status','history').order('end_date',{ascending:false});
   if(error)throw error;
   setH((data||[]) as unknown as Tenant[]);
  }catch{setMsg('Gagal memuat history penghuni.')}finally{setLoading(false)}
 };
 useEffect(()=>{load()},[]);
 return <><div className="top"><div><div className="title">History Penghuni</div><div className="sub">Arsip penghuni yang sudah check-out dari properti ini.</div></div></div>{msg&&<div className="card" style={{marginBottom:18,color:'#b91c1c'}}>{msg}</div>}<div className="card"><table className="table"><thead><tr><th>Nama</th><th>Kamar</th><th>Telepon</th><th>Masuk</th><th>Keluar</th><th>Sewa</th><th>Alasan</th></tr></thead><tbody>{loading?<tr><td colSpan={7}>Memuat...</td></tr>:h.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{(x as any).rooms?.room_code||'-'}</td><td>{x.phone||'-'}</td><td>{x.start_date||'-'}</td><td>{x.end_date||'-'}</td><td>{money(Number(x.monthly_rent))}</td><td>{x.checkout_reason==='expired'?'Masa aktif berakhir':x.checkout_reason==='transferred'?'Pindah kamar':'C.O manual'}</td></tr>)}{!loading&&!h.length&&<tr><td colSpan={7}>Belum ada history penghuni.</td></tr>}</tbody></table></div></>;
}
