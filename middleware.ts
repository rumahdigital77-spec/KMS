import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: cookies => cookies.forEach(({name,value,options}) => { request.cookies.set(name,value); response.cookies.set(name,value,options); }) } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const path=request.nextUrl.pathname;
  const publicPath=path==='/login'||path==='/daftar'||path.startsWith('/api/auth');
  if(!user&&!publicPath){const url=request.nextUrl.clone();url.pathname='/login';url.searchParams.set('next',path);return NextResponse.redirect(url)}
  if(user&&(path==='/login'||path==='/daftar'))return NextResponse.redirect(new URL('/',request.url));
  return response;
}

export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
