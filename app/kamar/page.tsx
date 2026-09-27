'use client';
import{useEffect,useState}from'react';import{defaultRooms,loadData,money,Room,saveData}from'@/lib/store';
const label=(s:Room['status'])=>s==='occupied'?'Terisi':s==='available'?'Tersedia':'Maintenance';
export default function Kamar(){const[r,setR]=useState<Room[]>(defaultRooms),[add,setAdd]=useState(false),[detail,setDetail]=useState<Room|null>(null),[code,setCode]=useState(''),[price,setPrice]=useState(''),[status,setStatus]=useState<Room['status']>('available'),[msg,setMsg]=useState('');
useEffect(()=>{
  const load=async()=>{
    const local=loadData<Room[]>('rooms',defaultRooms);
    try {
      const res=await fetch('/api/rooms',{cache:'no-store'});
      const data=await res.json();
      const cloud=Array.isArray(data.rooms)?data.rooms as Room[]:[];
      // property_app_state is the canonical application state. The normalized
      // room table is only a secondary index for booking/public availability.
      // Never let a partial/empty normalized response erase local property data.
      const source=local.length?local:cloud;
      setR(source);
      if(source.length){
        await saveData('rooms',source);
        await Promise.all(source.map(async room=>{
          const response=await fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room})});
          if(!response.ok) throw new Error('Gagal menyinkronkan kamar ke database.');
        }));
      }
    } catch(error) {
      setR(local);
      if(error instanceof Error && local.length===0) setMsg(error.message);
    }
    const q=new URLSearchParams(window.location.search);
    if(q.get('aksi')==='tambah')setAdd(true);
    const roomId=q.get('room');
    if(roomId){const target=local.find(x=>x.id===roomId);if(target)setDetail(target);}
  };
  void load();
},[]);
const save=async()=>{if(!code.trim()||!price)return setMsg('Kode dan harga wajib diisi.');if(r.some(x=>x.id.toLowerCase()===code.trim().toLowerCase()))return setMsg('Kode kamar sudah ada.');const room={id:code.trim().toUpperCase(),tenant:'-',price:+price,status:'available' as const};
const n=[...r,room];setR(n);

try{await saveData('rooms',n);const response=await fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room})});if(!response.ok)throw new Error('Gagal menyinkronkan kamar ke database.');setCode('');setPrice('');setAdd(false);setMsg('Kamar berhasil ditambahkan sebagai Tersedia.')}catch(error){setMsg(error instanceof Error?`Kamar tersimpan lokal tetapi sinkronisasi gagal: ${error.message}`:'Gagal menyimpan kamar ke database.')}};
const changeStatus=async(id:string,s:Room['status'])=>{const n=r.map(x=>x.id===id?{...x,status:s,tenant:s==='available'||s==='maintenance'?'-':x.tenant}:x);const room=n.find(x=>x.id===id);setR(n);try{await saveData('rooms',n);if(room){const response=await fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room})});if(!response.ok)throw new Error('Gagal menyinkronkan status kamar ke database.')}}catch(error){setMsg(error instanceof Error ? 'Status kamar tersimpan lokal tetapi sinkronisasi gagal: '+error.message : 'Gagal menyimpan status kamar ke database.')}setDetail(room||null)};return <><div className="top"><div><div className="title">Kamar</div><div className="sub">Informasi kamar, penghuni, harga, dan status. Klik Kelola Status untuk mengubah status kamar.</div></div><button className="btn" onClick={()=>setAdd(!add)}>+ Tambah Kamar</button></div>{msg&&<div className="card" style={{marginBottom:18}}>{msg}</div>}{add&&<div className="card" style={{marginBottom:18}}><div className="section-title">Tambah Kamar</div><div className="form"><div className="field"><label>Kode Kamar</label><input value={code} onChange={e=>setCode(e.target.value)} placeholder="K-07"/></div><div className="field"><label>Harga / bulan</label><input type="number" value={price} onChange={e=>setPrice(e.target.value)}/></div></div><div className="actions"><button className="btn" onClick={save}>Simpan Kamar</button><button className="btn secondary" onClick={()=>setAdd(false)}>Batal</button></div></div>}<div className="card"><div className="section-title">Daftar Kamar</div><div className="sub" style={{marginBottom:12}}>Status dapat diedit langsung melalui tombol Kelola Status.</div><table className="table"><thead><tr><th>Kamar</th><th>Penghuni</th><th>Harga / bulan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{r.map(x=><tr key={x.id}><td><b>{x.id}</b></td><td>{x.tenant}</td><td>{money(x.price)}</td><td><span className={'badge '+(x.status==='occupied'?'green':x.status==='available'?'blue':'amber')}>{label(x.status)}</span></td><td><button className="btn secondary" onClick={()=>setDetail(x)}>Kelola Status</button></td></tr>)}</tbody></table></div>{detail&&<div className="card" style={{marginTop:18}}><div className="section-title">Kelola {detail.id}</div><p>Penghuni: <b>{detail.tenant}</b></p><p>Harga: <b>{money(detail.price)}</b></p><p>Status saat ini: <b>{label(detail.status)}</b></p><div className="actions"><button className="btn" disabled={detail.status==='available'} onClick={()=>changeStatus(detail.id,'available')}>Tersedia</button><button className="btn secondary" disabled={detail.status==='maintenance'} onClick={()=>changeStatus(detail.id,'maintenance')}>Maintenance</button><button className="btn secondary" disabled={detail.status==='occupied'} onClick={()=>changeStatus(detail.id,'occupied')}>Terisi</button><button className="btn secondary" onClick={()=>setDetail(null)}>Tutup</button></div><div className="sub" style={{marginTop:10}}>Status terisi sebaiknya diisi melalui proses tambah penghuni agar data penghuni dan tagihan tetap sinkron.</div></div>}</>}