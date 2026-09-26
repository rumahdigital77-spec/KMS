-- KMS database backup / restore
-- Backup is scoped to the authenticated user's property membership.
-- Restore replaces only the selected property data and never touches auth.users.

create or replace function public.export_property_database_backup()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_property uuid;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select ap.property_id
    into v_property
  from public.account_properties ap
  where ap.user_id = v_user
  order by ap.created_at
  limit 1;

  if v_property is null then
    select p.id into v_property
    from public.properties p
    where p.owner_user_id = v_user
    order by p.created_at
    limit 1;
  end if;

  if v_property is null then
    raise exception 'PROPERTY_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'version', 1,
    'property_id', v_property,
    'tables', jsonb_build_object(
      'properties', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.properties p where p.id = v_property), '[]'::jsonb),
      'rooms', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.rooms r where r.property_id = v_property), '[]'::jsonb),
      'tenants', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at) from public.tenants t where t.property_id = v_property), '[]'::jsonb),
      'invoices', coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at) from public.invoices i where i.property_id = v_property), '[]'::jsonb),
      'payments', coalesce((select jsonb_agg(to_jsonb(pay) order by pay.paid_at) from public.payments pay join public.invoices i on i.id = pay.invoice_id where i.property_id = v_property), '[]'::jsonb),
      'expenses', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from public.expenses e where e.property_id = v_property), '[]'::jsonb)
    )
  );
end;
$$;

create or replace function public.restore_property_database_backup(
  p_backup jsonb,
  p_target_property_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_backup_property uuid;
  v_property_count integer;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_backup is null or coalesce((p_backup->>'version')::integer, 0) <> 1 then
    raise exception 'INVALID_BACKUP_VERSION';
  end if;

  v_backup_property := nullif(p_backup->>'property_id','')::uuid;
  if v_backup_property is null or p_target_property_id is null then
    raise exception 'PROPERTY_ID_REQUIRED';
  end if;

  if v_backup_property <> p_target_property_id then
    raise exception 'BACKUP_PROPERTY_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.properties p
    where p.id = p_target_property_id
      and (
        p.owner_user_id = v_user
        or exists (
          select 1 from public.account_properties ap
          where ap.user_id = v_user and ap.property_id = p.id
        )
      )
  ) then
    raise exception 'PROPERTY_ACCESS_DENIED';
  end if;

  if jsonb_typeof(p_backup->'tables'->'properties') <> 'array'
     or jsonb_typeof(p_backup->'tables'->'rooms') <> 'array'
     or jsonb_typeof(p_backup->'tables'->'tenants') <> 'array'
     or jsonb_typeof(p_backup->'tables'->'invoices') <> 'array'
     or jsonb_typeof(p_backup->'tables'->'payments') <> 'array'
     or jsonb_typeof(p_backup->'tables'->'expenses') <> 'array' then
    raise exception 'INVALID_BACKUP_TABLES';
  end if;

  -- Child rows first, then parent rows.
  delete from public.payments
    where invoice_id in (select id from public.invoices where property_id = p_target_property_id);
  delete from public.invoices where property_id = p_target_property_id;
  delete from public.tenants where property_id = p_target_property_id;
  delete from public.rooms where property_id = p_target_property_id;
  delete from public.expenses where property_id = p_target_property_id;

  -- Restore the property itself but keep its current ownership and id.
  update public.properties p
  set name = src.name,
      address = src.address,
      phone = src.phone
  from jsonb_to_recordset(p_backup->'tables'->'properties')
    as src(id uuid, name text, address text, phone text)
  where p.id = p_target_property_id;

  -- Restore in foreign-key order. JSONB recordsets map keys to columns.
  insert into public.rooms (id, property_id, room_code, rent, status, created_at)
  select r.id, p_target_property_id, r.room_code, r.rent, r.status, coalesce(r.created_at, now())
  from jsonb_to_recordset(p_backup->'tables'->'rooms')
    as r(id uuid, property_id uuid, room_code text, rent numeric, status text, created_at timestamptz);

  insert into public.tenants (id, property_id, room_id, name, phone, email, start_date, monthly_rent, status, created_at)
  select t.id, p_target_property_id, t.room_id, t.name, t.phone, t.email, t.start_date, t.monthly_rent, t.status, coalesce(t.created_at, now())
  from jsonb_to_recordset(p_backup->'tables'->'tenants')
    as t(id uuid, property_id uuid, room_id uuid, name text, phone text, email text, start_date date, monthly_rent numeric, status text, created_at timestamptz);

  insert into public.invoices (id, property_id, tenant_id, period, amount, status, due_date, created_at)
  select i.id, p_target_property_id, i.tenant_id, i.period, i.amount, i.status, i.due_date, coalesce(i.created_at, now())
  from jsonb_to_recordset(p_backup->'tables'->'invoices')
    as i(id uuid, property_id uuid, tenant_id uuid, period date, amount numeric, status text, due_date date, created_at timestamptz);

  insert into public.payments (id, invoice_id, amount, paid_at, method, note)
  select pay.id, pay.invoice_id, pay.amount, coalesce(pay.paid_at, now()), pay.method, pay.note
  from jsonb_to_recordset(p_backup->'tables'->'payments')
    as pay(id uuid, invoice_id uuid, amount numeric, paid_at timestamptz, method text, note text);

  insert into public.expenses (id, property_id, category, description, amount, spent_at, created_at)
  select e.id, p_target_property_id, e.category, e.description, e.amount, e.spent_at, coalesce(e.created_at, now())
  from jsonb_to_recordset(p_backup->'tables'->'expenses')
    as e(id uuid, property_id uuid, category text, description text, amount numeric, spent_at date, created_at timestamptz);

  select count(*) into v_property_count from public.properties where id = p_target_property_id;

  return jsonb_build_object(
    'success', true,
    'property_id', p_target_property_id,
    'restored_at', now(),
    'property_exists', v_property_count = 1
  );
end;
$$;

revoke execute on function public.export_property_database_backup() from public, anon;
revoke execute on function public.restore_property_database_backup(jsonb, uuid) from public, anon;
grant execute on function public.export_property_database_backup() to authenticated;
grant execute on function public.restore_property_database_backup(jsonb, uuid) to authenticated;
