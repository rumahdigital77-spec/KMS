-- KMS one-time-safe owner/property provisioning.
-- Production signature is intentionally explicit so PostgREST RPC discovery
-- matches the browser call exactly.

drop function if exists public.provision_owner_property(text, text, text, text, text);

create function public.provision_owner_property(
  p_address text,
  p_email text,
  p_full_name text,
  p_phone text,
  p_property_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_property_id uuid;
  v_email text;
begin
  if v_user_id is null then
    raise exception 'OWNER_NOT_AUTHENTICATED';
  end if;

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

  -- One account gets one initial property. Existing provisioning always wins.
  select id into v_property_id
  from public.properties
  where owner_user_id = v_user_id
  order by created_at asc
  limit 1;

  if v_property_id is null then
    insert into public.properties(name, address, phone, owner_user_id)
    values (
      trim(p_property_name),
      nullif(trim(coalesce(p_address, '')), ''),
      nullif(trim(coalesce(p_phone, '')), ''),
      v_user_id
    )
    on conflict (owner_user_id) where owner_user_id is not null
    do update set owner_user_id = excluded.owner_user_id
    returning id into v_property_id;
  end if;

  insert into public.account_properties(user_id, property_id, role)
  values(v_user_id, v_property_id, 'owner')
  on conflict (user_id, property_id) do update set role = 'owner';

  insert into public.user_accounts(user_id, email, full_name, property_id, role, status)
  values(v_user_id, v_email, nullif(trim(p_full_name), ''), v_property_id, 'owner', 'active')
  on conflict (user_id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    property_id = excluded.property_id,
    role = 'owner',
    status = 'active',
    updated_at = now();

  insert into public.licenses(user_id, plan, status)
  values(v_user_id, 'standard', 'active')
  on conflict (user_id) do nothing;

  return v_property_id;
end;
$$;

grant execute on function public.provision_owner_property(text, text, text, text, text) to authenticated;
revoke execute on function public.provision_owner_property(text, text, text, text, text) from public, anon;

notify pgrst, 'reload schema';
