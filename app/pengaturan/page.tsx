'use client';

import { useEffect,useState } from 'react';
import type { ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { currentPropertyId } from '@/lib/property';

type Form={name:string;owner_name:string;manager:string;phone:string;address:string;currency:string;logo:string};
const initial:Form={name:'',owner_name:'',manager:'',phone:'',address:'',currency:'IDR',logo:''};

type BackupData = {
 version: 1;
 exported_at: string;
 property: Record<string, unknown>;
 rooms: Record<string, unknown>[];
 tenants: Record<string, unknown>[];
 invoices: Record<string, unknown>[];
 payments: Record<string, unknown>[];
 expenses: Record<string, unknown>[];
};

export default function Pengaturan(){
 const[f,setF]=useState<Form>(initial),[loading,setLoading]=useState(true),[saved,setSaved]=useState(false),[error,setError]=useState('');
 useEffect(()=>{(async()=>{try{const pid=await currentPropertyId();const{data,error}=await supabase.from('properties').select('name,owner_name,manager,phone,address,currency,logo').eq('id',pid).single();if(error)throw error;if(data)setF({...initial,...data,owner_name:data.owner_name||'',manager:data.manager||'',phone:data.phone||'',address:data.address||'',currency:data.currency||'IDR',logo:data.logo||''})}catch{setError('Gagal memuat data properti.')}finally{setLoading(false)}})()},[]);
 const set=(k:keyof Form,v:string)=>setF(x=>({...x,[k]:v}));
 const image=(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;if(file.size>1024*1024)return setError('Logo maksimal 1 MB.');const reader=new FileReader();reader.onload=()=>set('logo',String(reader.result));reader.readAsDataURL(file)};
 const save=async()=>{try{setError('');const pid=await currentPropertyId();const{error}=await supabase.from('properties').update(f).eq('id',pid);if(error)throw error;setSaved(true);setTimeout(()=>setSaved(false),2500);window.dispatchEvent(new Event('kostpro-settings-updated'))}catch{setError('Gagal menyimpan pengaturan.')}};
 const logout=async()=>{await supabase.auth.signOut();location.href='/login'};

 const backup=async()=>{
  try{
   setError('');
   const pid=await currentPropertyId();
   const tables=['properties','rooms','tenants','invoices','payments','expenses'] as const;
   const results=await Promise.all(tables.map(t=>supabase.from(t).select('*').eq(t==='properties'?'id':'property_id',pid)));
   const failed=results.find(r=>r.error);
   if(failed?.error)throw failed.error;
   const data:BackupData={
    version:1,
    exported_at:new Date().toISOString(),
    property:(results[0].data?.[0]||{}) as Record<string,unknown>,
    rooms:(results[1].data||[]) as Record<string,unknown>[],
    tenants:(results[2].data||[]) as Record<string,unknown>[],
    invoices:(results[3].data||[]) as Record<string,unknown>[],
    payments:(results[4].data||[]) as Record<string,unknown>[],
    expenses:(results[5].data||[]) as Record<string,unknown>[]
   };
   const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');
   a.href=url;
   a.download=`kms-backup-${new Date().toISOString().slice(0,10)}.json`;
   document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }catch(e){setError(e instanceof Error?e.message:'Gagal membuat backup.')}
 };

 const restore=async(e:ChangeEvent<HTMLInputElement>)=>{
  const file=e.target.files?.[0];e.target.value='';
  if(!file)return;
  try{
   setError('');
   const pid=await currentPropertyId();
   const parsed=JSON.parse(await file.text()) as Partial<BackupData>;
   if(parsed.version!==1||!parsed.property||!Array.isArray(parsed.rooms)||!Array.isArray(parsed.tenants)||!Array.isArray(parsed.invoices)||!Array.isArray(parsed.payments)||!Array.isArray(parsed.expenses)){
    throw new Error('Format file backup tidak valid.');
   }
   if(parsed.property.id!==pid)throw new Error('Backup ini berasal dari properti yang berbeda.');
   const property={...parsed.property,id:pid};
   const{error:propertyError}=await supabase.from('properties').upsert(property,{onConflict:'id'});
   if(propertyError)throw propertyError;
   for(const [table,rows] of [['rooms',parsed.rooms],['tenants',parsed.tenants],['invoices',parsed.invoices],['payments',parsed.payments],['expenses',parsed.expenses]] as const){
    if(rows.length){
     const{error}=await supabase.from(table).upsert(rows as Record<string,unknown>[],{onConflict:'id'});
     if(error)throw error;
    }
   }
   setF({...initial,...property,owner_name:String(property.owner_name||''),manager:String(property.manager||''),phone:String(property.phone||''),address:String(property.address||''),currency:String(property.currency||'IDR'),logo:String(property.logo||'')} as Form);
   setSaved(true);setTimeout(()=>setSaved(false),3000);
   window.dispatchEvent(new Event('kostpro-settings-updated'));
  }catch(e){setError(e instanceof Error?e.message:'Gagal restore backup.')}
 };

 if(loading)return <div className="card">Memuat pengaturan...</div>;
 if(loading)return <div className="card">Memuat pengaturan...</div>;
 return <><div className="top"><div><div className="title">Pengaturan Properti</div><div className="sub">Identitas properti tersimpan di Supabase dan terpisah untuk setiap akun.</div></div><button className="btn secondary" onClick={logout}>Keluar</button></div>{error&&<div className="card" style={{marginBottom:18,color:'#b91c1c'}}>{error}</div>}<div className="card"><div className="section-title">Profil Properti</div><div className="form"><div className="field"><label>Nama Kost</label><input value={f.name} onChange={e=>set('name',e.target.value)}/></div><div className="field"><label>Nama Pemilik</label><input value={f.owner_name} onChange={e=>set('owner_name',e.target.value)}/></div><div className="field"><label>Nama Pengelola</label><input value={f.manager} onChange={e=>set('manager',e.target.value)}/></div><div className="field"><label>Telepon</label><input value={f.phone} onChange={e=>set('phone',e.target.value)}/></div><div className="field"><label>Mata Uang</label><select value={f.currency} onChange={e=>set('currency',e.target.value)}><option value="IDR">IDR — Rupiah Indonesia</option></select></div><div className="field full"><label>Alamat</label><textarea rows={3} value={f.address} onChange={e=>set('address',e.target.value)}/></div><div className="field"><label>Logo Properti</label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={image}/>{f.logo&&<img src={f.logo} alt="Logo properti" style={{maxWidth:150,maxHeight:80,marginTop:8,objectFit:'contain'}}/>}</div></div><div className="actions"><button className="btn" onClick={save}>Simpan Pengaturan</button></div>{saved&&<div style={{marginTop:12,color:'#047857',fontWeight:700}}>✓ Pengaturan tersimpan.</div>}</div></>;
}