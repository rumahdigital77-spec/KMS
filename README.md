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

This version uses demo data in the UI so it can render immediately. The schema is prepared for the next integration stage: authentication, multi-property access, CRUD, billing, payments, expenses and reports.
