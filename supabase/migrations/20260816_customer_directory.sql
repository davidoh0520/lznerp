-- Private customer directory. Customer data is inserted directly in Supabase,
-- not committed to the public web repository.

create table if not exists public.erp_v2_customers (
  customer_key text primary key,
  display_name text not null,
  address text,
  phone text,
  fax text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.erp_v2_customers enable row level security;

drop policy if exists erp_v2_customers_owner_select on public.erp_v2_customers;
drop policy if exists erp_v2_customers_owner_insert on public.erp_v2_customers;
drop policy if exists erp_v2_customers_owner_update on public.erp_v2_customers;

create policy erp_v2_customers_owner_select
  on public.erp_v2_customers for select to authenticated
  using ((select public.is_erp_v2_admin()));

create policy erp_v2_customers_owner_insert
  on public.erp_v2_customers for insert to authenticated
  with check ((select public.is_erp_v2_admin()));

create policy erp_v2_customers_owner_update
  on public.erp_v2_customers for update to authenticated
  using ((select public.is_erp_v2_admin()))
  with check ((select public.is_erp_v2_admin()));

revoke all on public.erp_v2_customers from anon;
grant select, insert, update on public.erp_v2_customers to authenticated;
