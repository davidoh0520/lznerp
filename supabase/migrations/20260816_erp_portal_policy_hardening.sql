-- Restrict customer mutations to their own pre-quote orders.
drop policy if exists erp_v2_orders_insert on public.erp_v2_orders;
create policy erp_v2_orders_insert on public.erp_v2_orders for insert to authenticated
with check (user_id = auth.uid() and status in ('draft','quote_requested'));

drop policy if exists erp_v2_orders_update on public.erp_v2_orders;
create policy erp_v2_orders_update on public.erp_v2_orders for update to authenticated
using ((user_id = auth.uid() and status in ('draft','quote_requested')) or public.is_erp_v2_admin())
with check ((user_id = auth.uid() and status in ('draft','quote_requested')) or public.is_erp_v2_admin());

drop policy if exists erp_v2_order_items_insert on public.erp_v2_order_items;
create policy erp_v2_order_items_insert on public.erp_v2_order_items for insert to authenticated
with check (exists (select 1 from public.erp_v2_orders o where o.id = order_id and ((o.user_id = auth.uid() and o.status in ('draft','quote_requested')) or public.is_erp_v2_admin())));

drop policy if exists erp_v2_order_items_update on public.erp_v2_order_items;
create policy erp_v2_order_items_update on public.erp_v2_order_items for update to authenticated
using (exists (select 1 from public.erp_v2_orders o where o.id = order_id and ((o.user_id = auth.uid() and o.status in ('draft','quote_requested')) or public.is_erp_v2_admin())))
with check (exists (select 1 from public.erp_v2_orders o where o.id = order_id and ((o.user_id = auth.uid() and o.status in ('draft','quote_requested')) or public.is_erp_v2_admin())));

drop policy if exists erp_v2_order_items_delete on public.erp_v2_order_items;
create policy erp_v2_order_items_delete on public.erp_v2_order_items for delete to authenticated
using (exists (select 1 from public.erp_v2_orders o where o.id = order_id and ((o.user_id = auth.uid() and o.status in ('draft','quote_requested')) or public.is_erp_v2_admin())));

drop policy if exists erp_v2_drawings_insert on public.erp_v2_drawings;
create policy erp_v2_drawings_insert on public.erp_v2_drawings for insert to authenticated
with check (uploaded_by = auth.uid() and (
  (order_id is not null and exists (select 1 from public.erp_v2_orders o where o.id = order_id and o.user_id = auth.uid() and o.status in ('draft','quote_requested')))
  or (catalog_item_id is not null and public.is_erp_v2_admin())
));

drop policy if exists erp_v2_storage_insert on storage.objects;
create policy erp_v2_storage_insert on storage.objects for insert to authenticated
with check (bucket_id = 'erp-v2-drawings' and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.erp_v2_orders o where o.id::text = (storage.foldername(name))[2] and o.user_id = auth.uid() and o.status in ('draft','quote_requested')));
