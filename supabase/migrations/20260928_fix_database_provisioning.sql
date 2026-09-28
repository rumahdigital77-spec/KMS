-- KOSTPRO v1.5: fix database provisioning and initialize rooms from room count.
-- The UI calls the six-argument RPC below. Keep the legacy five-argument
-- overload for compatibility, but route it through the same implementation.

create or replace function public.provision_owner_property(
  p_address text,
  p_email text,
  p_full_name text,
  p_phone text,
  p_property_name text
) returns uuid
language plpgsql
security invoker
set search_path=public,pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_property_id uuid;
  v_email text;
begin
  return public.provision_owner_property(
    p_address,
    p_email,
    p_full_name,
    p_phone,
    p_property_name,
    1
  );
end;
$$;

create or replace function public.provision_owner_property(
  p_address text,
  p_email text,
  p_full_name text,
  p_phone text,
  p_property_name text,
  p_room_count integer
) returns uuid
language plpgsql
security invoker
set search_path=public,pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_property_id uuid;
  v_email text;
  v_room_count integer;
  i integer;
  v_room_code text;
begin
  if v_user_id is null then
    raise exception 'OWNER_NOT_AUTHENTICATED';
  end if;

  v_room_count := greatest(1, least(coalesce(p_room_count, 0), 1000));

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select lower(email) into v_email
  from auth.users
  where id = v_user_id;

  if v_email is null then
    raise exception 'OWNER_EMAIL_NOT_FOUND';
  end if;

  if p_email is not null and lower(trim(p_email)) <> v_email then
    raise exception 'OWNER_EMAIL_MISMATCH';
  end if;

  if nullif(trim(p_property_name), '') is null then
    raise exception 'PROPERTY_NAME_REQUIRED';
  end if;

  if exists (
    select 1
    from public.user_accounts ua
    where ua.user_id = v_user_id
      and ua.property_id is not null
  ) then
    raise exception 'DATABASE_ALREADY_PROVISIONED';
  end if;

  insert into public.properties(name, address, phone, owner_user_id)
  values (
    trim(p_property_name),
    nullif(trim(coalesce(p_address, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    v_user_id
  )
  returning id into v_property_id;

  insert into public.account_properties(user_id, property_id, role)
  values (v_user_id, v_property_id, 'owner');

  insert into public.user_accounts(
    user_id, email, full_name, property_id, role, status
  )
  values (
    v_user_id,
    v_email,
    nullif(trim(p_full_name), ''),
    v_property_id,
    'owner',
    'active'
  )
  on conflict(user_id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.user_accounts.full_name),
    property_id = excluded.property_id,
    role = 'owner',
    status = 'active',
    updated_at = now();

  insert into public.licenses(
    user_id, plan, status, starts_at, created_at, updated_at
  )
  values (v_user_id, 'standard', 'active', now(), now(), now())
  on conflict(user_id) do nothing;

  for i in 1..v_room_count loop
    v_room_code := 'K-' || lpad(i::text, 2, '0');

    insert into public.rooms(property_id, room_code, rent, status)
    values (v_property_id, v_room_code, 0, 'available');

    insert into public.kost_rooms(
      id, property_id, room_code, tenant, price, status, updated_at
    )
    values (
      v_property_id::text || ':' || v_room_code,
      v_property_id,
      v_room_code,
      '-',
      0,
      'available',
      now()
    );
  end loop;

  return v_property_id;
exception
  when unique_violation then
    raise exception 'DATABASE_ALREADY_PROVISIONED';
end;
$$;

revoke all on function public.provision_owner_property(text,text,text,text,text) from public,anon;
grant execute on function public.provision_owner_property(text,text,text,text,text) to authenticated;

revoke all on function public.provision_owner_property(text,text,text,text,text,integer) from public,anon;
grant execute on function public.provision_owner_property(text,text,text,text,text,integer) to authenticated;
