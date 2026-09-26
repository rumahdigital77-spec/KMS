# KostPro — Kost Management System

Production Next.js application for managing boarding houses/kost.

## Modules
- Dashboard
- Kamar
- Penghuni
- Tagihan & Pembayaran
- Keuangan
- Laporan
- Pengaturan
- CCTV
- User & Akses
- Supabase database, Auth, RLS, backup & restore

## Account & Property
- Supabase Auth handles account login; passwords are never stored in application tables.
- Property/account authorization is enforced by RLS and trusted provisioning functions.
- Initial database/property provisioning is globally one-time safe at the database layer.
- Client users cannot self-edit authorization records such as role or property membership.

## Security
- Private booking records require an authenticated session.
- Public booking creation only accepts validated room/date/duration input.
- Public room reads expose available rooms only; room management writes require authentication.
- Database backup/restore is scoped to the authenticated property.

## Run locally
```powershell
npm install
npm run dev
```
Open http://localhost:3000

## Deploy
1. Import the GitHub repository into Vercel.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Configure `SUPABASE_SERVICE_ROLE_KEY` only as a server-side Vercel environment variable.
4. Deploy the `main` branch.

## Supabase
Production migrations currently include:
- `create_kost_management_schema`
- `provision_owner_property_rpc`
- `fix_idempotent_owner_provisioning`
- `repair_properties_data_api_exposure`
- `harden_provisioning_and_indexes`
- `database_backup_restore`
- `lock_create_database_after_first_provisioning`
- `harden_one_time_provisioning_and_account_policies`

The latest hardening migration removes client-side INSERT/UPDATE/DELETE access to account authorization tables and makes provisioning reject a second global property/database.

## Version
KOSTPRO V.1.4
