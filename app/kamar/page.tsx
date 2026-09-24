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
      if(res.ok && Array.isArray(data.rooms) && data.rooms.length){setR(data.rooms);saveData('rooms',data.rooms);}
      else {
        setR(local);
        await Promise.all(local.map(room=>fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room})})));
      }
    } catch { setR(local); }
    const q=new URLSearchParams(location.search);
    if(q.get('aksi')==='tambah')setAdd(true);
  };
  load();
},[]);
const save=()=>{if(!code.trim()||!price)return setMsg('Kode dan harga wajib diisi.');if(r.some(x=>x.id.toLowerCase()===code.trim().toLowerCase()))return setMsg('Kode kamar sudah ada.');const room={id:code.trim().toUpperCase(),tenant:'-',price:+price,status:'available' as const};
const n=[...r,room];setR(n);saveData('rooms',n);
fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room})}).catch(()=>{});
setCode('');setPrice('');setAdd(false);setMsg('Kamar berhasil ditambahkan sebagai Tersedia.')};
const changeStatus=(id:string,s:Room['status'])=>{const n=r.map(x=>x.id===id?{...x,status:s,tenant:s==='available'||s==='maintenance'?'-':x.tenant}:x);setR(n);saveData('rooms',n);
const room=n.find(x=>x.id===id);if(room)fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room})}).catch(()=>{});
setDetail(room||null)};
return <><div className="top"><div><div className="title">Manajemen Kamar</div><div className="sub">Pantau hunian dan kelola status setiap unit</div></div><button className="btn" onClick={()=>setAdd(!add)}>+ Tambah Kamar</button></div>{msg&&<div className="card" style={{marginBottom:18}}>{msg}</div>}<div className="grid">{(['occupied','available','maintenance'] as Room['status'][]).map(s=><div className="card" key={s}><div className="label">{label(s)}</div><div className="metric">{r.filter(x=>x.status===s).length}</div><div className="sub">{s==='occupied'?'Sedang dihuni':s==='available'?'Siap disewakan':'Tidak tersedia'}</div></div>)}</div>{add&&<div className="card" style={{marginBottom:18}}><div className="section-title">Tambah Kamar</div><div className="form"><div className="field"><label>Kode Kamar</label><input value={code} onChange={e=>setCode(e.target.value)} placeholder="K-07"/></div><div className="field"><label>Harga / bulan</label><input type="number" value={price} onChange={e=>setPrice(e.target.value)}/></div></div><div className="actions"><button className="btn" onClick={save}>Simpan Kamar</button><button className="btn secondary" onClick={()=>setAdd(false)}>Batal</button></div></div>}<div className="card"><table className="table"><thead><tr><th>Kamar</th><th>Penghuni</th><th>Harga / bulan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{r.map(x=><tr key={x.id}><td><b>{x.id}</b></td><td>{x.tenant}</td><td>{money(x.price)}</td><td><span className={'badge '+(x.status==='occupied'?'green':x.status==='available'?'blue':'amber')}>{label(x.status)}</span></td><td><button className="btn secondary" onClick={()=>setDetail(x)}>Kelola Status</button></td></tr>)}</tbody></table></div>{detail&&<div className="card" style={{marginTop:18}}><div className="section-title">Kelola {detail.id}</div><p>Penghuni: <b>{detail.tenant}</b></p><p>Harga: <b>{money(detail.price)}</b></p><p>Status saat ini: <b>{label(detail.status)}</b></p><div className="actions"><button className="btn" disabled={detail.status==='available'} onClick={()=>changeStatus(detail.id,'available')}>Tersedia</button><button className="btn secondary" disabled={detail.status==='maintenance'} onClick={()=>changeStatus(detail.id,'maintenance')}>Maintenance</button><button className="btn secondary" disabled={detail.status==='occupied'} onClick={()=>changeStatus(detail.id,'occupied')}>Terisi</button><button className="btn secondary" onClick={()=>setDetail(null)}>Tutup</button></div><div className="sub" style={{marginTop:10}}>Status terisi sebaiknya diisi melalui proses tambah penghuni agar data penghuni dan tagihan tetap sinkron.</div></div>}</>}
