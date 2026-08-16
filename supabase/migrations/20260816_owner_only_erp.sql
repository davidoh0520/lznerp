-- LZN ERP V2 is a single-owner private workspace.
-- Other Supabase users remain untouched because the project may serve legacy sites.

create or replace function public.erp_v2_my_drawing_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.is_erp_v2_admin() then 'owner' else 'none' end;
$$;

create or replace function public.erp_v2_can_edit_catalog_drawings()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_erp_v2_admin();
$$;

create or replace function public.erp_v2_can_view_catalog_item(p_item_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_erp_v2_admin();
$$;

create or replace function public.erp_v2_can_view_storage_object(p_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_erp_v2_admin()
    and exists (
      select 1
      from public.erp_v2_drawings d
      where d.storage_path = p_storage_path
    );
$$;

create or replace function public.erp_v2_register_catalog_drawing(
  p_catalog_item_id bigint,
  p_file_name text,
  p_storage_path text,
  p_file_kind text,
  p_mime_type text,
  p_file_size bigint,
  p_source_modified_at timestamptz default null,
  p_change_note text default null,
  p_checksum_sha256 text default null
)
returns public.erp_v2_drawings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_id uuid;
  v_version integer;
  v_uploader uuid;
  v_row public.erp_v2_drawings;
begin
  if not public.is_erp_v2_admin() then
    raise exception 'Owner permission is required.' using errcode = '42501';
  end if;

  v_uploader := auth.uid();
  if v_uploader is null then
    raise exception 'Authenticated owner is required.' using errcode = '42501';
  end if;

  if p_file_kind not in ('PDF','DWG','STP','PNG','JPG','OTHER') then
    raise exception 'Unsupported drawing file kind.' using errcode = '22023';
  end if;

  perform 1 from public.erp_v2_items i where i.id = p_catalog_item_id for update;
  if not found then
    raise exception 'Catalog item not found.' using errcode = 'P0002';
  end if;

  if nullif(btrim(p_checksum_sha256), '') is not null then
    select d.* into v_row
    from public.erp_v2_drawings d
    where d.catalog_item_id = p_catalog_item_id
      and d.file_kind = p_file_kind
      and d.checksum_sha256 = lower(btrim(p_checksum_sha256))
    order by d.version_no desc
    limit 1;
    if found then return v_row; end if;
  end if;

  select d.id into v_previous_id
  from public.erp_v2_drawings d
  where d.catalog_item_id = p_catalog_item_id
    and d.file_kind = p_file_kind
    and d.is_current
  order by d.version_no desc, d.created_at desc
  limit 1
  for update;

  select coalesce(max(d.version_no), 0) + 1 into v_version
  from public.erp_v2_drawings d
  where d.catalog_item_id = p_catalog_item_id
    and d.file_kind = p_file_kind;

  update public.erp_v2_drawings
     set is_current = false
   where catalog_item_id = p_catalog_item_id
     and file_kind = p_file_kind
     and is_current;

  insert into public.erp_v2_drawings (
    catalog_item_id, file_name, storage_path, mime_type, file_size,
    uploaded_by, file_kind, version_no, is_current, replaces_drawing_id,
    source_modified_at, change_note, checksum_sha256
  ) values (
    p_catalog_item_id, p_file_name, p_storage_path, p_mime_type, p_file_size,
    v_uploader, p_file_kind, v_version, true, v_previous_id,
    p_source_modified_at, nullif(btrim(p_change_note), ''), lower(nullif(btrim(p_checksum_sha256), ''))
  ) returning * into v_row;

  update public.erp_v2_items i
     set drawing_status = '매칭',
         drawing_formats = (
           select string_agg(x.file_kind, ', ' order by x.file_kind)
           from public.erp_v2_drawings x
           where x.catalog_item_id = p_catalog_item_id and x.is_current
         ),
         updated_at = now()
   where i.id = p_catalog_item_id;

  return v_row;
end;
$$;

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename like 'erp_v2_%'
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end
$$;

alter table public.erp_v2_items enable row level security;
alter table public.erp_v2_transactions enable row level security;
alter table public.erp_v2_orders enable row level security;
alter table public.erp_v2_order_items enable row level security;
alter table public.erp_v2_drawings enable row level security;
alter table public.erp_v2_invoices enable row level security;
alter table public.erp_v2_invoice_items enable row level security;
alter table public.erp_v2_access_members enable row level security;
alter table public.erp_v2_item_suppliers enable row level security;
alter table public.erp_v2_suppliers enable row level security;
alter table public.erp_v2_company_profile enable row level security;
alter table public.erp_v2_notifications enable row level security;

create policy erp_v2_items_owner on public.erp_v2_items for all to authenticated
  using ((select public.is_erp_v2_admin())) with check ((select public.is_erp_v2_admin()));
create policy erp_v2_transactions_owner on public.erp_v2_transactions for all to authenticated
  using ((select public.is_erp_v2_admin())) with check ((select public.is_erp_v2_admin()));
create policy erp_v2_orders_owner on public.erp_v2_orders for all to authenticated
  using ((select public.is_erp_v2_admin())) with check ((select public.is_erp_v2_admin()));
create policy erp_v2_order_items_owner on public.erp_v2_order_items for all to authenticated
  using ((select public.is_erp_v2_admin())) with check ((select public.is_erp_v2_admin()));
create policy erp_v2_invoices_owner on public.erp_v2_invoices for all to authenticated
  using ((select public.is_erp_v2_admin())) with check ((select public.is_erp_v2_admin()));
create policy erp_v2_invoice_items_owner on public.erp_v2_invoice_items for all to authenticated
  using ((select public.is_erp_v2_admin())) with check ((select public.is_erp_v2_admin()));
create policy erp_v2_access_members_owner on public.erp_v2_access_members for all to authenticated
  using ((select public.is_erp_v2_admin())) with check ((select public.is_erp_v2_admin()));
create policy erp_v2_item_suppliers_owner on public.erp_v2_item_suppliers for all to authenticated
  using ((select public.is_erp_v2_admin())) with check ((select public.is_erp_v2_admin()));
create policy erp_v2_suppliers_owner on public.erp_v2_suppliers for all to authenticated
  using ((select public.is_erp_v2_admin())) with check ((select public.is_erp_v2_admin()));
create policy erp_v2_company_profile_owner on public.erp_v2_company_profile for all to authenticated
  using ((select public.is_erp_v2_admin())) with check ((select public.is_erp_v2_admin()));
create policy erp_v2_notifications_owner on public.erp_v2_notifications for all to authenticated
  using ((select public.is_erp_v2_admin())) with check ((select public.is_erp_v2_admin()));

-- Drawing rows may be read, added, and versioned, but not deleted.
create policy erp_v2_drawings_owner_select on public.erp_v2_drawings for select to authenticated
  using ((select public.is_erp_v2_admin()));
create policy erp_v2_drawings_owner_insert on public.erp_v2_drawings for insert to authenticated
  with check ((select public.is_erp_v2_admin()));
create policy erp_v2_drawings_owner_update on public.erp_v2_drawings for update to authenticated
  using ((select public.is_erp_v2_admin())) with check ((select public.is_erp_v2_admin()));

drop policy if exists erp_v2_storage_read on storage.objects;
drop policy if exists erp_v2_storage_insert on storage.objects;
drop policy if exists erp_v2_storage_update on storage.objects;
drop policy if exists erp_v2_storage_delete on storage.objects;

create policy erp_v2_storage_read on storage.objects for select to authenticated
  using (bucket_id = 'erp-v2-drawings' and public.erp_v2_can_view_storage_object(name));
create policy erp_v2_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'erp-v2-drawings' and (select public.is_erp_v2_admin()));

revoke all on function public.erp_v2_my_drawing_role() from public, anon;
revoke all on function public.erp_v2_can_edit_catalog_drawings() from public, anon;
revoke all on function public.erp_v2_can_view_catalog_item(bigint) from public, anon;
revoke all on function public.erp_v2_can_view_storage_object(text) from public, anon;
revoke all on function public.erp_v2_register_catalog_drawing(bigint,text,text,text,text,bigint,timestamptz,text,text) from public, anon;

grant execute on function public.erp_v2_my_drawing_role() to authenticated;
grant execute on function public.erp_v2_can_edit_catalog_drawings() to authenticated;
grant execute on function public.erp_v2_can_view_catalog_item(bigint) to authenticated;
grant execute on function public.erp_v2_can_view_storage_object(text) to authenticated;
grant execute on function public.erp_v2_register_catalog_drawing(bigint,text,text,text,text,bigint,timestamptz,text,text) to authenticated;
