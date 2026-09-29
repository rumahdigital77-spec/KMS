'use client';
import{useEffect,useState}from'react';import{defaultRooms,loadData,money,Room,saveData}from'@/lib/store';
const label=(s:Room['status'])=>s==='occupied'?'Terisi':s==='available'?'Tersedia':s==='reserved'?'Reservasi':'Maintenance';
export default function Kamar(){const[r,setR]=useState<Room[]>(defaultRooms),[add,setAdd]=useState(false),[detail,setDetail]=useState<Room|null>(null),[code,setCode]=useState(''),[price,setPrice]=useState(''),[msg,setMsg]=useState('');
useEffect(()=>{
  const load=()=>{
    const local=loadData<Room[]>('rooms',defaultRooms);
    setR(local);
    const q=new URLSearchParams(window.location.search);
    if(q.get('aksi')==='tambah')setAdd(true);
    const roomId=q.get('room');
    if(roomId){const target=local.find(x=>x.id===roomId);if(target)setDetail(target);}
  };
  load();
  const refreshFromBooking = () => load();
  window.addEventListener('kostpro:room-status-changed', refreshFromBooking);
  return () => window.removeEventListener('kostpro:room-status-changed', refreshFromBooking);
},[]);
const save=async()=>{if(!code.trim()||!price)return setMsg('Kode dan harga wajib diisi.');if(r.some(x=>x.id.toLowerCase()===code.trim().toLowerCase()))return setMsg('Kode kamar sudah ada.');const room={id:code.trim().toUpperCase(),tenant:'-',price:+price,status:'available' as const};
const n=[...r,room];setR(n);

try{await saveData('rooms',n);const response=await fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room})});if(!response.ok)throw new Error('Gagal menyinkronkan kamar ke database.');setCode('');setPrice('');setAdd(false);setMsg('Kamar berhasil ditambahkan sebagai Tersedia.')}catch(error){setMsg(error instanceof Error?`Kamar tersimpan lokal tetapi sinkronisasi gagal: ${error.message}`:'Gagal menyimpan kamar ke database.')}};
const changeStatus=async(id:string,s:Room['status'])=>{const current=r.find(x=>x.id===id);if(current?.status==='occupied'&&current.tenant!=='-'){setMsg('Kamar yang sudah Terisi dan memiliki penghuni tidak dapat diedit statusnya.');setDetail(null);return;}const n=r.map(x=>x.id===id?{...x,status:s,tenant:s==='available'||s==='maintenance'?'-':x.tenant}:x);const room=n.find(x=>x.id===id);setR(n);try{await saveData('rooms',n);if(room){const response=await fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room})});if(!response.ok)throw new Error('Gagal menyinkronkan status kamar ke database.')}}catch(error){setMsg(error instanceof Error ? 'Status kamar tersimpan lokal tetapi sinkronisasi gagal: '+error.message : 'Gagal menyimpan status kamar ke database.')}setDetail(room||null)};return <><div className="top"><div><div className="title">Manajemen Kamar</div><div className="sub">Kelola nomor kamar, penghuni, harga, dan status dalam tampilan yang rapi di HP maupun desktop.</div></div><button className="btn" onClick={()=>setAdd(!add)}>+ Tambah Kamar</button></div>{msg&&<div className="card" style={{marginBottom:18}}>{msg}</div>}{add&&<div className="card" style={{marginBottom:18}}><div className="section-title">Tambah Kamar</div><div className="form"><div className="field"><label>Kode Kamar</label><input value={code} onChange={e=>setCode(e.target.value)} placeholder="K-07"/></div><div className="field"><label>Harga / bulan</label><input type="number" value={price} onChange={e=>setPrice(e.target.value)}/></div></div><div className="actions"><button className="btn" onClick={save}>Simpan Kamar</button><button className="btn secondary" onClick={()=>setAdd(false)}>Batal</button></div></div>}<div className="card"><div className="section-title">Daftar Kamar <span className="kamar-count">{r.length} kamar</span></div><div className="sub" style={{marginBottom:12}}>Status dapat diedit langsung melalui tombol Kelola Status.</div><div className="kamar-desktop-table table-wrap"><table className="table"><thead><tr><th>Kamar</th><th>Penghuni</th><th>Harga / bulan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{r.map(x=><tr key={x.id}><td><b>{x.id}</b></td><td>{x.tenant}</td><td>{money(x.price)}</td><td><span className={'badge '+(x.status==='occupied'?'green':x.status==='available'?'blue':x.status==='reserved'?'amber':'amber')}>{label(x.status)}</span></td><td><button className="btn secondary" disabled={x.status==='occupied'&&x.tenant!=='-'} title={x.status==='occupied'&&x.tenant!=='-'?'Kamar terisi dan memiliki penghuni aktif tidak dapat diedit':''} onClick={()=>{if(x.status==='occupied'&&x.tenant!=='-')return;setMsg('');setDetail(x);window.setTimeout(()=>document.getElementById('room-status-detail')?.scrollIntoView({behavior:'smooth',block:'center'}),0)}}>Kelola Status</button></td></tr>)}</tbody></table></div><div className="kamar-mobile-cards">{r.map(x=><div className="kamar-room-card" key={x.id}><div className="kamar-room-head"><div><div className="kamar-room-name">{x.id}</div><div className="kamar-room-tenant">{x.tenant==='-'?'Belum ada penghuni':x.tenant}</div></div><span className={'badge '+(x.status==='occupied'?'green':x.status==='available'?'blue':'amber')}>{label(x.status)}</span></div><div className="kamar-room-info"><div><span>Harga / Bulan</span><b>{money(x.price)}</b></div><div><span>Status</span><b>{label(x.status)}</b></div></div><button className="btn secondary kamar-full-btn" disabled={x.status==='occupied'&&x.tenant!=='-'} title={x.status==='occupied'&&x.tenant!=='-'?'Kamar terisi dan memiliki penghuni aktif tidak dapat diedit':''} onClick={()=>{if(x.status==='occupied'&&x.tenant!=='-')return;setMsg('');setDetail(x);window.setTimeout(()=>document.getElementById('room-status-detail')?.scrollIntoView({behavior:'smooth',block:'center'}),0)}}>Kelola Status</button></div>)}</div></div><div className="card penghuni-active-panel">
<div className="active-panel-head">
<div>
<div className="section-title">Edit Room Status</div>
<div className="sub">Pilih kamar untuk melihat informasi status dan tindakan yang tersedia.</div>
</div>
<div className="active-count"><b>{r.length}</b><span>Total Kamar</span></div>
</div>
<div className="active-selector">
<label htmlFor="room-status-select">Pilih Kamar</label>
<select id="room-status-select" value={detail?.id||''} onChange={e=>{const x=r.find(y=>y.id===e.target.value);setMsg('');setDetail(x||null);if(x)window.setTimeout(()=>document.getElementById('room-status-detail')?.scrollIntoView({behavior:'smooth',block:'center'}),0)}}>
<option value="">Pilih kamar...</option>{r.map(x=><option key={x.id} value={x.id}>{x.id} — {x.tenant==='-'?'Belum ada penghuni':x.tenant}</option>)}
</select>
</div>
{detail&&<div id="room-status-detail" className="active-detail">
<div className="active-detail-top">
<div><div className="active-room-label">KAMAR {detail.id}</div><div className="active-tenant-name">{detail.tenant==='-'?'Belum ada penghuni':detail.tenant}</div></div>
<div className={'badge '+(detail.status==='occupied'?'green':detail.status==='available'?'blue':'amber')}>{label(detail.status)}</div>
</div>
<div className="active-detail-grid">
<div><span>Nomor Kamar</span><b>{detail.id}</b></div>
<div><span>Penghuni</span><b>{detail.tenant}</b></div>
<div><span>Harga / Bulan</span><b>{money(detail.price)}</b></div>
<div><span>Status</span><b>{label(detail.status)}</b></div>
</div>
{detail.status==='occupied'&&detail.tenant!=='-'?<div className="active-actions"><button className="btn secondary" onClick={()=>location.href='/penghuni'}>Kelola di Penghuni Aktif</button><button className="btn secondary" onClick={()=>setDetail(null)}>Tutup</button></div>:<div className="active-actions"><button className="btn" disabled={detail.status==='available'} onClick={()=>changeStatus(detail.id,'available')}>Tersedia</button><button className="btn secondary" disabled={detail.status==='maintenance'} onClick={()=>changeStatus(detail.id,'maintenance')}>Maintenance</button><button className="btn secondary" disabled={detail.status==='reserved'} onClick={()=>changeStatus(detail.id,'reserved')}>Reservasi</button><button className="btn secondary" onClick={()=>setDetail(null)}>Tutup</button></div>}
<div className="sub" style={{marginTop:12}}>Status Terisi dengan penghuni aktif dikelola melalui menu Penghuni Aktif agar data kamar, penghuni, dan tagihan tetap sinkron.</div>
</div>}
</div>
<style jsx>{`
.active-panel-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:20px}
.active-count{min-width:88px;padding:10px 14px;border:1px solid #e5e7eb;border-radius:14px;background:linear-gradient(145deg,#fff,#f7f8fb);text-align:center;box-shadow:0 6px 18px rgba(15,23,42,.06)}
.active-count b{display:block;font-size:22px;line-height:1.1;font-variant-numeric:tabular-nums}
.active-count span{display:block;margin-top:4px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em}
.active-selector{padding:18px;border:1px solid #e5e7eb;border-radius:18px;background:linear-gradient(145deg,#fff,#f8fafc);box-shadow:0 8px 24px rgba(15,23,42,.05)}
.active-selector label{display:block;margin-bottom:8px;font-size:12px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.06em}
.active-selector select{width:100%;height:48px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;padding:0 14px;font-weight:700;color:#0f172a;outline:none}
.active-detail{margin-top:16px;padding:20px;border-radius:18px;background:linear-gradient(145deg,#f8fafc,#fff);border:1px solid #e2e8f0}
.active-detail-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.active-room-label{font-size:11px;font-weight:800;letter-spacing:.08em;color:#64748b}
.active-tenant-name{margin-top:4px;font-size:24px;font-weight:850;letter-spacing:-.02em;color:#0f172a}
.active-detail-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}
.active-detail-grid>div{padding:13px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}
.active-detail-grid span{display:block;font-size:11px;color:#64748b;margin-bottom:5px}
.active-detail-grid b{display:block;font-size:14px;color:#0f172a;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.active-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
@media(max-width:700px){
.active-panel-head{align-items:flex-start}
.active-count{min-width:78px}
.active-tenant-name{font-size:20px}
.active-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.active-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
.active-actions .btn{width:100%}
}
`}</style></></>}