# KostPro — Kost Management System

Starter production-ready Next.js application for managing boarding houses/kost.

## Modules
- Dashboard
- Kamar
- Penghuni
- Tagihan & Pembayaran
- Keuangan
- Laporan
- Pengaturan
- Supabase database schema

## Run locally
```powershell
npm install
npm run dev
```
Open http://localhost:3000

## Deploy to GitHub + Vercel
1. Create a GitHub repository.
2. Upload all project files (do not upload `.env.local`).
3. Import the repository in Vercel.
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel Environment Variables.
5. Deploy.

## Supabase
For a new database, run `supabase/schema.sql` in Supabase SQL Editor.

## Version Archive
- **V.1.3** — current version: CCTV menu and management, login-link support, dashboard CCTV shortcuts, and build/type fixes.

## Production
- Property-scoped cloud persistence repair verified against production Supabase on 2026-09-27.
- Current main branch contains the production Supabase client and middleware alignment.

<!-- deployment trigger: verified build 4fd0d1d5 -->
<!-- deployment trigger: retry 2026-09-29 -->