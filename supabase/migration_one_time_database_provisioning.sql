-- One-time-safe KMS database provisioning
-- The function is intentionally idempotent: repeated calls for the same authenticated
-- account return the existing first property instead of creating another one.
create or replace function public.provision_owner_property(
  p_property_name text,
  p_address text default null,
  p_phone text default null,
  p_full_name text default null,
  p_email text default null
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

  -- Serialize first-time provisioning for this account. This prevents two browser
  -- tabs or double-clicks from creating two initial properties concurrently.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  -- If the account already owns/is linked to a property, provisioning is complete.
  select ap.property_id
    into v_property_id
    from public.account_properties ap
   where ap.user_id = v_user_id
   order by ap.created_at asc
   limit 1;

  if v_property_id is not null then
    return v_property_id;
  end if;

  -- Create the initial property exactly once for this account.
  insert into public.properties(name, address, phone, owner_user_id)
  values (trim(p_property_name), nullif(trim(coalesce(p_address, '')), ''), nullif(trim(coalesce(p_phone, '')), ''), v_user_id)
  returning id into v_property_id;

  insert into public.account_properties(user_id, property_id, role)
  values (v_user_id, v_property_id, 'owner')
  on conflict (user_id, property_id) do nothing;

  insert into public.user_accounts(user_id, email, full_name, property_id, role, status)
  values (v_user_id, lower(trim(coalesce(p_email, ''))), nullif(trim(coalesce(p_full_name, '')), ''), v_property_id, 'owner', 'active')
  on conflict (user_id) do nothing;

  return v_property_id;
end;
$$;

grant execute on function public.provision_owner_property(text, text, text, text, text) to authenticated;
