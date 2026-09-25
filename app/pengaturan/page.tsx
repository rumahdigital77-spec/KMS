/* Vercel production rebuild marker: 2026-09-25-5 */
/* Vercel production rebuild marker: 2026-09-25-4 */
'use client';
import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase-browser';

type S={name:string;phone:string;address:string;currency:string;manager:string;ownerName:string;availableRooms:number;logo:string;signature:string;receiptPrefix:string;receiptNext:number};
const d:S={name:'Kost Harmoni',phone:'0812-0000-0000',address:'Alamat properti',currency:'IDR',manager:'Pengelola Kost',ownerName:'',availableRooms:0,logo:'',signature:'',receiptPrefix:'KW',receiptNext:1};

export default function Pengaturan(){
 const [f,setF]=useState<S>(d),[saved,setSaved]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[databaseCreated,setDatabaseCreated]=useState(false),[loginEmail,setLoginEmail]=useState(''),[loginPassword,setLoginPassword]=useState(''),[loginBusy,setLoginBusy]=useState(false),[loginMsg,setLoginMsg]=useState('');
 const supabase=createClient();
 useEffect(()=>{
  let active=true;
  const syncDatabaseState=async()=>{
   try{
    const {data:{user}}=await supabase.auth.getUser();
    if(!active)return;
    if(!user){
     setEmail('');
     setDatabaseCreated(false);
     setMsg('');
     return;
    }
    setEmail(user.email||'');
    const {data}=await supabase.from('account_properties').select('property_id').eq('user_id',user.id).limit(1).maybeSingle();
    if(!active)return;
    if(data?.property_id){
     setDatabaseCreated(true);
     setMsg('✓ Database sudah dibuat untuk account ini.');
    }else{
     setDatabaseCreated(false);
    }
   }catch{}
  };
  try{
   const x=localStorage.getItem('kostpro_settings');
   if(x)setF({...d,...JSON.parse(x)});
  }catch{}
  syncDatabaseState();
  const {data:listener}=supabase.auth.onAuthStateChange((event)=>{
   if(event==='SIGNED_OUT'){
    setDatabaseCreated(false);
    setEmail('');
    setPassword('');
    setMsg('');
    return;
   }
   if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')syncDatabaseState();
  });
  return()=>{active=false;listener.subscription.unsubscribe()};
 },[]);
 const set=(k:keyof S,v:string|number)=>setF(x=>({...x,[k]:v}));
 const image=(k:'logo'|'signature')=>(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;if(file.size>1024*1024)return alert('File maksimal 1 MB.');const r=new FileReader();r.onload=()=>set(k,String(r.result));r.readAsDataURL(file)};
 const save=()=>{localStorage.setItem('kostpro_settings',JSON.stringify(f));setSaved(true);setTimeout(()=>setSaved(false),2500)};
 const createDatabase=async(e:FormEvent)=>{e.preventDefault();if(databaseCreated||busy)return;setMsg('');const ownerEmail=email.trim().toLowerCase(),propertyName=f.name.trim();if(!ownerEmail||password.length<6||!propertyName){setMsg('Email, password minimal 6 karakter, dan nama property wajib diisi.');return}setBusy(true);
  try{
   let {data:{user}}=await supabase.auth.getUser();
   if(user?.email?.toLowerCase()!==ownerEmail){await supabase.auth.signOut();user=null;}
   if(!user){
    const sign=await supabase.auth.signUp({email:ownerEmail,password,options:{data:{full_name:f.ownerName||ownerEmail,property_name:propertyName,address:f.address||'',phone:f.phone||''}}});
    if(sign.error){if(/already registered|already exists/i.test(sign.error.message||'')){const login=await supabase.auth.signInWithPassword({email:ownerEmail,password});if(login.error)throw new Error('Email sudah terdaftar tetapi password tidak cocok. Gunakan Database Login.');user=login.data.user;}else throw sign.error;}
    else {user=sign.data.user;if(!sign.data.session)throw new Error('EMAIL_NOT_CONFIRMED');}
   }
   if(!user)throw new Error('AUTH_USER_MISSING');
   const {data:sessionData}=await supabase.auth.getSession();if(!sessionData.session)throw new Error('AUTH_SESSION_MISSING');
   const {data:result,error:fnError}=await supabase.functions.invoke('provision-account',{body:{action:'bootstrap',property_name:propertyName,address:f.address||'',phone:f.phone||'',full_name:f.ownerName||null}});
   if(fnError)throw new Error(fnError.message||'DATABASE_PROVISIONING_FAILED');
   if(!result?.propertyId)throw new Error(String(result?.error||'PROPERTY_ID_NOT_RETURNED'));
   setDatabaseCreated(true);setMsg('✓ Database + account owner + property + akses berhasil dibuat.');setPassword('');setTimeout(()=>{window.location.href='/'},700);
  }catch(err){const detail=err instanceof Error?err.message:String(err);setMsg(detail==='EMAIL_NOT_CONFIRMED'?'Email belum terkonfirmasi. Pastikan Confirm email OFF pada project Supabase KMS.':detail==='AUTH_SESSION_MISSING'?'Session login belum tersedia. Silakan LOGIN DATABASE lalu ulangi CREATE DATABASE.':detail||'Pembuatan database gagal.');}finally{setBusy(false)}};
 const login=async(e:FormEvent)=>{e.preventDefault();setLoginMsg('');setLoginBusy(true);try{const {error}=await supabase.auth.signInWithPassword({email:loginEmail.trim().toLowerCase(),password:loginPassword});if(error)throw error;window.location.href='/'}catch(err){setLoginMsg(err instanceof Error?err.message:'Login gagal.')}finally{setLoginBusy(false)}};
 return <><div className="top"><div><div className="title">Pengaturan</div><div className="sub">Profil pemilik, property, database dan akses login</div></div></div>
 <div className="card"><div className="section-title">Created Database</div><div className="sub" style={{marginBottom:14}}>Satu email = satu account. Satu account dapat memiliki satu atau banyak property.</div><form onSubmit={createDatabase}><div className="form"><div className="field"><label>Email Account</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="owner@email.com" autoComplete="email"/></div><div className="field"><label>Password Login</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter" autoComplete="new-password"/></div><div className="field"><label>Nama Property</label><input value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Nama kost / hotel"/></div></div><div className="actions" style={{marginTop:14}}><button className="btn" type="submit" disabled={busy||databaseCreated}>{busy?'Membuat...':databaseCreated?'DATABASE SUDAH DIBUAT':'CREATE DATABASE'}</button></div></form>{msg&&<div className="sub" style={{marginTop:12,color:msg.startsWith('✓')?'#047857':'#b45309',fontWeight:700}}>{msg}</div>}</div>
 <div className="card" style={{marginTop:18}}><div className="section-title">Database Login</div><div className="sub" style={{marginBottom:14}}>Gunakan email dan password yang dibuat untuk mengakses account dan property.</div><form onSubmit={login}><div className="form"><div className="field"><label>Email</label><input type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="owner@email.com" autoComplete="email"/></div><div className="field"><label>Password</label><input type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="Password" autoComplete="current-password"/></div></div><div className="actions" style={{marginTop:14}}><button className="btn" type="submit" disabled={loginBusy}>{loginBusy?'Masuk...':'LOGIN DATABASE'}</button></div></form>{loginMsg&&<div className="sub" style={{marginTop:12,color:'#b45309',fontWeight:700}}>{loginMsg}</div>}</div>
 <div className="card" style={{marginTop:18}}><div className="section-title">Profil Kost & Pemilik</div><div className="form"><div className="field"><label>Nama Kost</label><input value={f.name} onChange={e=>set('name',e.target.value)}/></div><div className="field"><label>Nama Pemilik</label><input value={f.ownerName} onChange={e=>set('ownerName',e.target.value)} placeholder="Nama lengkap pemilik"/></div><div className="field"><label>Nomor Telepon</label><input value={f.phone} onChange={e=>set('phone',e.target.value)}/></div><div className="field"><label>Jumlah Kamar Tersedia</label><input type="number" min={0} value={f.availableRooms} onChange={e=>set('availableRooms',Math.max(0,Number(e.target.value)||0))}/><div className="sub">Isi manual jika ingin menampilkan kuota kamar khusus di Dashboard.</div></div><div className="field full"><label>Alamat Lengkap</label><textarea value={f.address} onChange={e=>set('address',e.target.value)} rows={3}/></div><div className="field"><label>Nama Pengelola</label><input value={f.manager} onChange={e=>set('manager',e.target.value)}/></div><div className="field"><label>Mata Uang</label><select value={f.currency} onChange={e=>set('currency',e.target.value)}><option>IDR — Rupiah Indonesia</option></select></div><div className="field"><label>Logo Kost</label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={image('logo')}/>{f.logo&&<><img src={f.logo} alt="Logo" style={{maxWidth:140,maxHeight:70,marginTop:8,objectFit:'contain'}}/><button type="button" className="btn" style={{marginTop:8}} onClick={()=>set('logo','')}>Hapus Logo</button></>}</div><div className="field"><label>Tanda Tangan Digital</label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={image('signature')}/>{f.signature&&<><img src={f.signature} alt="Tanda tangan" style={{maxWidth:180,maxHeight:70,marginTop:8,objectFit:'contain'}}/><button type="button" className="btn" style={{marginTop:8}} onClick={()=>set('signature','')}>Hapus TTD Digital</button></>}</div></div></div>
 <div className="card" style={{marginTop:18}}><div className="section-title">Penomoran Kwitansi</div><div className="form"><div className="field"><label>Prefix</label><input value={f.receiptPrefix} onChange={e=>set('receiptPrefix',e.target.value.toUpperCase())}/></div><div className="field"><label>Nomor Berikutnya</label><input type="number" min={1} value={f.receiptNext} onChange={e=>set('receiptNext',Math.max(1,Number(e.target.value)||1))}/></div></div><div className="sub" style={{marginTop:10}}>Format otomatis: {f.receiptPrefix}-{new Date().getFullYear()}-{String(f.receiptNext).padStart(5,'0')}</div><div className="actions"><button className="btn" onClick={save}>Simpan Pengaturan</button></div>{saved&&<div className="sub" style={{marginTop:12,color:'#047857',fontWeight:700}}>✓ Pengaturan berhasil disimpan.</div>}</div></>}
