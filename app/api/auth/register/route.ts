import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export async function POST(req:Request){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Supabase belum dikonfigurasi.'},{status:503});
 try{
  const b=await req.json(),username=String(b.username||'').trim().toLowerCase(),password=String(b.password||''),name=String(b.name||'').trim();
  if(!username||password.length<6||!name)return NextResponse.json({error:'Nama, username, dan password minimal 6 karakter wajib diisi.'},{status:400});
  const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:existing}=await admin.from('property_users').select('user_id').eq('username',username).maybeSingle();
  if(existing)return NextResponse.json({error:'Username sudah digunakan.'},{status:409});
  const {data:auth,error:authError}=await admin.auth.admin.createUser({email:`${username}@kms.local`,password,email_confirm:true,user_metadata:{username}});
  if(authError||!auth.user)throw authError||new Error('Gagal membuat user.');
  const {data:property,error:propertyError}=await admin.from('properties').insert({name,address:b.address||null,phone:b.phone||null,logo:b.logo||null,manager:b.manager||null,owner_name:b.ownerName||null,currency:'IDR'}).select('id').single();
  if(propertyError)throw propertyError;
  const {error:mapError}=await admin.from('property_users').insert({user_id:auth.user.id,username,property_id:property.id,role:'owner'});
  if(mapError)throw mapError;
  return NextResponse.json({ok:true,propertyId:property.id});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Gagal mendaftarkan properti.'},{status:500})}
}
