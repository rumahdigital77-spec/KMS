-- KMS hardening: one-time provisioning and account authorization
-- Applied to production as migration_harden_one_time_provisioning_and_account_policies.
-- Prevent client users from changing authorization records; provisioning remains
-- exclusively inside trusted SECURITY DEFINER functions.
drop policy if exists "account_properties_self_insert" on public.account_properties;
drop policy if exists "account_properties_self_delete" on public.account_properties;
drop policy if exists "user_accounts_self_insert" on public.user_accounts;
drop policy if exists "user_accounts_self_update" on public.user_accounts;

revoke insert, update, delete on public.account_properties from anon, authenticated;
revoke insert, update, delete on public.user_accounts from anon, authenticated;

create or replace function public.provision_owner_property(
  p_address text, p_email text, p_full_name text, p_phone text, p_property_name text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_property_id uuid; v_email text;
begin
  if v_user_id is null then raise exception 'OWNER_NOT_AUTHENTICATED'; end if;
  select lower(email) into v_email from auth.users where id=v_user_id;
  if v_email is null then raise exception 'OWNER_EMAIL_NOT_FOUND'; end if;
  if p_email is not null and lower(trim(p_email))<>v_email then raise exception 'OWNER_EMAIL_MISMATCH'; end if;
  if nullif(trim(p_property_name),'') is null then raise exception 'PROPERTY_NAME_REQUIRED'; end if;
  select id into v_property_id from public.properties where owner_user_id=v_user_id order by created_at limit 1;
  if v_property_id is null and exists(select 1 from public.properties) then raise exception 'DATABASE_ALREADY_PROVISIONED'; end if;
  if v_property_id is null then
    insert into public.properties(name,address,phone,owner_user_id)
    values(trim(p_property_name),nullif(trim(coalesce(p_address,'')),''),nullif(trim(coalesce(p_phone,'')),''),v_user_id)
    returning id into v_property_id;
  end if;
  insert into public.account_properties(user_id,property_id,role) values(v_user_id,v_property_id,'owner')
    on conflict(user_id,property_id) do update set role='owner';
  insert into public.user_accounts(user_id,email,full_name,property_id,role,status)
    values(v_user_id,v_email,nullif(trim(p_full_name),''),v_property_id,'owner','active')
    on conflict(user_id) do update set email=excluded.email,full_name=coalesce(excluded.full_name,public.user_accounts.full_name),
      property_id=excluded.property_id,role='owner',status='active',updated_at=now();
  insert into public.licenses(user_id,plan,status,starts_at) values(v_user_id,'standard','active',now())
    on conflict(user_id) do nothing;
  return v_property_id;
end; $$;

grant execute on function public.provision_owner_property(text,text,text,text,text) to authenticated;
revoke execute on function public.provision_owner_property(text,text,text,text,text) from anon, public;

create or replace function public.ensure_owner_account()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_property_id uuid; v_email text; v_full_name text; v_property_name text; v_address text; v_phone text;
begin
  v_email:=lower(trim(coalesce(new.email,'')));
  if v_email='' then return new; end if;
  v_full_name:=nullif(trim(coalesce(new.raw_user_meta_data->>'full_name','')),'');
  v_property_name:=nullif(trim(coalesce(new.raw_user_meta_data->>'property_name','')),'');
  v_address:=nullif(trim(coalesce(new.raw_user_meta_data->>'address','')),'');
  v_phone:=nullif(trim(coalesce(new.raw_user_meta_data->>'phone','')),'');
  select p.id into v_property_id from public.properties p where p.owner_user_id=new.id order by p.created_at limit 1;
  if v_property_id is null and not exists(select 1 from public.properties) then
    insert into public.properties(name,address,phone,owner_user_id)
    values(coalesce(v_property_name,'Kost Saya'),v_address,v_phone,new.id) returning id into v_property_id;
  end if;
  if v_property_id is null then return new; end if;
  insert into public.account_properties(user_id,property_id,role) values(new.id,v_property_id,'owner')
    on conflict(user_id,property_id) do update set role='owner';
  insert into public.user_accounts(user_id,email,full_name,property_id,role,status)
    values(new.id,v_email,v_full_name,v_property_id,'owner','active')
    on conflict(user_id) do update set email=excluded.email,full_name=excluded.full_name,
      property_id=excluded.property_id,role='owner',status='active',updated_at=now();
  insert into public.licenses(user_id,plan,status,starts_at) values(new.id,'standard','active',now())
    on conflict(user_id) do nothing;
  return new;
end; $$;

notify pgrst,'reload schema';