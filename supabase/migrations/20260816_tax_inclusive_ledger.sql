-- Preserve the entered price basis while keeping ERP reporting tax-inclusive.

alter table public.erp_v2_transactions
  add column if not exists purchase_price_basis text not null default 'exclusive',
  add column if not exists purchase_tax_rate numeric(6,5) not null default 0.13,
  add column if not exists sale_price_basis text not null default 'exclusive',
  add column if not exists sale_tax_rate numeric(6,5) not null default 0.13,
  add column if not exists gross_profit_inc numeric(18,2)
    generated always as (coalesce(sale_amount_inc, 0) - coalesce(purchase_amount_inc, 0)) stored;

comment on column public.erp_v2_transactions.purchase_price_basis is 'exclusive: entered before tax, inclusive: entered after tax';
comment on column public.erp_v2_transactions.purchase_tax_rate is 'Purchase tax rate stored as a fraction; 0.13 means 13 percent';
comment on column public.erp_v2_transactions.sale_price_basis is 'exclusive: entered before tax, inclusive: entered after tax';
comment on column public.erp_v2_transactions.sale_tax_rate is 'Sales tax rate stored as a fraction; 0.13 means 13 percent';
comment on column public.erp_v2_transactions.gross_profit_inc is 'Tax-inclusive sales less tax-inclusive purchases';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'erp_v2_transactions_purchase_basis_check'
      and conrelid = 'public.erp_v2_transactions'::regclass
  ) then
    alter table public.erp_v2_transactions
      add constraint erp_v2_transactions_purchase_basis_check
      check (purchase_price_basis in ('exclusive', 'inclusive'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'erp_v2_transactions_sale_basis_check'
      and conrelid = 'public.erp_v2_transactions'::regclass
  ) then
    alter table public.erp_v2_transactions
      add constraint erp_v2_transactions_sale_basis_check
      check (sale_price_basis in ('exclusive', 'inclusive'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'erp_v2_transactions_purchase_tax_rate_check'
      and conrelid = 'public.erp_v2_transactions'::regclass
  ) then
    alter table public.erp_v2_transactions
      add constraint erp_v2_transactions_purchase_tax_rate_check
      check (purchase_tax_rate between 0 and 1);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'erp_v2_transactions_sale_tax_rate_check'
      and conrelid = 'public.erp_v2_transactions'::regclass
  ) then
    alter table public.erp_v2_transactions
      add constraint erp_v2_transactions_sale_tax_rate_check
      check (sale_tax_rate between 0 and 1);
  end if;
end
$$;
