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
  const path = request.nextUrl.pathname;
  // Pengaturan memiliki gate login di halaman (Supabase property user atau Superadmin lama).
  // Jangan blokir lewat middleware karena session Superadmin disimpan di sessionStorage browser.
  if (user && (path === '/login' || path === '/daftar')) {
    const next = request.nextUrl.searchParams.get('next');
    const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/pengaturan';
    return NextResponse.redirect(new URL(target, request.url));
  }
  return response;
}

export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
