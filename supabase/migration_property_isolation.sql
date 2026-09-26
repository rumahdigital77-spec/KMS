-- Property isolation: every operational table is readable/writable only through account_properties membership.
drop policy if exists rooms_owner_all on public.rooms;
create policy rooms_member_all on public.rooms
for all to authenticated
using (exists (select 1 from public.account_properties ap where ap.user_id=(select auth.uid()) and ap.property_id=rooms.property_id))
with check (exists (select 1 from public.account_properties ap where ap.user_id=(select auth.uid()) and ap.property_id=rooms.property_id));

drop policy if exists tenants_owner_all on public.tenants;
create policy tenants_member_all on public.tenants
for all to authenticated
using (exists (select 1 from public.account_properties ap where ap.user_id=(select auth.uid()) and ap.property_id=tenants.property_id))
with check (exists (select 1 from public.account_properties ap where ap.user_id=(select auth.uid()) and ap.property_id=tenants.property_id));

drop policy if exists invoices_owner_all on public.invoices;
create policy invoices_member_all on public.invoices
for all to authenticated
using (exists (select 1 from public.account_properties ap where ap.user_id=(select auth.uid()) and ap.property_id=invoices.property_id))
with check (exists (select 1 from public.account_properties ap where ap.user_id=(select auth.uid()) and ap.property_id=invoices.property_id));

drop policy if exists expenses_owner_all on public.expenses;
create policy expenses_member_all on public.expenses
for all to authenticated
using (exists (select 1 from public.account_properties ap where ap.user_id=(select auth.uid()) and ap.property_id=expenses.property_id))
with check (exists (select 1 from public.account_properties ap where ap.user_id=(select auth.uid()) and ap.property_id=expenses.property_id));

drop policy if exists payments_owner_all on public.payments;
create policy payments_member_all on public.payments
for all to authenticated
using (exists (
  select 1 from public.invoices i
  join public.account_properties ap on ap.property_id=i.property_id
  where i.id=payments.invoice_id and ap.user_id=(select auth.uid())
))
with check (exists (
  select 1 from public.invoices i
  join public.account_properties ap on ap.property_id=i.property_id
  where i.id=payments.invoice_id and ap.user_id=(select auth.uid())
));

notify pgrst, 'reload schema';
