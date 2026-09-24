import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function db(){
 const c=await cookies();
 return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL||'',process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'',{
  cookies:{getAll(){return c.getAll()},setAll(){}}});
}
async function auth(){const s=await db();const {data:{user}}=await s.auth.getUser();return {s,user}}
export async function GET(){
 try{const {s,user}=await auth();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});const {data,error}=await s.from('rooms').select('*').order('room_code');if(error)throw error;return NextResponse.json({rooms:(data||[]).map(x=>({id:x.room_code,tenant:x.tenant_name,price:Number(x.rent),status:x.status,property_id:x.property_id}))})}
 catch(e){return NextResponse.json({error:'Database belum terhubung.'},{status:503})}
}
export async function POST(req:Request){
 try{const {s,user}=await auth();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});const b=await req.json(),room=b?.room;if(!room?.id||!['available','occupied','maintenance'].includes(room.status))return NextResponse.json({error:'Data kamar tidak valid.'},{status:400});
  const {data,error}=await s.from('rooms').upsert({room_code:String(room.id),tenant_name:room.tenant||'-',rent:Number(room.price)||0,status:room.status}, {onConflict:'property_id,room_code'}).select().single();
  if(error)throw error;return NextResponse.json({room:{id:data.room_code,tenant:data.tenant_name,price:Number(data.rent),status:data.status}});
 }catch(e){return NextResponse.json({error:'Gagal menyimpan kamar.'},{status:500})}
}
