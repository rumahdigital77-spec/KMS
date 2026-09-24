'use client';

import Link from 'next/link';
import { usePathname,useRouter } from 'next/navigation';
import { useEffect,useState } from 'react';
import { LayoutDashboard,DoorOpen,Users,Wallet,BarChart3,Settings,FileText,Menu,X,LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

const items=[['/','Dashboard',LayoutDashboard],['/kamar','Kamar',DoorOpen],['/penghuni','Penghuni Aktif',Users],['/kwitansi','Kwitansi',FileText],['/keuangan','Keuangan',Wallet],['/laporan','Laporan',BarChart3],['/pengaturan','Pengaturan',Settings]] as const;

export default function Sidebar(){
 const p=usePathname(),router=useRouter();const[open,setOpen]=useState(false);const[name,setName]=useState('Kost Harmoni');const[logo,setLogo]=useState('');const[loggedIn,setLoggedIn]=useState(false);
 useEffect(()=>{(async()=>{const{data:user}=await supabase.auth.getUser();setLoggedIn(Boolean(user.user));if(!user.user)return;const{data:m}=await supabase.from('property_users').select('property_id').eq('user_id',user.user.id).maybeSingle();if(!m?.property_id)return;const{data:x}=await supabase.from('properties').select('name,logo').eq('id',m.property_id).maybeSingle();if(x){setName(x.name);setLogo(x.logo||'')}})()},[p]);
 useEffect(()=>{setOpen(false)},[p]);useEffect(()=>{document.body.style.overflow=open?'hidden':'';return()=>{document.body.style.overflow=''}},[open]);
 const logout=async()=>{await supabase.auth.signOut();router.replace('/login')};
 return <><button type="button" className="mobile-menu-btn" aria-label="menu" onClick={()=>setOpen(v=>!v)}>{open?<X size={23}/>:<Menu size={23}/>}</button>{open&&<button type="button" className="sidebar-overlay" aria-label="Tutup menu" onClick={()=>setOpen(false)}/>}<aside className={'sidebar '+(open?'sidebar-open':'')}><div className="brand" style={{display:'flex',alignItems:'center',gap:12,minHeight:58}}>{logo?<img src={logo} alt="Logo properti" style={{width:52,height:52,objectFit:'contain',borderRadius:10,background:'#fff'}}/>:<div style={{fontWeight:900,fontSize:22}}>KOST<span>PRO</span></div>}<div style={{minWidth:0}}><div style={{fontWeight:800,fontSize:14,color:'#f8fafc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div><div className="sub" style={{color:'#98a2b3',fontSize:11}}>Management System</div></div></div><nav className="nav">{items.map(([href,label,Icon])=><Link className={p===href?'active':''} href={href} key={href}><Icon size={17} style={{verticalAlign:'middle',marginRight:10}}/>{label}</Link>)}</nav>{loggedIn&&<button className="btn secondary" style={{marginTop:'auto'}} onClick={logout}><LogOut size={16}/> Keluar</button>}</aside></>;
}