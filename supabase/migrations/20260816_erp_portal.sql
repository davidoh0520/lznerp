-- LZN ERP V2 isolated schema. Existing storefront and legacy ERP tables are untouched.

create sequence if not exists public.erp_v2_order_no_seq;
create sequence if not exists public.erp_v2_invoice_no_seq;

create or replace function public.is_erp_v2_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

grant execute on function public.is_erp_v2_admin() to authenticated;

create table if not exists public.erp_v2_items (
  id bigint generated always as identity primary key,
  item_code text not null unique,
  normalized_key text not null unique,
  item_name text not null,
  product text not null default '제품확인필요',
  process_type text not null default '기타',
  material text,
  unit text not null default 'EA',
  latest_purchase_unit numeric(18,4),
  latest_sale_unit numeric(18,4),
  drawing_status text not null default '미매칭',
  drawing_formats text,
  drawing_path text,
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (product in ('INE-200','INT-200','INB-200','INA-200','제품확인필요')),
  check (process_type in ('MCT','CNC','GLASS','기어류','기타'))
);

create table if not exists public.erp_v2_transactions (
  id bigint generated always as identity primary key,
  transaction_code text not null unique,
  source_sheet text,
  source_row integer,
  supplier_name text,
  transaction_date date,
  order_no text,
  part_name text not null,
  normalized_part_name text not null,
  product text not null default '제품확인필요',
  process_type text not null default '기타',
  material text,
  purchase_status text not null,
  purchase_unit_ex numeric(18,4),
  purchase_qty numeric(18,4),
  purchase_amount_ex numeric(18,2),
  purchase_amount_inc numeric(18,2),
  sale_rule text,
  sale_unit_ex numeric(18,4),
  sale_qty numeric(18,4),
  sale_amount_ex numeric(18,2),
  sale_amount_inc numeric(18,2),
  gross_profit_ex numeric(18,2),
  drawing_match text,
  drawing_formats text,
  drawing_path text,
  note text,
  imported_at timestamptz not null default now(),
  check (product in ('INE-200','INT-200','INB-200','INA-200','제품확인필요')),
  check (process_type in ('MCT','CNC','GLASS','기어류','기타'))
);

create index if not exists idx_erp_v2_transactions_date on public.erp_v2_transactions(transaction_date desc);
create index if not exists idx_erp_v2_transactions_part on public.erp_v2_transactions(normalized_part_name);
create index if not exists idx_erp_v2_transactions_product on public.erp_v2_transactions(product);

create table if not exists public.erp_v2_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  company_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  country text not null default 'South Korea',
  shipping_address text,
  currency text not null default 'USD',
  status text not null default 'quote_requested',
  customer_po_number text,
  notes text,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('draft','quote_requested','quoted','confirmed','processing','shipped','completed','cancelled')),
  check (currency in ('USD','CNY','KRW'))
);

create table if not exists public.erp_v2_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.erp_v2_orders(id) on delete cascade,
  catalog_item_id bigint references public.erp_v2_items(id) on delete set null,
  part_name text not null,
  product text,
  process_type text,
  material text,
  quantity numeric(18,4) not null default 1 check (quantity > 0),
  unit text not null default 'EA',
  quoted_unit_price numeric(18,4),
  need_by date,
  specification text,
  created_at timestamptz not null default now()
);

create table if not exists public.erp_v2_drawings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.erp_v2_orders(id) on delete cascade,
  order_item_id uuid references public.erp_v2_order_items(id) on delete cascade,
  catalog_item_id bigint references public.erp_v2_items(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint,
  uploaded_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  check (order_id is not null or catalog_item_id is not null)
);

create table if not exists public.erp_v2_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  order_id uuid references public.erp_v2_orders(id) on delete set null,
  issue_date date not null default current_date,
  due_date date,
  currency text not null default 'USD',
  subtotal numeric(18,2) not null default 0,
  freight numeric(18,2) not null default 0,
  discount numeric(18,2) not null default 0,
  tax numeric(18,2) not null default 0,
  total numeric(18,2) generated always as (subtotal + freight + tax - discount) stored,
  status text not null default 'draft',
  buyer_name text,
  buyer_email text,
  buyer_address text,
  incoterms text,
  payment_terms text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('draft','issued','sent','partial','paid','void')),
  check (currency in ('USD','CNY','KRW','EUR'))
);

create table if not exists public.erp_v2_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.erp_v2_invoices(id) on delete cascade,
  catalog_item_id bigint references public.erp_v2_items(id) on delete set null,
  description text not null,
  quantity numeric(18,4) not null default 1,
  unit text not null default 'EA',
  unit_price numeric(18,4) not null default 0,
  amount numeric(18,2) generated always as (round(quantity * unit_price, 2)) stored,
  hs_code text,
  origin_country text default 'China',
  sequence integer not null default 1
);

create or replace function public.next_erp_v2_order_number()
returns text language sql volatile set search_path = public as $$
  select 'KO-' || to_char(current_date, 'YYYYMM') || '-' || lpad(nextval('public.erp_v2_order_no_seq')::text, 5, '0');
$$;

create or replace function public.next_erp_v2_invoice_number()
returns text language sql volatile set search_path = public as $$
  select 'INV-' || to_char(current_date, 'YYYYMM') || '-' || lpad(nextval('public.erp_v2_invoice_no_seq')::text, 5, '0');
$$;

create or replace function public.erp_v2_set_number()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'erp_v2_orders' and coalesce(new.order_number, '') = '' then
    new.order_number := public.next_erp_v2_order_number();
  elsif tg_table_name = 'erp_v2_invoices' and coalesce(new.invoice_number, '') = '' then
    new.invoice_number := public.next_erp_v2_invoice_number();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_erp_v2_order_number on public.erp_v2_orders;
create trigger trg_erp_v2_order_number before insert on public.erp_v2_orders
for each row execute function public.erp_v2_set_number();
drop trigger if exists trg_erp_v2_invoice_number on public.erp_v2_invoices;
create trigger trg_erp_v2_invoice_number before insert on public.erp_v2_invoices
for each row execute function public.erp_v2_set_number();

create or replace function public.erp_v2_auto_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare new_invoice_id uuid; calc_subtotal numeric(18,2);
begin
  if new.status = 'confirmed' and old.status is distinct from new.status
     and not exists (select 1 from public.erp_v2_invoices where order_id = new.id) then
    select coalesce(round(sum(quantity * coalesce(quoted_unit_price, 0)), 2), 0)
      into calc_subtotal from public.erp_v2_order_items where order_id = new.id;
    insert into public.erp_v2_invoices (
      invoice_number, order_id, currency, subtotal, buyer_name, buyer_email,
      buyer_address, status, created_by
    ) values (
      public.next_erp_v2_invoice_number(), new.id, new.currency, calc_subtotal,
      new.company_name, new.contact_email, new.shipping_address, 'draft', auth.uid()
    ) returning id into new_invoice_id;
    insert into public.erp_v2_invoice_items (
      invoice_id, catalog_item_id, description, quantity, unit, unit_price, sequence
    ) select new_invoice_id, catalog_item_id, part_name, quantity, unit,
             coalesce(quoted_unit_price, 0), row_number() over (order by created_at, id)
        from public.erp_v2_order_items where order_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_erp_v2_auto_invoice on public.erp_v2_orders;
create trigger trg_erp_v2_auto_invoice after update of status on public.erp_v2_orders
for each row execute function public.erp_v2_auto_invoice();

alter table public.erp_v2_items enable row level security;
alter table public.erp_v2_transactions enable row level security;
alter table public.erp_v2_orders enable row level security;
alter table public.erp_v2_order_items enable row level security;
alter table public.erp_v2_drawings enable row level security;
alter table public.erp_v2_invoices enable row level security;
alter table public.erp_v2_invoice_items enable row level security;

create policy erp_v2_items_admin on public.erp_v2_items for all to authenticated
using (public.is_erp_v2_admin()) with check (public.is_erp_v2_admin());
create policy erp_v2_transactions_admin on public.erp_v2_transactions for all to authenticated
using (public.is_erp_v2_admin()) with check (public.is_erp_v2_admin());

create policy erp_v2_orders_select on public.erp_v2_orders for select to authenticated
using (user_id = auth.uid() or public.is_erp_v2_admin());
create policy erp_v2_orders_insert on public.erp_v2_orders for insert to authenticated
with check (user_id = auth.uid() and status in ('draft','quote_requested'));
create policy erp_v2_orders_update on public.erp_v2_orders for update to authenticated
using ((user_id = auth.uid() and status in ('draft','quote_requested')) or public.is_erp_v2_admin())
with check ((user_id = auth.uid() and status in ('draft','quote_requested')) or public.is_erp_v2_admin());
create policy erp_v2_orders_admin_delete on public.erp_v2_orders for delete to authenticated
using (public.is_erp_v2_admin());

create policy erp_v2_order_items_select on public.erp_v2_order_items for select to authenticated
using (exists (select 1 from public.erp_v2_orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_erp_v2_admin())));
create policy erp_v2_order_items_insert on public.erp_v2_order_items for insert to authenticated
with check (exists (select 1 from public.erp_v2_orders o where o.id = order_id and ((o.user_id = auth.uid() and o.status in ('draft','quote_requested')) or public.is_erp_v2_admin())));
create policy erp_v2_order_items_update on public.erp_v2_order_items for update to authenticated
using (exists (select 1 from public.erp_v2_orders o where o.id = order_id and ((o.user_id = auth.uid() and o.status in ('draft','quote_requested')) or public.is_erp_v2_admin())))
with check (exists (select 1 from public.erp_v2_orders o where o.id = order_id and ((o.user_id = auth.uid() and o.status in ('draft','quote_requested')) or public.is_erp_v2_admin())));
create policy erp_v2_order_items_delete on public.erp_v2_order_items for delete to authenticated
using (exists (select 1 from public.erp_v2_orders o where o.id = order_id and ((o.user_id = auth.uid() and o.status in ('draft','quote_requested')) or public.is_erp_v2_admin())));

create policy erp_v2_drawings_select on public.erp_v2_drawings for select to authenticated
using (uploaded_by = auth.uid() or public.is_erp_v2_admin());
create policy erp_v2_drawings_insert on public.erp_v2_drawings for insert to authenticated
with check (uploaded_by = auth.uid() and (
  (order_id is not null and exists (select 1 from public.erp_v2_orders o where o.id = order_id and o.user_id = auth.uid() and o.status in ('draft','quote_requested')))
  or (catalog_item_id is not null and public.is_erp_v2_admin())
));
create policy erp_v2_drawings_delete on public.erp_v2_drawings for delete to authenticated
using (uploaded_by = auth.uid() or public.is_erp_v2_admin());

create policy erp_v2_invoices_select on public.erp_v2_invoices for select to authenticated
using (public.is_erp_v2_admin() or exists (
  select 1 from public.erp_v2_orders o where o.id = order_id and o.user_id = auth.uid()
));
create policy erp_v2_invoices_admin_write on public.erp_v2_invoices for all to authenticated
using (public.is_erp_v2_admin()) with check (public.is_erp_v2_admin());
create policy erp_v2_invoice_items_select on public.erp_v2_invoice_items for select to authenticated
using (exists (select 1 from public.erp_v2_invoices i where i.id = invoice_id and (
  public.is_erp_v2_admin() or exists (select 1 from public.erp_v2_orders o where o.id = i.order_id and o.user_id = auth.uid())
)));
create policy erp_v2_invoice_items_admin_write on public.erp_v2_invoice_items for all to authenticated
using (public.is_erp_v2_admin()) with check (public.is_erp_v2_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'erp-v2-drawings','erp-v2-drawings',false,52428800,
  array['application/pdf','image/png','image/jpeg','application/dwg','image/vnd.dwg','image/x-dwg','application/step','application/stp','model/step','application/octet-stream']
)
on conflict (id) do nothing;

create policy erp_v2_storage_read on storage.objects for select to authenticated
using (bucket_id = 'erp-v2-drawings' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_erp_v2_admin()));
create policy erp_v2_storage_insert on storage.objects for insert to authenticated
with check (bucket_id = 'erp-v2-drawings' and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.erp_v2_orders o where o.id::text = (storage.foldername(name))[2] and o.user_id = auth.uid() and o.status in ('draft','quote_requested')));
create policy erp_v2_storage_delete on storage.objects for delete to authenticated
using (bucket_id = 'erp-v2-drawings' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_erp_v2_admin()));

grant select, insert, update, delete on public.erp_v2_items, public.erp_v2_transactions,
  public.erp_v2_orders, public.erp_v2_order_items, public.erp_v2_drawings,
  public.erp_v2_invoices, public.erp_v2_invoice_items to authenticated;
grant usage, select on sequence public.erp_v2_order_no_seq, public.erp_v2_invoice_no_seq to authenticated;
