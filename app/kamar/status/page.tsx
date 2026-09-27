'use client';
import { useEffect, useState } from 'react';
import { defaultRooms, loadData, money, Room, saveData } from '@/lib/store';
const label=(s:Room['status'])=>s==='occupied'?'Terisi':s==='available'?'Tersedia':'Maintenance';
export default function EditRoomStatus(){
  const [rooms,setRooms]=useState<Room[]>(defaultRooms); const [msg,setMsg]=useState('');
  useEffect(()=>{setRooms(loadData<Room[]>('rooms',defaultRooms));},[]);
  const change=async(id:string,status:Room['status'])=>{const next=rooms.map(r=>r.id===id?{...r,status,tenant:status==='available'||status==='maintenance'?'-':r.tenant}:r);setRooms(next);try{await saveData('rooms',next);setMsg('Status kamar berhasil diperbarui.')}catch(e){setMsg(e instanceof Error?e.message:'Gagal menyimpan status kamar.')}};
  return <>
    <div className="top"><div><div className="title">Edit Room Status</div><div className="sub">Ubah status kamar secara langsung. Status Tersedia dan Maintenance otomatis mengosongkan penghuni.</div></div></div>
    {msg&&<div className="card" style={{marginBottom:18}}>{msg}</div>}
    <div className="card"><div className="section-title">Status Kamar</div>
      <table className="table"><thead><tr><th>Kamar</th><th>Penghuni</th><th>Harga / bulan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
      {rooms.map(r=><tr key={r.id}><td><b>{r.id}</b></td><td>{r.tenant}</td><td>{money(r.price)}</td><td><span className={'badge '+(r.status==='occupied'?'green':r.status==='available'?'blue':'amber')}>{label(r.status)}</span></td><td><div className="actions"><button className="btn" disabled={r.status==='available'} onClick={()=>change(r.id,'available')}>Tersedia</button><button className="btn secondary" disabled={r.status==='maintenance'} onClick={()=>change(r.id,'maintenance')}>Maintenance</button><button className="btn secondary" disabled={r.status==='occupied'} onClick={()=>change(r.id,'occupied')}>Terisi</button></div></td></tr>)}
      </tbody></table></div>
  </>;
}
