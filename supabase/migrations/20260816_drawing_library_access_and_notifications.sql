-- Drawing library, version history, supplier access and administrator notifications.
-- Existing business data is preserved. Drawing files are never hard-deleted by application users.

create table if not exists public.erp_v2_access_members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null,
  supplier_name text,
  active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_v2_access_members_email_normalized check (email = lower(btrim(email))),
  constraint erp_v2_access_members_role check (role in ('iineer','supplier')),
  constraint erp_v2_access_members_supplier check (
    (role = 'supplier' and supplier_name is not null and btrim(supplier_name) <> '')
    or (role = 'iineer' and supplier_name is null)
  )
);

create table if not exists public.erp_v2_item_suppliers (
  item_id bigint not null references public.erp_v2_items(id) on delete cascade,
  supplier_name text not null,
  created_at timestamptz not null default now(),
  primary key (item_id, supplier_name)
);

create index if not exists idx_erp_v2_item_suppliers_supplier
  on public.erp_v2_item_suppliers(supplier_name, item_id);

create table if not exists public.erp_v2_suppliers (
  id bigint generated always as identity primary key,
  supplier_key text not null unique,
  display_name text not null,
  legal_name text,
  tax_id text,
  address text,
  bank_name text,
  bank_account text,
  template_kind text not null default 'purchase_order',
  source_file text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_v2_company_profile (
  id smallint primary key default 1 check (id = 1),
  display_name text not null,
  legal_name text,
  tax_id text,
  address text,
  phone text,
  bank_name text,
  bank_address text,
  bank_accounts text,
  swift_code text,
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_v2_notifications (
  id bigint generated always as identity primary key,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  event_type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_erp_v2_notifications_recipient
  on public.erp_v2_notifications(recipient_user_id, read_at, created_at desc);

alter table public.erp_v2_drawings
  add column if not exists file_kind text,
  add column if not exists version_no integer not null default 1,
  add column if not exists is_current boolean not null default true,
  add column if not exists replaces_drawing_id uuid references public.erp_v2_drawings(id) on delete restrict,
  add column if not exists source_modified_at timestamptz,
  add column if not exists change_note text,
  add column if not exists checksum_sha256 text;

alter table public.erp_v2_drawings
  drop constraint if exists erp_v2_drawings_file_kind_check;
alter table public.erp_v2_drawings
  add constraint erp_v2_drawings_file_kind_check
  check (file_kind is null or file_kind in ('PDF','DWG','STP','PNG','JPG','OTHER'));

create unique index if not exists uq_erp_v2_catalog_drawing_version
  on public.erp_v2_drawings(catalog_item_id, file_kind, version_no)
  where catalog_item_id is not null and file_kind is not null;

create unique index if not exists uq_erp_v2_catalog_drawing_current
  on public.erp_v2_drawings(catalog_item_id, file_kind)
  where catalog_item_id is not null and file_kind is not null and is_current;

create unique index if not exists uq_erp_v2_catalog_drawing_checksum
  on public.erp_v2_drawings(catalog_item_id, file_kind, checksum_sha256)
  where catalog_item_id is not null and file_kind is not null and checksum_sha256 is not null;

create index if not exists idx_erp_v2_drawings_catalog_current
  on public.erp_v2_drawings(catalog_item_id, is_current, file_kind, version_no desc);

create or replace function public.is_erp_v2_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users au where au.user_id = auth.uid()
  );
$$;

create or replace function public.erp_v2_my_drawing_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_erp_v2_admin() then 'owner'
    else coalesce((
      select am.role
      from public.erp_v2_access_members am
      where am.email = lower(coalesce(auth.jwt() ->> 'email', ''))
        and am.active
      limit 1
    ), 'none')
  end;
$$;

create or replace function public.erp_v2_can_edit_catalog_drawings()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_erp_v2_admin()
    or exists (
      select 1
      from public.erp_v2_access_members am
      where am.email = lower(coalesce(auth.jwt() ->> 'email', ''))
        and am.role = 'iineer'
        and am.active
    );
$$;

create or replace function public.erp_v2_can_view_catalog_item(p_item_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.erp_v2_can_edit_catalog_drawings()
    or exists (
      select 1
      from public.erp_v2_access_members am
      join public.erp_v2_item_suppliers map
        on map.supplier_name = am.supplier_name
      where am.email = lower(coalesce(auth.jwt() ->> 'email', ''))
        and am.role = 'supplier'
        and am.active
        and map.item_id = p_item_id
    );
$$;

create or replace function public.erp_v2_can_view_storage_object(p_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.erp_v2_drawings d
    where d.storage_path = p_storage_path
      and (
        (d.catalog_item_id is not null and public.erp_v2_can_view_catalog_item(d.catalog_item_id))
        or d.uploaded_by = auth.uid()
        or public.is_erp_v2_admin()
        or public.erp_v2_my_drawing_role() = 'iineer'
        or exists (
          select 1 from public.erp_v2_orders o
          where o.id = d.order_id and o.user_id = auth.uid()
        )
      )
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
  v_row public.erp_v2_drawings;
begin
  if not public.erp_v2_can_edit_catalog_drawings() then
    raise exception 'Catalog drawing edit permission is required.' using errcode = '42501';
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
    if found then
      return v_row;
    end if;
  end if;

  select d.id
    into v_previous_id
  from public.erp_v2_drawings d
  where d.catalog_item_id = p_catalog_item_id
    and d.file_kind = p_file_kind
    and d.is_current
  order by d.version_no desc, d.created_at desc
  limit 1
  for update;

  select coalesce(max(d.version_no), 0) + 1
    into v_version
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
    auth.uid(), p_file_kind, v_version, true, v_previous_id,
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

create or replace function public.erp_v2_sync_item_supplier()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.supplier_name is not null and btrim(new.supplier_name) <> '' then
    insert into public.erp_v2_item_suppliers(item_id, supplier_name)
    select i.id, new.supplier_name
    from public.erp_v2_items i
    where i.normalized_key = new.normalized_part_name
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_erp_v2_sync_item_supplier on public.erp_v2_transactions;
create trigger trg_erp_v2_sync_item_supplier
after insert or update of supplier_name, normalized_part_name
on public.erp_v2_transactions
for each row execute function public.erp_v2_sync_item_supplier();

create or replace function public.erp_v2_notify_drawing_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_email text := lower(coalesce(auth.jwt() ->> 'email', 'unknown'));
  v_item_name text;
  v_title text;
  v_body text;
begin
  if public.is_erp_v2_admin() then
    return new;
  end if;

  if new.catalog_item_id is not null then
    if public.erp_v2_my_drawing_role() <> 'iineer' then
      return new;
    end if;
    select i.item_name into v_item_name from public.erp_v2_items i where i.id = new.catalog_item_id;
    v_title := 'IINEER 도면 새 버전';
    v_body := coalesce(v_item_name, '품목') || ' · ' || new.file_name || ' · v' || new.version_no::text;
  else
    v_title := '오더 도면 업로드';
    v_body := new.file_name;
  end if;

  insert into public.erp_v2_notifications (
    recipient_user_id, actor_user_id, actor_email, event_type,
    title, body, entity_type, entity_id
  )
  select au.user_id, auth.uid(), v_actor_email, 'drawing_changed',
         v_title, v_body, 'drawing', new.id::text
  from public.admin_users au;

  return new;
end;
$$;

create or replace function public.erp_v2_notify_order_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_email text := lower(coalesce(auth.jwt() ->> 'email', new.contact_email, 'unknown'));
  v_title text;
  v_body text;
begin
  if public.is_erp_v2_admin() then
    return new;
  end if;

  v_title := case when tg_op = 'INSERT' then '새 오더 접수' else '오더 수정' end;
  v_body := new.order_number || ' · ' || new.company_name || ' · ' || new.status;

  insert into public.erp_v2_notifications (
    recipient_user_id, actor_user_id, actor_email, event_type,
    title, body, entity_type, entity_id
  )
  select au.user_id, auth.uid(), v_actor_email,
         case when tg_op = 'INSERT' then 'order_created' else 'order_updated' end,
         v_title, v_body, 'order', new.id::text
  from public.admin_users au;

  return new;
end;
$$;

drop trigger if exists trg_erp_v2_notify_drawing_change on public.erp_v2_drawings;
create trigger trg_erp_v2_notify_drawing_change
after insert on public.erp_v2_drawings
for each row execute function public.erp_v2_notify_drawing_change();

drop trigger if exists trg_erp_v2_notify_order_change on public.erp_v2_orders;
create trigger trg_erp_v2_notify_order_change
after insert or update on public.erp_v2_orders
for each row execute function public.erp_v2_notify_order_change();

alter table public.erp_v2_access_members enable row level security;
alter table public.erp_v2_item_suppliers enable row level security;
alter table public.erp_v2_suppliers enable row level security;
alter table public.erp_v2_company_profile enable row level security;
alter table public.erp_v2_notifications enable row level security;

drop policy if exists erp_v2_access_members_admin on public.erp_v2_access_members;
create policy erp_v2_access_members_admin on public.erp_v2_access_members
for all to authenticated
using (public.is_erp_v2_admin())
with check (public.is_erp_v2_admin());

drop policy if exists erp_v2_item_suppliers_admin on public.erp_v2_item_suppliers;
create policy erp_v2_item_suppliers_admin on public.erp_v2_item_suppliers
for all to authenticated
using (public.is_erp_v2_admin())
with check (public.is_erp_v2_admin());

drop policy if exists erp_v2_suppliers_admin on public.erp_v2_suppliers;
create policy erp_v2_suppliers_admin on public.erp_v2_suppliers
for all to authenticated
using (public.is_erp_v2_admin())
with check (public.is_erp_v2_admin());

drop policy if exists erp_v2_company_profile_admin on public.erp_v2_company_profile;
create policy erp_v2_company_profile_admin on public.erp_v2_company_profile
for all to authenticated
using (public.is_erp_v2_admin())
with check (public.is_erp_v2_admin());

drop policy if exists erp_v2_notifications_select on public.erp_v2_notifications;
create policy erp_v2_notifications_select on public.erp_v2_notifications
for select to authenticated
using (recipient_user_id = auth.uid() and public.is_erp_v2_admin());

drop policy if exists erp_v2_notifications_update on public.erp_v2_notifications;
create policy erp_v2_notifications_update on public.erp_v2_notifications
for update to authenticated
using (recipient_user_id = auth.uid() and public.is_erp_v2_admin())
with check (recipient_user_id = auth.uid() and public.is_erp_v2_admin());

drop policy if exists erp_v2_items_admin on public.erp_v2_items;
drop policy if exists erp_v2_items_access_read on public.erp_v2_items;
drop policy if exists erp_v2_items_select on public.erp_v2_items;
create policy erp_v2_items_select on public.erp_v2_items
for select to authenticated
using (public.erp_v2_can_view_catalog_item(id));

drop policy if exists erp_v2_items_insert on public.erp_v2_items;
create policy erp_v2_items_insert on public.erp_v2_items
for insert to authenticated with check (public.is_erp_v2_admin());
drop policy if exists erp_v2_items_update on public.erp_v2_items;
create policy erp_v2_items_update on public.erp_v2_items
for update to authenticated
using (public.is_erp_v2_admin()) with check (public.is_erp_v2_admin());
drop policy if exists erp_v2_items_delete on public.erp_v2_items;
create policy erp_v2_items_delete on public.erp_v2_items
for delete to authenticated using (public.is_erp_v2_admin());

drop policy if exists erp_v2_drawings_select on public.erp_v2_drawings;
create policy erp_v2_drawings_select on public.erp_v2_drawings
for select to authenticated
using (
  (catalog_item_id is not null and public.erp_v2_can_view_catalog_item(catalog_item_id))
  or uploaded_by = auth.uid()
  or public.is_erp_v2_admin()
  or public.erp_v2_my_drawing_role() = 'iineer'
  or exists (
    select 1 from public.erp_v2_orders o
    where o.id = order_id and o.user_id = auth.uid()
  )
);

drop policy if exists erp_v2_drawings_insert on public.erp_v2_drawings;
create policy erp_v2_drawings_insert on public.erp_v2_drawings
for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and order_id is not null
  and catalog_item_id is null
  and exists (
    select 1 from public.erp_v2_orders o
    where o.id = order_id
      and o.user_id = auth.uid()
      and o.status in ('draft','quote_requested')
  )
);

drop policy if exists erp_v2_drawings_delete on public.erp_v2_drawings;
drop policy if exists erp_v2_drawings_update on public.erp_v2_drawings;

drop policy if exists erp_v2_storage_read on storage.objects;
create policy erp_v2_storage_read on storage.objects
for select to authenticated
using (
  bucket_id = 'erp-v2-drawings'
  and public.erp_v2_can_view_storage_object(name)
);

drop policy if exists erp_v2_storage_insert on storage.objects;
create policy erp_v2_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'erp-v2-drawings'
  and (
    (
      (storage.foldername(name))[1] = 'catalog'
      and public.erp_v2_can_edit_catalog_drawings()
      and exists (
        select 1 from public.erp_v2_items i
        where i.id::text = (storage.foldername(name))[2]
      )
    )
    or (
      (storage.foldername(name))[1] = auth.uid()::text
      and exists (
        select 1 from public.erp_v2_orders o
        where o.id::text = (storage.foldername(name))[2]
          and o.user_id = auth.uid()
          and o.status in ('draft','quote_requested')
      )
    )
  )
);

drop policy if exists erp_v2_storage_delete on storage.objects;
drop policy if exists erp_v2_storage_update on storage.objects;

grant select, insert, update, delete on public.erp_v2_access_members,
  public.erp_v2_item_suppliers, public.erp_v2_suppliers,
  public.erp_v2_company_profile to authenticated;
grant select, update on public.erp_v2_notifications to authenticated;
grant usage, select on sequence public.erp_v2_suppliers_id_seq,
  public.erp_v2_notifications_id_seq to authenticated;

revoke all on public.erp_v2_access_members, public.erp_v2_item_suppliers,
  public.erp_v2_suppliers, public.erp_v2_company_profile,
  public.erp_v2_notifications from anon;
revoke all on sequence public.erp_v2_suppliers_id_seq,
  public.erp_v2_notifications_id_seq from anon;

revoke all on function public.erp_v2_my_drawing_role() from public, anon;
revoke all on function public.erp_v2_can_edit_catalog_drawings() from public, anon;
revoke all on function public.erp_v2_can_view_catalog_item(bigint) from public, anon;
revoke all on function public.erp_v2_can_view_storage_object(text) from public, anon;
revoke all on function public.erp_v2_register_catalog_drawing(bigint,text,text,text,text,bigint,timestamptz,text,text) from public, anon;
revoke all on function public.erp_v2_sync_item_supplier() from public, anon, authenticated;
revoke all on function public.erp_v2_notify_drawing_change() from public, anon, authenticated;
revoke all on function public.erp_v2_notify_order_change() from public, anon, authenticated;

grant execute on function public.erp_v2_my_drawing_role() to authenticated;
grant execute on function public.erp_v2_can_edit_catalog_drawings() to authenticated;
grant execute on function public.erp_v2_can_view_catalog_item(bigint) to authenticated;
grant execute on function public.erp_v2_can_view_storage_object(text) to authenticated;
grant execute on function public.erp_v2_register_catalog_drawing(bigint,text,text,text,text,bigint,timestamptz,text,text) to authenticated;
