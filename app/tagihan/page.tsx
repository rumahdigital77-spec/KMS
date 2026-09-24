'use client';
import{useEffect,useState}from'react';
import{defaultPayments,defaultTransactions,loadData,money,Payment,saveData,Transaction}from'@/lib/store';
export default function Tagihan(){
 const[p,setP]=useState<Payment[]>(defaultPayments),[show,setShow]=useState(false),[sel,setSel]=useState(''),[method,setMethod]=useState('transfer'),[msg,setMsg]=useState('');
 useEffect(()=>{setP(loadData('payments',defaultPayments));if(new URLSearchParams(location.search).get('aksi')==='catat')setShow(true)},[]);
 const pay=()=>{
  if(!sel)return setMsg('Pilih tagihan.');
  const current=p.find(x=>x.id===sel);
  if(!current)return setMsg('Tagihan tidak ditemukan.');
  if(current.status==='paid')return setMsg('Tagihan ini sudah lunas.');
  const paidAt=new Date().toISOString().slice(0,10);
  let receiptNo=current.receiptNo;
  let receiptNext=1;
  try{const raw=localStorage.getItem('kostpro_settings');const s=raw?JSON.parse(raw):{};receiptNext=Number(s.receiptNext||1);if(!receiptNo){receiptNo=(s.receiptPrefix||'KW')+'-'+new Date().getFullYear()+'-'+String(receiptNext).padStart(5,'0');localStorage.setItem('kostpro_settings',JSON.stringify({...s,receiptNext:receiptNext+1}))}}catch{}
  const n=p.map(x=>x.id===sel?{...x,status:'paid' as const,paidAt,method,receiptNo}:x);
  const tx:Transaction={id:'TR-'+Date.now(),date:paidAt,description:'Pelunasan sewa '+current.tenant+' — '+current.room,category:'Pendapatan sewa',amount:current.amount,type:'income'};
  const transactions=[...loadData('transactions',defaultTransactions),tx];
  setP(n);saveData('payments',n);saveData('transactions',transactions);setShow(false);setMsg('Pelunasan berhasil. Transaksi pendapatan dan data pembayaran sudah dicatat.');
  location.href='/kwitansi?id='+encodeURIComponent(current.id);
 };
 const openPay=(id:string)=>{setSel(id);setShow(true);setMsg('')};
 return <><div className="top"><div><div className="title">Tagihan & Pembayaran</div><div className="sub">Monitoring sewa bulanan, pelunasan dan bukti pembayaran</div></div><button className="btn" onClick={()=>{setShow(!show);setMsg('')}}>+ Catat Pembayaran</button></div>{msg&&<div className="card" style={{marginBottom:18}}>{msg}</div>}{show&&<div className="card" style={{marginBottom:18}}><div className="section-title">Catat Pembayaran / Pelunasan</div><div className="form"><div className="field full"><label>Tagihan</label><select value={sel} onChange={e=>setSel(e.target.value)}><option value="">Pilih tagihan belum lunas</option>{p.filter(x=>x.status==='unpaid').map(x=><option key={x.id} value={x.id}>{x.tenant} — {x.room} — {money(x.amount)}</option>)}</select></div><div className="field"><label>Metode</label><select value={method} onChange={e=>setMethod(e.target.value)}><option value="transfer">Transfer</option><option value="cash">Cash</option><option value="qris">QRIS</option></select></div></div><div className="actions"><button className="btn" onClick={pay}>Simpan & Lunas + Buat Kwitansi</button><button className="btn secondary" onClick={()=>setShow(false)}>Batal</button></div></div>}<div className="card"><table className="table"><thead><tr><th>Penghuni</th><th>Kamar</th><th>Periode</th><th>Nominal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{p.map(x=><tr key={x.id}><td><b>{x.tenant}</b></td><td>{x.room}</td><td>{x.month}</td><td>{money(x.amount)}</td><td><span className={'badge '+(x.status==='paid'?'green':'red')}>{x.status==='paid'?'Lunas':'Belum Bayar'}</span></td><td>{x.status==='unpaid'?<button className="btn secondary" onClick={()=>openPay(x.id)}>Pelunasan</button>:<button className="btn secondary" onClick={()=>location.href='/kwitansi?id='+encodeURIComponent(x.id)}>Kwitansi</button>}</td></tr>)}</tbody></table></div></>}