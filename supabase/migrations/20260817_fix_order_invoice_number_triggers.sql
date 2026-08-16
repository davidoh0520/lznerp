-- Keep order and invoice numbering isolated so each trigger only touches
-- columns that exist on its own table.

drop trigger if exists trg_erp_v2_order_number on public.erp_v2_orders;
drop trigger if exists trg_erp_v2_invoice_number on public.erp_v2_invoices;

drop function if exists public.erp_v2_set_number();

create or replace function public.erp_v2_set_order_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(new.order_number, '') = '' then
    new.order_number := public.next_erp_v2_order_number();
  end if;
  return new;
end;
$$;

create or replace function public.erp_v2_set_invoice_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(new.invoice_number, '') = '' then
    new.invoice_number := public.next_erp_v2_invoice_number();
  end if;
  return new;
end;
$$;

create trigger trg_erp_v2_order_number
before insert on public.erp_v2_orders
for each row execute function public.erp_v2_set_order_number();

create trigger trg_erp_v2_invoice_number
before insert on public.erp_v2_invoices
for each row execute function public.erp_v2_set_invoice_number();

revoke all on function public.erp_v2_set_order_number() from public, anon, authenticated;
revoke all on function public.erp_v2_set_invoice_number() from public, anon, authenticated;
