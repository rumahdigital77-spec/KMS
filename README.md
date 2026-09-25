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
- Created Database + Database Login

## Account & Property
- 1 email = 1 account.
- 1 account can own multiple properties.
- Property access is isolated by authenticated user and RLS.
- Created Database creates the property and associates it with the logged-in account.
- Database Login uses Supabase Auth; passwords are never stored in application tables.

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
For the existing project, `supabase/migration_account_property_provisioning.sql` contains the account/property access hardening. Run `supabase/migration_one_time_database_provisioning.sql` once to install the idempotent provisioning function. After that, pressing **CREATE DATABASE** repeatedly cannot create a second initial property for the same account; the database function reuses the existing property and the UI disables the button after detection.

This version uses Supabase Auth for account login and a dedicated account_properties membership table for multi-property ownership.

## Version Archive
- **V.1.4** — Created Database and Database Login flow, multi-property account mapping, and property storage bucket preparation.
