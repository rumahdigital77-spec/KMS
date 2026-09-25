-- KMS one-time-safe owner/property provisioning.
-- The RPC argument names MUST match the browser call exactly.
-- Re-running this migration is safe; provisioning itself is idempotent per user.

drop function if exists public.provision_owner_property(text, text, text, text, text);

create function public.provision_owner_property(
  p_address text default null,
  p_email text default null,
  p_full_name text default null,
  p_phone text default null,
  p_property_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_property_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(coalesce(p_property_name, '')), '') is null then
    raise exception 'Property name is required';
  end if;

  -- One account gets one initial property. This lock also prevents duplicate
  -- creation when two tabs or two requests run at the same time.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  -- Existing provisioning wins. Never create a second initial property.
  select ap.property_id
    into v_property_id
    from public.account_properties ap
   where ap.user_id = v_user_id
   order by ap.created_at asc
   limit 1;

  if v_property_id is not null then
    return v_property_id;
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
  values (v_user_id, v_property_id, 'owner')
  on conflict (user_id, property_id) do nothing;

  insert into public.user_accounts(user_id, email, full_name, property_id, role, status)
  values (
    v_user_id,
    lower(trim(coalesce(p_email, ''))),
    nullif(trim(coalesce(p_full_name, '')), ''),
    v_property_id,
    'owner',
    'active'
  )
  on conflict (user_id) do update
    set property_id = excluded.property_id,
        role = 'owner',
        status = 'active';

  return v_property_id;
end;
$$;

grant execute on function public.provision_owner_property(text, text, text, text, text)
  to authenticated;
