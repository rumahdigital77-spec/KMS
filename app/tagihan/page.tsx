'use client';
import{useEffect,useState}from'react';
import{defaultPayments,defaultTransactions,loadData,money,Payment,saveData,Transaction}from'@/lib/store';
export default function Tagihan(){
 const[p,setP]=useState<Payment[]>(defaultPayments),[show,setShow]=useState(false),[sel,setSel]=useState(''),[method,setMethod]=useState('transfer'),[msg,setMsg]=useState('');
 useEffect(()=>{const payments=loadData<Payment[]>('payments',defaultPayments);setP(payments.filter(x=>x.status==='unpaid'));const q=new URLSearchParams(location.search);const paymentId=q.get('id');if(paymentId){setSel(paymentId);setShow(true);if(q.get('baru')==='1')setMsg('Penghuni baru berhasil dibuat. Tagihan pertama sudah dibuat. Pilih tamu C.I., metode pembayaran lalu klik “Simpan & Lunas + Buat Kwitansi”.')}else if(q.get('aksi')==='catat')setShow(true)},[]);
 const pay=async()=>{
  if(!sel)return setMsg('Pilih pembayaran dari tamu C.I.');
  const current=p.find(x=>x.id===sel);
  if(!current)return setMsg('Pembayaran tamu C.I. tidak ditemukan.');
  if(current.status==='paid')return setMsg('Pembayaran ini sudah lunas.');
  const paidAt=new Date().toISOString().slice(0,10);
  let receiptNo=current.receiptNo;
  try{const s=loadData<Record<string,unknown>>('settings',{});const next=Number(s.receiptNext||1);if(!receiptNo){receiptNo=(String(s.receiptPrefix||'KW'))+'-'+new Date().getFullYear()+'-'+String(next).padStart(5,'0');await saveData('settings',{...s,receiptNext:next+1})}}catch{}
  const paidPayment={...current,status:'paid' as const,paidAt,method,receiptNo};
  const n=p.filter(x=>x.id!==sel);
  const paymentHistory=loadData<Payment[]>('paymentHistory',[]);
  const historyWithoutDuplicate=paymentHistory.filter(x=>x.id!==paidPayment.id);
  const nextPaymentHistory=[...historyWithoutDuplicate,paidPayment];
  const existing=loadData('transactions',defaultTransactions);
  const alreadyRecorded=existing.some(x=>x.referenceId===current.id);
  const tx:Transaction={id:'TR-'+Date.now(),date:paidAt,description:'Pelunasan sewa '+current.tenant+' — '+current.room+' — '+current.month,category:'Pendapatan sewa',amount:current.amount,type:'income',referenceId:current.id};
  const transactions=alreadyRecorded?existing:[...existing,tx];
  try{setP(n);await Promise.all([saveData('payments',n),saveData('paymentHistory',nextPaymentHistory),saveData('transactions',transactions)]);}catch(error){setMsg(error instanceof Error?\`Gagal menyimpan pelunasan: \${error.message}\`:'Gagal menyimpan pelunasan ke database.');return;}setShow(false);setMsg(alreadyRecorded?'Tagihan lunas dan dipindahkan dari daftar tagihan aktif. Membuka kwitansi...':'Pelunasan berhasil. Tagihan dipindahkan ke History Payment dan nomor kwitansi sudah dicatat. Membuka kwitansi...');
  location.href='/kwitansi?id='+encodeURIComponent(current.id);
 };
 const openPay=(id:string)=>{setSel(id);setShow(true);setMsg('')};
 return <><div className="top"><div><div className="title">Tagihan & Pembayaran</div><div className="sub">Semua tagihan pembayaran dibuat otomatis dari setiap tamu yang melakukan C.I.</div></div><button className="btn" onClick={()=>{setShow(!show);setMsg('')}}>+ Catat Pembayaran</button></div>{msg&&<div className="card" style={{marginBottom:18}}>{msg}</div>}{show&&<div className="card" style={{marginBottom:18}}><div className="section-title">Pilih Pembayaran Lunas</div><div className="sub" style={{marginBottom:14}}>Daftar di bawah mengambil seluruh tagihan belum lunas yang dibuat saat tamu C.I. Pilih tamu, lalu tentukan metode pembayaran.</div><div className="form"><div className="field full"><label>Pembayaran Tamu C.I.</label><select value={sel} onChange={e=>setSel(e.target.value)}><option value="">Pilih tamu C.I. yang belum lunas</option>{p.map(x=><option key={x.id} value={x.id}>{x.tenant} — {x.room} — {x.month} — {money(x.amount)}</option>)}</select></div><div className="field"><label>Metode</label><select value={method} onChange={e=>setMethod(e.target.value)}><option value="transfer">Transfer</option><option value="cash">Cash</option><option value="qris">QRIS</option></select></div></div><div className="actions"><button className="btn" onClick={pay}>Simpan & Lunas + Buat Kwitansi</button><button className="btn secondary" onClick={()=>setShow(false)}>Batal</button></div></div>}<div className="card"><table className="table"><thead><tr><th>Penghuni</th><th>Kamar</th><th>Periode</th><th>Nominal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{p.filter(x=>x.status==='unpaid').map(x=><tr key={x.id}><td><b>{x.tenant}</b></td><td>{x.room}</td><td>{x.month}</td><td>{money(x.amount)}</td><td><span className={'badge '+(x.status==='paid'?'green':'red')}>{x.status==='paid'?'Lunas':'Belum Bayar'}</span></td><td>{x.status==='unpaid'?<button className="btn secondary" onClick={()=>openPay(x.id)}>Pelunasan → Kwitansi</button>:<button className="btn secondary" onClick={()=>location.href='/kwitansi?id='+encodeURIComponent(x.id)}>Lihat Kwitansi</button>}</td></tr>)}</tbody></table></div></>}
