'use client';
import{useEffect,useState}from'react';
import{defaultTransactions,loadData,money,saveData,Transaction}from'@/lib/store';

export default function Keuangan(){
  const[x,setX]=useState<Transaction[]>(defaultTransactions),[show,setShow]=useState(false),[type,setType]=useState<Transaction['type']>('expense'),[desc,setDesc]=useState(''),[cat,setCat]=useState('Operasional'),[amt,setAmt]=useState(''),[msg,setMsg]=useState(''),[logo,setLogo]=useState(''),[property,setProperty]=useState('Kost Harmoni'),[owner,setOwner]=useState('');
  useEffect(()=>{
    setX(loadData('transactions',defaultTransactions));
    try{const s=JSON.parse(localStorage.getItem('kostpro_settings')||'{}');setLogo(typeof s.logo==='string'?s.logo:'');setProperty(s.name||'Kost Harmoni');setOwner(s.ownerName||s.manager||'')}catch{}
    if(new URLSearchParams(location.search).get('aksi')==='tambah')setShow(true)
  },[]);
  const inc=x.filter(a=>a.type==='income'),exp=x.filter(a=>a.type==='expense');
  const incTotal=inc.reduce((a,b)=>a+b.amount,0),expTotal=exp.reduce((a,b)=>a+b.amount,0),net=incTotal-expTotal;
  const add=()=>{
    if(!desc||!amt)return setMsg('Keterangan dan nominal wajib diisi.');
    const n=[...x,{id:'TR-'+Date.now(),date:new Date().toISOString().slice(0,10),description:desc,category:cat,amount:+amt,type}];
    setX(n);saveData('transactions',n);setDesc('');setAmt('');setShow(false);setMsg('Transaksi berhasil dicatat.')
  };
  const exportPdf=()=>{setMsg('Laporan siap dicetak. Pilih “Save as PDF / Simpan sebagai PDF” pada dialog cetak.');setTimeout(()=>window.print(),80)};
  return <div className="finance-page">
    <div className="screen-only">
      <div className="top"><div><div className="title">Keuangan</div><div className="sub">Arus kas, pendapatan dan pengeluaran</div></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="btn secondary" onClick={exportPdf}>⇩ Export Laporan PDF</button><button className="btn" onClick={()=>setShow(!show)}>+ Catat Transaksi</button></div></div>
      {msg&&<div className="card" style={{marginBottom:18}}>{msg}</div>}
      {show&&<div className="card" style={{marginBottom:18}}><div className="section-title">Catat Transaksi</div><div className="form"><div className="field"><label>Jenis</label><select value={type} onChange={e=>setType(e.target.value as Transaction['type'])}><option value="expense">Pengeluaran / Debet</option><option value="income">Pendapatan / Kredit</option></select></div><div className="field"><label>Kategori</label><input value={cat} onChange={e=>setCat(e.target.value)}/></div><div className="field full"><label>Keterangan</label><input value={desc} onChange={e=>setDesc(e.target.value)}/></div><div className="field"><label>Nominal</label><input type="number" min="0" value={amt} onChange={e=>setAmt(e.target.value)}/></div></div><div className="actions"><button className="btn" onClick={add}>Simpan Transaksi</button><button className="btn secondary" onClick={()=>setShow(false)}>Batal</button></div></div>}
      <div className="grid"><div className="card"><div className="label">Kredit · Pendapatan</div><div className="metric">{money(incTotal)}</div></div><div className="card"><div className="label">Debet · Pengeluaran</div><div className="metric">{money(expTotal)}</div></div><div className="card"><div className="label">Rugi / Laba Bersih</div><div className="metric">{money(net)}</div></div></div>
      <div className="card" style={{marginTop:18}}><div className="section-title">Transaksi Terbaru</div><table className="table"><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Jenis</th><th>Nominal</th></tr></thead><tbody>{x.map(a=><tr key={a.id}><td>{a.date}</td><td>{a.description}</td><td>{a.category}</td><td>{a.type==='income'?'Kredit':'Debet'}</td><td>{money(a.amount)}</td></tr>)}</tbody></table>{!x.length&&<div className="sub">Belum ada transaksi.</div>}</div>
    </div>
    <section className="finance-print-report">
      <div className="finance-print-head"><div><div className="finance-print-kicker">LAPORAN KEUANGAN</div><h1>Rugi Laba</h1><div className="finance-print-property">{property}</div>{owner&&<div className="finance-print-owner">Dikelola oleh {owner}</div>}<div className="finance-print-period">Dicetak: {new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}</div></div>{logo&&<img src={logo} alt="Logo" className="finance-print-logo"/>}</div>
      <div className="finance-print-summary"><div><span>Total Kredit</span><b>{money(incTotal)}</b></div><div><span>Total Debet</span><b>{money(expTotal)}</b></div><div><span>Laba / (Rugi) Bersih</span><b>{money(net)}</b></div></div>
      <div className="finance-print-section"><h2>KREDIT — Pendapatan</h2><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th className="num">Nominal</th></tr></thead><tbody>{inc.map(a=><tr key={a.id}><td>{a.date}</td><td>{a.description}</td><td>{a.category}</td><td className="num">{money(a.amount)}</td></tr>)}{!inc.length&&<tr><td colSpan={4} className="empty">Tidak ada pendapatan.</td></tr>}</tbody><tfoot><tr><td colSpan={3}>Total Kredit</td><td className="num">{money(incTotal)}</td></tr></tfoot></table></div>
      <div className="finance-print-section"><h2>DEBET — Pengeluaran</h2><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th className="num">Nominal</th></tr></thead><tbody>{exp.map(a=><tr key={a.id}><td>{a.date}</td><td>{a.description}</td><td>{a.category}</td><td className="num">{money(a.amount)}</td></tr>)}{!exp.length&&<tr><td colSpan={4} className="empty">Tidak ada pengeluaran.</td></tr>}</tbody><tfoot><tr><td colSpan={3}>Total Debet</td><td className="num">{money(expTotal)}</td></tr></tfoot></table></div>
      <div className="finance-print-result"><span>HASIL RUGI LABA</span><strong>{money(net)}</strong><small>{net>=0?'Surplus / Laba':'Defisit / Rugi'}</small></div>
      <div className="finance-print-foot">Dokumen dibuat dari KOSTPRO • Property Management System</div>
    </section>
  </div>
}
