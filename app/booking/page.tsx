'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

type Booking = {
  id:string; guest_name:string; guest_phone:string; check_in:string;
  duration_months:number; status:string; created_at:string;
  property_id:string; room_id:string; room_name?:string; property_name?:string;
};

const supabase=createClient();

export default function BookingPage(){
  const [rows,setRows]=useState<Booking[]>([]);
  const [loading,setLoading]=useState(true);
  const [msg,setMsg]=useState('');

  async function load(){
    setLoading(true);
    const { data,error }=await supabase.rpc('get_kostin_bookings_for_owner');
    if(error){setMsg(error.message||'Gagal mengambil booking dari KostIn.');setRows([]);}
    else setRows(Array.isArray(data)?data:[]);
    setLoading(false);
  }
  useEffect(()=>{void load()},[]);

  async function updateStatus(id:string,status:string){
    const {error}=await supabase.rpc('update_kostin_booking_status',{p_booking_id:id,p_status:status});
    if(error){setMsg(error.message||'Gagal mengubah status booking.');return;}
    setMsg(status==='CONFIRMED'?'Booking dikonfirmasi.':status==='CANCELLED'?'Booking ditolak (DENIED).':'');
    void load();
  }

  return <main className="page bookingAdmin">
    <div className="page-header"><div><span className="eyebrow">KOSTIN</span><h1>Booking</h1><p>Booking kamar yang masuk dari KostIn, terhubung ke property KOSTPRO.</p></div><button className="secondaryBtn" onClick={()=>void load()}><CalendarCheck size={16}/> Refresh</button></div>
    {msg&&<div className="notice">{msg}</div>}
    {loading?<div className="notice">Memuat booking...</div>:rows.length===0?<div className="notice">Belum ada booking dari KostIn.</div>:<div className="bookingList">{rows.map(b=><article className="bookingItem" key={b.id}>
      <div className="bookingItemTop"><div><h2>{b.guest_name}</h2><p>{b.guest_phone}</p></div><span className={'bookingStatus '+String(b.status).toLowerCase()}>{b.status}</span></div>
      <div className="bookingMeta"><span>Property: {b.property_name||b.property_id}</span><span>Kamar: {b.room_name||b.room_id}</span><span>Check-in: {new Date(b.check_in+'T00:00:00').toLocaleDateString('id-ID')}</span><span>Durasi: {b.duration_months} bulan</span></div>
      <div className="bookingActions">{b.status==='PENDING'&&<><button onClick={()=>void updateStatus(b.id,'CONFIRMED')}><CheckCircle2 size={16}/> APPROVE</button><button className="dangerBtn" onClick={()=>void updateStatus(b.id,'CANCELLED')}><XCircle size={16}/> DENIED</button></>}{b.status==='CONFIRMED'&&<Link className="bookingCiBtn" href={`/booking/ci?id=${encodeURIComponent(b.id)}`}><CheckCircle2 size={16}/> FORM C.I.</Link>}{b.status==='COMPLETED'&&<span className="confirmedNote"><CheckCircle2 size={16}/> COMPLETED</span>}{b.status==='CANCELLED'&&<span className="confirmedNote"><XCircle size={16}/> DENIED</span>}</div>
    </article>)}</div>}
  </main>
}