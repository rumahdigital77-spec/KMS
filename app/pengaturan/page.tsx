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
   const {data:property,error:propertyError}=await supabase.from('properties').select('*').eq('id',pid).single();
   if(propertyError)throw propertyError;
   const {data:rooms,error:roomsError}=await supabase.from('rooms').select('*').eq('property_id',pid);
   if(roomsError)throw roomsError;
   const {data:tenants,error:tenantsError}=await supabase.from('tenants').select('*').eq('property_id',pid);
   if(tenantsError)throw tenantsError;
   const {data:invoices,error:invoicesError}=await supabase.from('invoices').select('*').eq('property_id',pid);
   if(invoicesError)throw invoicesError;
   const invoiceIds=(invoices||[]).map(x=>x.id);
   let payments:Record<string,unknown>[]=[];
   if(invoiceIds.length){
    const {data,error}=await supabase.from('payments').select('*').in('invoice_id',invoiceIds);
    if(error)throw error;
    payments=(data||[]) as Record<string,unknown>[];
   }
   const {data:expenses,error:expensesError}=await supabase.from('expenses').select('*').eq('property_id',pid);
   if(expensesError)throw expensesError;
   const data:BackupData={
    version:1,
    exported_at:new Date().toISOString(),
    property:(property||{}) as Record<string,unknown>,
    rooms:(rooms||[]) as Record<string,unknown>[],
    tenants:(tenants||[]) as Record<string,unknown>[],
    invoices:(invoices||[]) as Record<string,unknown>[],
    payments,
    expenses:(expenses||[]) as Record<string,unknown>[]
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
   if(String(parsed.property.id)!==pid)throw new Error('Backup ini berasal dari properti yang berbeda.');
   const {id:propertyId,...propertyData}=parsed.property;
   const {error:propertyError}=await supabase.from('properties').update(propertyData).eq('id',pid);
   if(propertyError)throw propertyError;
   const {error:roomsError}=await supabase.from('rooms').upsert(
    (parsed.rooms as Record<string,unknown>[]).map(row=>({...row,property_id:pid})),{onConflict:'id'}
   );
   if(roomsError)throw roomsError;
   const {error:tenantsError}=await supabase.from('tenants').upsert(
    (parsed.tenants as Record<string,unknown>[]).map(row=>({...row,property_id:pid})),{onConflict:'id'}
   );
   if(tenantsError)throw tenantsError;
   const {error:invoicesError}=await supabase.from('invoices').upsert(
    (parsed.invoices as Record<string,unknown>[]).map(row=>({...row,property_id:pid})),{onConflict:'id'}
   );
   if(invoicesError)throw invoicesError;
   if(parsed.payments.length){
    const {error}=await supabase.from('payments').upsert(parsed.payments as Record<string,unknown>[],{onConflict:'id'});
    if(error)throw error;
   }
   const {error:expensesError}=await supabase.from('expenses').upsert(
    (parsed.expenses as Record<string,unknown>[]).map(row=>({...row,property_id:pid})),{onConflict:'id'}
   );
   if(expensesError)throw expensesError;
   setF({...initial,...propertyData,owner_name:String(propertyData.owner_name||''),manager:String(propertyData.manager||''),phone:String(propertyData.phone||''),address:String(propertyData.address||''),currency:String(propertyData.currency||'IDR'),logo:String(propertyData.logo||'')} as Form);
   setSaved(true);setTimeout(()=>setSaved(false),3000);
   window.dispatchEvent(new Event('kostpro-settings-updated'));
  }catch(e){setError(e instanceof Error?e.message:'Gagal restore backup.')}
 };

 if(loading)return <div className="card">Memuat pengaturan...</div>;
 if(loading)return <div className="card">Memuat pengaturan...</div>;
 return <><div className="top"><div><div className="title">Pengaturan Properti</div><div className="sub">Identitas properti tersimpan di Supabase dan terpisah untuk setiap akun.</div></div><button className="btn secondary" onClick={logout}>Keluar</button></div>{error&&<div className="card" style={{marginBottom:18,color:'#b91c1c'}}>{error}</div>}<div className="card"><div className="section-title">Profil Properti</div><div className="form"><div className="field"><label>Nama Kost</label><input value={f.name} onChange={e=>set('name',e.target.value)}/></div><div className="field"><label>Nama Pemilik</label><input value={f.owner_name} onChange={e=>set('owner_name',e.target.value)}/></div><div className="field"><label>Nama Pengelola</label><input value={f.manager} onChange={e=>set('manager',e.target.value)}/></div><div className="field"><label>Telepon</label><input value={f.phone} onChange={e=>set('phone',e.target.value)}/></div><div className="field"><label>Mata Uang</label><select value={f.currency} onChange={e=>set('currency',e.target.value)}><option value="IDR">IDR — Rupiah Indonesia</option></select></div><div className="field full"><label>Alamat</label><textarea rows={3} value={f.address} onChange={e=>set('address',e.target.value)}/></div><div className="field"><label>Logo Properti</label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={image}/>{f.logo&&<img src={f.logo} alt="Logo properti" style={{maxWidth:150,maxHeight:80,marginTop:8,objectFit:'contain'}}/>}</div></div><div className="actions"><button className="btn" onClick={save}>Simpan Pengaturan</button></div>{saved&&<div style={{marginTop:12,color:'#047857',fontWeight:700}}>✓ Pengaturan tersimpan.</div>}</div></>;
}