'use client';
import{useEffect,useState}from'react';
import{defaultPayments,defaultTransactions,loadData,money,Payment,saveData,Transaction}from'@/lib/store';
export default function Tagihan(){
 const[p,setP]=useState<Payment[]>(defaultPayments),[show,setShow]=useState(false),[sel,setSel]=useState(''),[method,setMethod]=useState('transfer'),[paidAmount,setPaidAmount]=useState(''),[paidAt,setPaidAt]=useState(()=>new Date().toISOString().slice(0,10)),[msg,setMsg]=useState('');
 useEffect(()=>{const payments=loadData('payments',defaultPayments);setP(payments.filter(x=>x.status==='unpaid'));const q=new URLSearchParams(location.search);const paymentId=q.get('id');if(paymentId){setSel(paymentId);setShow(true);if(q.get('baru')==='1')setMsg('Penghuni baru berhasil dibuat. Tagihan pertama sudah dibuat. Pilih metode pembayaran lalu klik “Simpan & Lunas + Buat Kwitansi”.')}else if(q.get('aksi')==='catat')setShow(true)},[]);
 const pay=async()=>{
  if(!sel)return setMsg('Pilih tagihan.');
  const current=p.find(x=>x.id===sel);
  if(!current)return setMsg('Tagihan tidak ditemukan.');
  if(current.status==='paid')return setMsg('Tagihan ini sudah lunas.');
  const paymentAmount=Number(paidAmount||current.amount);
  if(!Number.isFinite(paymentAmount)||paymentAmount!==Number(current.amount))return setMsg('Nominal pembayaran harus sama dengan total tagihan. Pembayaran parsial belum diaktifkan.');
  if(!paidAt)return setMsg('Tanggal pembayaran wajib diisi.');

  try{
    const supabase=(await import('@/lib/supabase-browser')).createClient();
    const {data,error}=await supabase.rpc('post_payment_transaction_v2',{
      p_payment_id:current.id,
      p_paid_at:paidAt,
      p_method:method,
    });
    if(error)throw new Error(error.message||'Gagal memposting pembayaran.');
    const result=(data&&typeof data==='object')?data as Record<string,unknown>:{};
    const receiptNo=String(result.receipt_no||current.receiptNo||'');
    const paidPayment={...current,status:'paid' as const,paidAt,method,receiptNo};
    const n=p.filter(x=>x.id!==sel);
    const paymentHistory=loadData<Payment[]>('paymentHistory',[]);
    const nextPaymentHistory=[...paymentHistory.filter(x=>x.id!==paidPayment.id),paidPayment];
    const existing=loadData<Transaction[]>('transactions',defaultTransactions);
    const hasTx=existing.some(x=>x.referenceId===current.id);
    const transactions=hasTx?existing:[...existing,{
      id:'TR-'+Date.now(),
      date:paidAt,
      description:'POSTING KAMAR — '+current.room+' — '+current.tenant+' — '+current.month+' — '+method.toUpperCase(),
      category:'Pendapatan Kamar',
      amount:paymentAmount,
      type:'income',
      referenceId:current.id,
    }];
    localStorage.setItem('kostpro_payments',JSON.stringify(n));
    localStorage.setItem('kostpro_paymentHistory',JSON.stringify(nextPaymentHistory));
    localStorage.setItem('kostpro_transactions',JSON.stringify(transactions));
    setP(n);
    setShow(false);
    setMsg(result.already_posted?'Pembayaran sudah terposting dan transaksi keuangan sudah tercatat. Membuka kwitansi...':'Pelunasan berhasil. Pembayaran, history, dan transaksi pendapatan diposting atomik ke database. Membuka kwitansi...');
    location.href='/kwitansi?id='+encodeURIComponent(current.id);
  }catch(error){
    setMsg(error instanceof Error?error.message:'Gagal menyimpan pelunasan ke database.');
  }
 };
 const openPay=(id:string)=>{const item=p.find(x=>x.id===id);setSel(id);setPaidAmount(item?String(item.amount):'');setPaidAt(new Date().toISOString().slice(0,10));setShow(true);setMsg('')};
 return <div className="tagihan-page"><div className="top tagihan-top"><div><div className="title">Tagihan & Pembayaran</div><div className="sub">Alur: penghuni baru → tagihan → pelunasan → transaksi → kwitansi</div></div><button className="btn" onClick={()=>{setShow(!show);if(!show){setPaidAmount('');setPaidAt(new Date().toISOString().slice(0,10));}setMsg('')}}>+ Catat Pembayaran</button></div>{msg&&<div className="card tagihan-notice" style={{marginBottom:18}}>{msg}</div>}{show&&<div className="card tagihan-payment-card" style={{marginBottom:18}}><div className="section-title">Pelunasan Tagihan</div><div className="sub" style={{marginBottom:14}}>Pilih tagihan yang akan dibayar. Setelah disimpan, sistem otomatis mencatat transaksi dan membuka kwitansi.</div><div className="form"><div className="field full"><label>Tagihan</label><select value={sel} onChange={e=>setSel(e.target.value)}><option value="">Pilih tagihan belum lunas</option>{p.map(x=><option key={x.id} value={x.id}>{x.tenant} — {x.room} — {money(x.amount)}</option>)}</select></div><div className="field"><label>Nominal Dibayar</label><input type="number" min="0" value={paidAmount} onChange={e=>setPaidAmount(e.target.value)} placeholder="Nominal sesuai tagihan" /></div><div className="field"><label>Tanggal Pembayaran</label><input type="date" value={paidAt} onChange={e=>setPaidAt(e.target.value)} /></div><div className="field"><label>Metode</label><select value={method} onChange={e=>setMethod(e.target.value)}><option value="transfer">Transfer</option><option value="cash">Cash</option><option value="qris">QRIS</option></select></div></div><div className="actions"><button className="btn" onClick={pay}>Simpan & Lunas + Buat Kwitansi</button><button className="btn secondary" onClick={()=>setShow(false)}>Batal</button></div></div>}<div className="card tagihan-list-card"><div className="tagihan-list-head"><div><div className="section-title">Daftar Tagihan Aktif</div><div className="sub">Tagihan yang masih menunggu pelunasan.</div></div><span className="tagihan-count">{p.length} tagihan</span></div><div className="table-wrap"><table className="table tagihan-table"><thead><tr><th>Penghuni</th><th>Kamar</th><th>Periode</th><th>Nominal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{p.filter(x=>x.status==='unpaid').map(x=><tr key={x.id}><td><b>{x.tenant}</b></td><td>{x.room}</td><td>{x.month}</td><td>{money(x.amount)}</td><td><span className={'badge '+(x.status==='paid'?'green':'red')}>{x.status==='paid'?'Lunas':'Belum Bayar'}</span></td><td>{x.status==='unpaid'?<button className="btn secondary tagihan-action" onClick={()=>openPay(x.id)}>Pelunasan → Kwitansi</button>:<button className="btn secondary tagihan-action" onClick={()=>location.href='/kwitansi?id='+encodeURIComponent(x.id)}>Lihat Kwitansi</button>}</td></tr>)}</tbody></table></div></div></div>}
