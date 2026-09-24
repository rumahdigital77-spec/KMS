import { createServerClient } from '@supabase/ssr';
import { NextResponse,type NextRequest } from 'next/server';
export async function middleware(request:NextRequest){
 let response=NextResponse.next({request});
 const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL||'',process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||',{cookies:{getAll(){return request.cookies.getAll()},setAll(cookies){cookies.forEach(({name,value,options})=>{request.cookies.set({name,value,...options});response.cookies.set({name,value,...options})})}}});
 const {data:{user}}=await supabase.auth.getUser(),path=request.nextUrl.pathname;
 if(path.startsWith('/api/auth/')||path==='/login'||path.startsWith('/_next/')||path.includes('.'))return response;
 if(!user)return NextResponse.redirect(new URL('/login',request.url));
 return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
