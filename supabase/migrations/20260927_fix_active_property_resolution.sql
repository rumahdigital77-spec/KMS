-- KOSTPRO: robust active-property resolution.
-- A user may have one or many property memberships. The active property is
-- still taken from user_accounts; when exactly one valid membership exists,
-- repair the user_accounts pointer for that same user only.
create or replace function public.get_active_user_property_id()
returns uuid
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  v_user uuid := auth.uid();
  v_property uuid;
  v_count integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  select ua.property_id into v_property
  from public.user_accounts ua
  where ua.user_id=v_user and ua.status='active'
  limit 1;

  if v_property is not null
     and exists(select 1 from public.account_properties ap where ap.user_id=v_user and ap.property_id=v_property)
     and exists(select 1 from public.properties p where p.id=v_property) then
    return v_property;
  end if;

  select count(*), min(ap.property_id) into v_count, v_property
  from public.account_properties ap
  join public.properties p on p.id=ap.property_id
  where ap.user_id=v_user;

  if v_count=1 then
    insert into public.user_accounts(user_id,email,full_name,role,status,property_id)
    select v_user,coalesce(u.email,''),coalesce(u.raw_user_meta_data->>'full_name',u.email),
           'owner','active',v_property
    from auth.users u where u.id=v_user
    on conflict(user_id) do update
      set property_id=excluded.property_id,status='active';
    return v_property;
  end if;

  raise exception 'PROPERTY_NOT_FOUND';
end;
$$;

create or replace function public.get_property_app_state()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare v_user uuid:=auth.uid(); v_property uuid; v_state jsonb;
begin
  v_property:=public.get_active_user_property_id();
  if not exists(select 1 from public.account_properties ap where ap.user_id=v_user and ap.property_id=v_property)
    then raise exception 'PROPERTY_ACCESS_DENIED'; end if;

  select state into v_state from public.property_app_state where property_id=v_property;
  if v_state is not null then return v_state; end if;

  return jsonb_build_object(
    'kostpro_settings',jsonb_build_object(
      'name',(select p.name from public.properties p where p.id=v_property),
      'address',(select p.address from public.properties p where p.id=v_property),
      'phone',(select p.phone from public.properties p where p.id=v_property),
      'ownerName',(select ua.full_name from public.user_accounts ua where ua.user_id=v_user),
      'manager',(select ua.full_name from public.user_accounts ua where ua.user_id=v_user),
      'availableRooms',(select count(*) from public.rooms r where r.property_id=v_property and r.status='available'),
      'currency','IDR','logo','','signature','','receiptPrefix','KW','receiptNext',1
    ),
    'kostpro_rooms',coalesce((select jsonb_agg(jsonb_build_object('id',r.room_code,'tenant',coalesce((select t.name from public.tenants t where t.room_id=r.id and t.status='active' limit 1),'-'),'price',r.rent,'status',r.status) order by r.room_code) from public.rooms r where r.property_id=v_property),'[]'::jsonb),
    'kostpro_tenants',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'room',coalesce((select r.room_code from public.rooms r where r.id=t.room_id),''),'phone',coalesce(t.phone,''),'startDate',coalesce(t.start_date,current_date),'rent',t.monthly_rent,'status',case when t.status='active' then 'active' else 'history' end) order by t.created_at) from public.tenants t where t.property_id=v_property),'[]'::jsonb),
    'kostpro_payments',coalesce((select jsonb_agg(jsonb_build_object('id',pay.id,'tenant',coalesce(t.name,''),'room',coalesce(r.room_code,''),'month',to_char(i.period,'FMMonth YYYY'),'amount',pay.amount,'status','paid','paidAt',pay.paid_at,'method',pay.method) order by pay.paid_at) from public.payments pay join public.invoices i on i.id=pay.invoice_id left join public.tenants t on t.id=i.tenant_id left join public.rooms r on r.id=t.room_id where i.property_id=v_property),'[]'::jsonb),
    'kostpro_transactions',coalesce((select jsonb_agg(jsonb_build_object('id','PAY-'||pay.id,'date',coalesce(pay.paid_at::date,current_date),'description','Pembayaran '||coalesce(t.name,''),'category','Pendapatan sewa','amount',pay.amount,'type','income','referenceId',pay.invoice_id) order by pay.paid_at) from public.payments pay join public.invoices i on i.id=pay.invoice_id left join public.tenants t on t.id=i.tenant_id where i.property_id=v_property),'[]'::jsonb)
  );
end;
$$;

create or replace function public.save_property_app_state(p_key text,p_value jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare v_user uuid:=auth.uid(); v_property uuid; v_state jsonb;
begin
  if p_key not in ('kostpro_settings','kostpro_rooms','kostpro_tenants','kostpro_payments','kostpro_transactions','kostpro_tenantHistory','kostpro_paymentHistory','kostpro_bookings','kostpro_cctv')
    then raise exception 'INVALID_APP_STATE_KEY'; end if;
  v_property:=public.get_active_user_property_id();
  if not exists(select 1 from public.account_properties ap where ap.user_id=v_user and ap.property_id=v_property)
    then raise exception 'PROPERTY_ACCESS_DENIED'; end if;

  insert into public.property_app_state(property_id,state,updated_at)
  values(v_property,jsonb_build_object(p_key,p_value),now())
  on conflict(property_id) do update
    set state=coalesce(public.property_app_state.state,'{}'::jsonb)||jsonb_build_object(p_key,p_value),updated_at=now()
  returning state into v_state;
  return v_state;
end;
$$;

revoke all on function public.get_active_user_property_id() from public,anon,authenticated;
grant execute on function public.get_active_user_property_id() to authenticated;
revoke all on function public.get_property_app_state() from public,anon;
grant execute on function public.get_property_app_state() to authenticated;
revoke all on function public.save_property_app_state(text,jsonb) from public,anon;
grant execute on function public.save_property_app_state(text,jsonb) to authenticated;
