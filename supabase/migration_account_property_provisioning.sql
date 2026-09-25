-- KMS account/property provisioning
-- 1 account (email) -> 1 user, 1 user -> many properties.
create table if not exists public.account_properties (
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','manager','staff')),
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);
alter table public.account_properties enable row level security;
drop policy if exists "account_properties_self_select" on public.account_properties;
create policy "account_properties_self_select" on public.account_properties for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "account_properties_self_insert" on public.account_properties;
create policy "account_properties_self_insert" on public.account_properties for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "account_properties_self_delete" on public.account_properties;
create policy "account_properties_self_delete" on public.account_properties for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "user_accounts_self_insert" on public.user_accounts;
create policy "user_accounts_self_insert" on public.user_accounts for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "user_accounts_self_update" on public.user_accounts;
create policy "user_accounts_self_update" on public.user_accounts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "properties_owner_select" on public.properties;
create policy "properties_owner_select" on public.properties for select to authenticated using (owner_user_id = (select auth.uid()) or exists (select 1 from public.account_properties ap where ap.user_id=(select auth.uid()) and ap.property_id=properties.id));
drop policy if exists "properties_owner_insert" on public.properties;
create policy "properties_owner_insert" on public.properties for insert to authenticated with check (owner_user_id = (select auth.uid()));
drop policy if exists "properties_owner_update" on public.properties;
create policy "properties_owner_update" on public.properties for update to authenticated using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
drop policy if exists "properties_owner_delete" on public.properties;
create policy "properties_owner_delete" on public.properties for delete to authenticated using (owner_user_id = (select auth.uid()));
insert into storage.buckets (id,name,public) values ('property-files','property-files',false) on conflict (id) do nothing;
