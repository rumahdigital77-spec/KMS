'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, DoorOpen, Users, Wallet, BarChart3, Settings, FileText, Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

const items=[['/','Dashboard',LayoutDashboard],['/kamar','Kamar',DoorOpen],['/penghuni','Penghuni Aktif',Users],['/kwitansi','Kwitansi',FileText],['/keuangan','Keuangan',Wallet],['/laporan','Laporan',BarChart3],['/pengaturan','Pengaturan',Settings]] as const;

export default function Sidebar(){
 const p=usePathname();const[open,setOpen]=useState(false);const[logo,setLogo]=useState('');const[propertyName,setPropertyName]=useState('Kost Harmoni');
 useEffect(()=>{let mounted=true;const load=async()=>{try{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data:map}=await supabase.from('property_users').select('property_id').eq('user_id',user.id).single();if(!map?.property_id)return;const {data:property}=await supabase.from('properties').select('name,logo').eq('id',map.property_id).single();if(mounted&&property){setPropertyName(property.name||'Kost Harmoni');setLogo(property.logo||'')}}catch{try{const raw=localStorage.getItem('kostpro_settings');if(raw){const s=JSON.parse(raw);if(mounted){setPropertyName(s.name||'Kost Harmoni');setLogo(s.logo||'')}}}catch{}}};load();return()=>{mounted=false}},[p]);
 useEffect(()=>{setOpen(false)},[p]);useEffect(()=>{document.body.style.overflow=open?'hidden':'';return()=>{document.body.style.overflow=''}},[open]);
 return <><button type="button" className="mobile-menu-btn" aria-label={open?'Tutup menu':'Buka menu'} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<X size={23}/>:<Menu size={23}/>}</button>{open&&<button type="button" className="sidebar-overlay" aria-label="Tutup menu" onClick={()=>setOpen(false)}/>}<aside className={'sidebar '+(open?'sidebar-open':'')}><div className="brand" style={{display:'flex',alignItems:'center',gap:12,minHeight:58}}>{logo?<img src={logo} alt="Logo properti" style={{width:52,height:52,objectFit:'contain',borderRadius:10,background:'transparent'}}/>:<div style={{fontWeight:900,fontSize:22}}>KOST<span>PRO</span></div>}<div style={{minWidth:0}}><div style={{fontWeight:800,fontSize:14,color:'#f8fafc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{propertyName}</div><div className="sub" style={{color:'#98a2b3',fontSize:11}}>Management System</div></div></div><nav className="nav">{items.map(([href,label,Icon])=><Link className={p===href?'active':''} href={href} key={href}><Icon size={17} style={{verticalAlign:'middle',marginRight:10}}/>{label}</Link>)}</nav></aside></>
}
