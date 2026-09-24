'use client';
import{useEffect,useState}from'react';
import{defaultRooms,defaultTenants,defaultPayments,loadData,Room,saveData,Tenant,Payment}from'@/lib/store';
export default function Penghuni(){
 const[t,setT]=useState<Tenant[]>(defaultTenants),[r,setR]=useState<Room[]>(defaultRooms),[show,setShow]=useState(false),[name,setName]=useState(''),[room,setRoom]=useState(''),[phone,setPhone]=useState(''),[date,setDate]=useState(()=>new Date().toISOString().slice(0,10)),[rent,setRent]=useState(''),[msg,setMsg]=useState('');
 useEffect(()=>{setT(loadData('tenants',defaultTenants));setR(loadData('rooms',defaultRooms));if(new URLSearchParams(location.search).get('aksi')==='tambah')setShow(true)},[]);
 const add=()=>{
  const rm=r.find(x=>x.id===room);
  if(!name||!rm)return setMsg('Nama dan kamar wajib diisi.');
  if(rm.status!=='available')return setMsg('Kamar tidak tersedia.');
  const monthlyRent=+rent||rm.price;
  const nt:Tenant={id:'T-'+Date.now(),name,room,phone,startDate:date,rent:monthlyRent};
  const nr=r.map(x=>x.id===room?{...x,tenant:name,status:'occupied' as const}:x);
  const tt=[...t,nt];
  const month=new Date(date).toLocaleDateString('id-ID',{month:'long',year:'numeric'});
  const paymentId='P-'+Date.now();
  const np=[...loadData('payments',defaultPayments),{id:paymentId,tenant:name,room,month,amount:monthlyRent,status:'unpaid' as const} as Payment];
  setT(tt);setR(nr);saveData('tenants',tt);saveData('rooms',nr);saveData('payments',np);
  location.href='/tagihan?id='+encodeURIComponent(paymentId)+'&baru=1';
 };
 return <><div className="top"><div><div className="title">Penghuni</div><div className="sub">Data penghuni, kontrak dan kontak darurat</div></div><button className="btn" onClick={()=>setShow(!show)}>+ Tambah Penghuni</button></div>{msg&&<div className="card" style={{marginBottom:18}}>{msg}</div>}{show&&<div className="card" style={{marginBottom:18}}><div className="section-title">Tambah Penghuni</div><div className="form"><div className="field"><label>Nama</label><input value={name} onChange={e=>setName(e.target.value)}/></div><div className="field"><label>Kamar</label><select value={room} onChange={e=>{setRoom(e.target.value);const x=r.find(y=>y.id===e.target.value);if(x)setRent(String(x.price))}}><option value="">Pilih kamar</option>{r.filter(x=>x.status==='available').map(x=><option key={x.id} value={x.id}>{x.id}</option>)}</select></div><div className="field"><label>Telepon</label><input value={phone} onChange={e=>setPhone(e.target.value)}/></div><div className="field"><label>Mulai Sewa</label><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div><div className="field"><label>Sewa / bulan</label><input type="number" value={rent} onChange={e=>setRent(e.target.value)}/></div></div><div className="actions"><button className="btn" onClick={add}>Simpan Penghuni</button><button className="btn secondary" onClick={()=>setShow(false)}>Batal</button></div></div>}<div className="card"><table className="table"><thead><tr><th>Nama</th><th>Kamar</th><th>Telepon</th><th>Mulai Sewa</th><th>Sewa</th></tr></thead><tbody>{t.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.room}</td><td>{x.phone}</td><td>{x.startDate}</td><td>Rp{x.rent.toLocaleString('id-ID')}</td></tr>)}</tbody></table></div></>}