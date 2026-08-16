-- LZN owner-only order-to-cash workflow.
-- Preserves the existing ledger and adds explicit quote, purchase, contract,
-- payment, and shipment-invoice relationships.

alter table public.erp_v2_orders
  add column if not exists customer_key text not null default 'iineer'
    references public.erp_v2_customers(customer_key),
  add column if not exists workflow_stage text not null default 'order_received'
    check (workflow_stage in (
      'order_received', 'drawing_received', 'supplier_quote_requested',
      'supplier_quote_received', 'customer_approval_pending',
      'customer_approved', 'purchase_ordered', 'contract_sent',
      'payment_pending', 'payment_received', 'production',
      'shipment_invoice', 'shipped', 'completed', 'cancelled'
    )),
  add column if not exists drawing_received_at timestamptz,
  add column if not exists supplier_quote_requested_at timestamptz,
  add column if not exists supplier_quote_received_at timestamptz,
  add column if not exists customer_price_confirmed_at timestamptz,
  add column if not exists purchase_ordered_at timestamptz,
  add column if not exists contract_sent_at timestamptz,
  add column if not exists payment_received_at timestamptz,
  add column if not exists shipment_invoiced_at timestamptz;

alter table public.erp_v2_invoices
  add column if not exists customer_key text not null default 'iineer'
    references public.erp_v2_customers(customer_key),
  add column if not exists shipment_date date,
  add column if not exists tracking_no text;

alter table public.erp_v2_invoice_items
  add column if not exists order_item_id uuid
    references public.erp_v2_order_items(id) on delete set null,
  add column if not exists shipment_note text;

create table if not exists public.erp_v2_customer_contacts (
  id bigint generated always as identity primary key,
  customer_key text not null references public.erp_v2_customers(customer_key),
  contact_name text not null,
  email text not null check (email = lower(btrim(email))),
  role_title text,
  is_primary boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists erp_v2_customer_contacts_customer_email_uidx
  on public.erp_v2_customer_contacts (customer_key, lower(email));
create unique index if not exists erp_v2_customer_contacts_primary_uidx
  on public.erp_v2_customer_contacts (customer_key)
  where is_primary and active;

create table if not exists public.erp_v2_supplier_quotes (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.erp_v2_orders(id) on delete restrict,
  supplier_id bigint not null references public.erp_v2_suppliers(id) on delete restrict,
  quote_number text,
  requested_at timestamptz not null default now(),
  received_at timestamptz,
  currency text not null default 'CNY'
    check (currency in ('CNY','USD','KRW','EUR')),
  price_basis text not null default 'exclusive'
    check (price_basis in ('exclusive','inclusive')),
  tax_rate numeric(7,6) not null default 0.13
    check (tax_rate >= 0 and tax_rate <= 1),
  approval_status text not null default 'pending'
    check (approval_status in ('pending','review_requested','approved','rejected')),
  approval_requested_at timestamptz,
  approved_at timestamptz,
  approved_by_name text,
  approval_email text,
  quote_file_path text,
  notes text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_v2_supplier_quote_items (
  id bigint generated always as identity primary key,
  quote_id bigint not null references public.erp_v2_supplier_quotes(id) on delete cascade,
  order_item_id uuid references public.erp_v2_order_items(id) on delete set null,
  catalog_item_id bigint references public.erp_v2_items(id) on delete set null,
  description text not null,
  quantity numeric(18,4) not null check (quantity > 0),
  unit text not null default 'EA',
  unit_price_ex numeric(18,6) not null check (unit_price_ex >= 0),
  unit_price_inc numeric(18,6) not null check (unit_price_inc >= 0),
  amount_ex numeric(18,2) generated always as (round(quantity * unit_price_ex, 2)) stored,
  amount_inc numeric(18,2) generated always as (round(quantity * unit_price_inc, 2)) stored,
  sequence integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.erp_v2_purchase_orders (
  id bigint generated always as identity primary key,
  po_number text not null unique,
  order_id uuid not null references public.erp_v2_orders(id) on delete restrict,
  supplier_quote_id bigint references public.erp_v2_supplier_quotes(id) on delete set null,
  supplier_id bigint not null references public.erp_v2_suppliers(id) on delete restrict,
  issue_date date not null default current_date,
  status text not null default 'draft'
    check (status in ('draft','issued','acknowledged','partial','completed','cancelled')),
  currency text not null default 'CNY'
    check (currency in ('CNY','USD','KRW','EUR')),
  price_basis text not null default 'exclusive'
    check (price_basis in ('exclusive','inclusive')),
  tax_rate numeric(7,6) not null default 0.13
    check (tax_rate >= 0 and tax_rate <= 1),
  subtotal_ex numeric(18,2) not null default 0 check (subtotal_ex >= 0),
  tax_amount numeric(18,2) not null default 0 check (tax_amount >= 0),
  total_inc numeric(18,2) not null default 0 check (total_inc >= 0),
  notes text,
  issued_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_v2_purchase_order_items (
  id bigint generated always as identity primary key,
  purchase_order_id bigint not null references public.erp_v2_purchase_orders(id) on delete cascade,
  supplier_quote_item_id bigint references public.erp_v2_supplier_quote_items(id) on delete set null,
  order_item_id uuid references public.erp_v2_order_items(id) on delete set null,
  catalog_item_id bigint references public.erp_v2_items(id) on delete set null,
  description text not null,
  quantity numeric(18,4) not null check (quantity > 0),
  unit text not null default 'EA',
  unit_price_ex numeric(18,6) not null check (unit_price_ex >= 0),
  unit_price_inc numeric(18,6) not null check (unit_price_inc >= 0),
  amount_ex numeric(18,2) generated always as (round(quantity * unit_price_ex, 2)) stored,
  amount_inc numeric(18,2) generated always as (round(quantity * unit_price_inc, 2)) stored,
  sequence integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.erp_v2_contracts (
  id bigint generated always as identity primary key,
  contract_number text not null unique,
  customer_key text not null default 'iineer'
    references public.erp_v2_customers(customer_key),
  order_id uuid not null references public.erp_v2_orders(id) on delete restrict,
  issue_date date not null default current_date,
  currency text not null default 'USD'
    check (currency in ('CNY','USD','KRW','EUR')),
  status text not null default 'draft'
    check (status in ('draft','sent','partial_paid','paid','closed','void')),
  subtotal numeric(18,2) not null default 0 check (subtotal >= 0),
  freight numeric(18,2) not null default 0 check (freight >= 0),
  discount numeric(18,2) not null default 0 check (discount >= 0),
  tax numeric(18,2) not null default 0 check (tax >= 0),
  total numeric(18,2) generated always as (round(subtotal + freight + tax - discount, 2)) stored,
  payment_terms text,
  notes text,
  sent_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_v2_contract_items (
  id bigint generated always as identity primary key,
  contract_id bigint not null references public.erp_v2_contracts(id) on delete cascade,
  order_item_id uuid references public.erp_v2_order_items(id) on delete set null,
  catalog_item_id bigint references public.erp_v2_items(id) on delete set null,
  description text not null,
  quantity numeric(18,4) not null check (quantity > 0),
  unit text not null default 'EA',
  unit_price numeric(18,6) not null check (unit_price >= 0),
  amount numeric(18,2) generated always as (round(quantity * unit_price, 2)) stored,
  sequence integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.erp_v2_payments (
  id bigint generated always as identity primary key,
  receipt_number text not null unique,
  customer_key text not null default 'iineer'
    references public.erp_v2_customers(customer_key),
  received_date date not null default current_date,
  currency text not null default 'USD'
    check (currency in ('CNY','USD','KRW','EUR')),
  amount numeric(18,2) not null check (amount > 0),
  bank_reference text,
  notes text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_v2_payment_contract_allocations (
  payment_id bigint not null references public.erp_v2_payments(id) on delete cascade,
  contract_id bigint not null references public.erp_v2_contracts(id) on delete restrict,
  allocated_amount numeric(18,2) not null check (allocated_amount > 0),
  created_at timestamptz not null default now(),
  primary key (payment_id, contract_id)
);

create table if not exists public.erp_v2_invoice_contract_allocations (
  invoice_item_id uuid not null references public.erp_v2_invoice_items(id) on delete cascade,
  contract_item_id bigint not null references public.erp_v2_contract_items(id) on delete restrict,
  allocated_quantity numeric(18,4) not null check (allocated_quantity > 0),
  allocated_amount numeric(18,2) not null check (allocated_amount >= 0),
  created_at timestamptz not null default now(),
  primary key (invoice_item_id, contract_item_id)
);

create index if not exists erp_v2_orders_customer_stage_idx
  on public.erp_v2_orders (customer_key, workflow_stage, requested_at desc);
create index if not exists erp_v2_orders_user_idx
  on public.erp_v2_orders (user_id);
create index if not exists erp_v2_order_items_order_idx
  on public.erp_v2_order_items (order_id);
create index if not exists erp_v2_order_items_catalog_item_idx
  on public.erp_v2_order_items (catalog_item_id);
create index if not exists erp_v2_invoices_customer_issue_idx
  on public.erp_v2_invoices (customer_key, issue_date desc);
create index if not exists erp_v2_invoices_order_idx
  on public.erp_v2_invoices (order_id);
create index if not exists erp_v2_invoice_items_invoice_idx
  on public.erp_v2_invoice_items (invoice_id);
create index if not exists erp_v2_invoice_items_catalog_item_idx
  on public.erp_v2_invoice_items (catalog_item_id);
create index if not exists erp_v2_invoice_items_order_item_idx
  on public.erp_v2_invoice_items (order_item_id);
create index if not exists erp_v2_supplier_quotes_order_idx
  on public.erp_v2_supplier_quotes (order_id, requested_at desc);
create index if not exists erp_v2_supplier_quotes_supplier_idx
  on public.erp_v2_supplier_quotes (supplier_id, requested_at desc);
create index if not exists erp_v2_supplier_quote_items_quote_idx
  on public.erp_v2_supplier_quote_items (quote_id, sequence);
create index if not exists erp_v2_supplier_quote_items_order_item_idx
  on public.erp_v2_supplier_quote_items (order_item_id);
create index if not exists erp_v2_supplier_quote_items_catalog_item_idx
  on public.erp_v2_supplier_quote_items (catalog_item_id);
create index if not exists erp_v2_purchase_orders_order_idx
  on public.erp_v2_purchase_orders (order_id, issue_date desc);
create index if not exists erp_v2_purchase_orders_supplier_idx
  on public.erp_v2_purchase_orders (supplier_id, issue_date desc);
create index if not exists erp_v2_purchase_orders_quote_idx
  on public.erp_v2_purchase_orders (supplier_quote_id);
create index if not exists erp_v2_purchase_order_items_po_idx
  on public.erp_v2_purchase_order_items (purchase_order_id, sequence);
create index if not exists erp_v2_purchase_order_items_order_item_idx
  on public.erp_v2_purchase_order_items (order_item_id);
create index if not exists erp_v2_purchase_order_items_quote_item_idx
  on public.erp_v2_purchase_order_items (supplier_quote_item_id);
create index if not exists erp_v2_purchase_order_items_catalog_item_idx
  on public.erp_v2_purchase_order_items (catalog_item_id);
create index if not exists erp_v2_contracts_order_idx
  on public.erp_v2_contracts (order_id, issue_date desc);
create index if not exists erp_v2_contracts_customer_idx
  on public.erp_v2_contracts (customer_key, issue_date desc);
create index if not exists erp_v2_contract_items_contract_idx
  on public.erp_v2_contract_items (contract_id, sequence);
create index if not exists erp_v2_contract_items_order_item_idx
  on public.erp_v2_contract_items (order_item_id);
create index if not exists erp_v2_contract_items_catalog_item_idx
  on public.erp_v2_contract_items (catalog_item_id);
create index if not exists erp_v2_payments_customer_date_idx
  on public.erp_v2_payments (customer_key, received_date desc);
create index if not exists erp_v2_payment_allocations_contract_idx
  on public.erp_v2_payment_contract_allocations (contract_id);
create index if not exists erp_v2_invoice_allocations_contract_item_idx
  on public.erp_v2_invoice_contract_allocations (contract_item_id);

alter table public.erp_v2_customer_contacts enable row level security;
alter table public.erp_v2_supplier_quotes enable row level security;
alter table public.erp_v2_supplier_quote_items enable row level security;
alter table public.erp_v2_purchase_orders enable row level security;
alter table public.erp_v2_purchase_order_items enable row level security;
alter table public.erp_v2_contracts enable row level security;
alter table public.erp_v2_contract_items enable row level security;
alter table public.erp_v2_payments enable row level security;
alter table public.erp_v2_payment_contract_allocations enable row level security;
alter table public.erp_v2_invoice_contract_allocations enable row level security;

create policy erp_v2_customer_contacts_owner on public.erp_v2_customer_contacts
  for all to authenticated
  using ((select public.is_erp_v2_admin()))
  with check ((select public.is_erp_v2_admin()));
create policy erp_v2_supplier_quotes_owner on public.erp_v2_supplier_quotes
  for all to authenticated
  using ((select public.is_erp_v2_admin()))
  with check ((select public.is_erp_v2_admin()));
create policy erp_v2_supplier_quote_items_owner on public.erp_v2_supplier_quote_items
  for all to authenticated
  using ((select public.is_erp_v2_admin()))
  with check ((select public.is_erp_v2_admin()));
create policy erp_v2_purchase_orders_owner on public.erp_v2_purchase_orders
  for all to authenticated
  using ((select public.is_erp_v2_admin()))
  with check ((select public.is_erp_v2_admin()));
create policy erp_v2_purchase_order_items_owner on public.erp_v2_purchase_order_items
  for all to authenticated
  using ((select public.is_erp_v2_admin()))
  with check ((select public.is_erp_v2_admin()));
create policy erp_v2_contracts_owner on public.erp_v2_contracts
  for all to authenticated
  using ((select public.is_erp_v2_admin()))
  with check ((select public.is_erp_v2_admin()));
create policy erp_v2_contract_items_owner on public.erp_v2_contract_items
  for all to authenticated
  using ((select public.is_erp_v2_admin()))
  with check ((select public.is_erp_v2_admin()));
create policy erp_v2_payments_owner on public.erp_v2_payments
  for all to authenticated
  using ((select public.is_erp_v2_admin()))
  with check ((select public.is_erp_v2_admin()));
create policy erp_v2_payment_allocations_owner on public.erp_v2_payment_contract_allocations
  for all to authenticated
  using ((select public.is_erp_v2_admin()))
  with check ((select public.is_erp_v2_admin()));
create policy erp_v2_invoice_allocations_owner on public.erp_v2_invoice_contract_allocations
  for all to authenticated
  using ((select public.is_erp_v2_admin()))
  with check ((select public.is_erp_v2_admin()));

revoke all on table
  public.erp_v2_customer_contacts,
  public.erp_v2_supplier_quotes,
  public.erp_v2_supplier_quote_items,
  public.erp_v2_purchase_orders,
  public.erp_v2_purchase_order_items,
  public.erp_v2_contracts,
  public.erp_v2_contract_items,
  public.erp_v2_payments,
  public.erp_v2_payment_contract_allocations,
  public.erp_v2_invoice_contract_allocations
from anon, authenticated;

grant select, insert, update on table
  public.erp_v2_customer_contacts,
  public.erp_v2_supplier_quotes,
  public.erp_v2_supplier_quote_items,
  public.erp_v2_purchase_orders,
  public.erp_v2_purchase_order_items,
  public.erp_v2_contracts,
  public.erp_v2_contract_items,
  public.erp_v2_payments,
  public.erp_v2_payment_contract_allocations,
  public.erp_v2_invoice_contract_allocations
to authenticated;

grant usage, select on sequence
  public.erp_v2_customer_contacts_id_seq,
  public.erp_v2_supplier_quotes_id_seq,
  public.erp_v2_supplier_quote_items_id_seq,
  public.erp_v2_purchase_orders_id_seq,
  public.erp_v2_purchase_order_items_id_seq,
  public.erp_v2_contracts_id_seq,
  public.erp_v2_contract_items_id_seq,
  public.erp_v2_payments_id_seq
to authenticated;

comment on table public.erp_v2_supplier_quotes is
  'Supplier quotation requests and iiNEER price approval status.';
comment on table public.erp_v2_contracts is
  'Customer contracts; payment and shipment invoices are allocated separately.';
comment on table public.erp_v2_invoice_contract_allocations is
  'Many-to-many item allocation supporting multiple contracts per invoice and partial invoicing of a contract.';
