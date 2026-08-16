-- Prevent over-payment, over-shipment, and cross-currency allocations even if
-- a client bypasses the browser checks.

create or replace function public.erp_v2_validate_payment_allocation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_payment_amount numeric;
  v_payment_currency text;
  v_contract_total numeric;
  v_contract_currency text;
  v_payment_allocated numeric;
  v_contract_allocated numeric;
begin
  select amount, currency
    into v_payment_amount, v_payment_currency
  from public.erp_v2_payments
  where id = new.payment_id;

  select total, currency
    into v_contract_total, v_contract_currency
  from public.erp_v2_contracts
  where id = new.contract_id;

  if v_payment_currency is distinct from v_contract_currency then
    raise exception 'Payment and Contract currencies must match';
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(sum(allocated_amount), 0)
      into v_payment_allocated
    from public.erp_v2_payment_contract_allocations
    where payment_id = new.payment_id
      and (payment_id, contract_id) <> (old.payment_id, old.contract_id);

    select coalesce(sum(allocated_amount), 0)
      into v_contract_allocated
    from public.erp_v2_payment_contract_allocations
    where contract_id = new.contract_id
      and (payment_id, contract_id) <> (old.payment_id, old.contract_id);
  else
    select coalesce(sum(allocated_amount), 0)
      into v_payment_allocated
    from public.erp_v2_payment_contract_allocations
    where payment_id = new.payment_id;

    select coalesce(sum(allocated_amount), 0)
      into v_contract_allocated
    from public.erp_v2_payment_contract_allocations
    where contract_id = new.contract_id;
  end if;

  if v_payment_allocated + new.allocated_amount > v_payment_amount + 0.005 then
    raise exception 'Payment allocation exceeds the received amount';
  end if;

  if v_contract_allocated + new.allocated_amount > v_contract_total + 0.005 then
    raise exception 'Payment allocation exceeds the Contract total';
  end if;

  return new;
end;
$$;

create or replace function public.erp_v2_validate_invoice_allocation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_invoice_currency text;
  v_invoice_customer text;
  v_invoice_item_quantity numeric;
  v_invoice_item_amount numeric;
  v_contract_currency text;
  v_contract_customer text;
  v_contract_item_quantity numeric;
  v_contract_unit_price numeric;
  v_invoice_allocated_quantity numeric;
  v_invoice_allocated_amount numeric;
  v_contract_shipped_quantity numeric;
begin
  select i.currency, i.customer_key, ii.quantity, ii.amount
    into v_invoice_currency, v_invoice_customer,
         v_invoice_item_quantity, v_invoice_item_amount
  from public.erp_v2_invoice_items ii
  join public.erp_v2_invoices i on i.id = ii.invoice_id
  where ii.id = new.invoice_item_id;

  select c.currency, c.customer_key, ci.quantity, ci.unit_price
    into v_contract_currency, v_contract_customer,
         v_contract_item_quantity, v_contract_unit_price
  from public.erp_v2_contract_items ci
  join public.erp_v2_contracts c on c.id = ci.contract_id
  where ci.id = new.contract_item_id;

  if v_invoice_currency is distinct from v_contract_currency
     or v_invoice_customer is distinct from v_contract_customer then
    raise exception 'Invoice and Contract customer/currency must match';
  end if;

  if abs(new.allocated_amount - round(new.allocated_quantity * v_contract_unit_price, 2)) > 0.005 then
    raise exception 'Invoice allocation amount must match Contract quantity and unit price';
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(sum(allocated_quantity), 0), coalesce(sum(allocated_amount), 0)
      into v_invoice_allocated_quantity, v_invoice_allocated_amount
    from public.erp_v2_invoice_contract_allocations
    where invoice_item_id = new.invoice_item_id
      and (invoice_item_id, contract_item_id) <> (old.invoice_item_id, old.contract_item_id);

    select coalesce(sum(allocated_quantity), 0)
      into v_contract_shipped_quantity
    from public.erp_v2_invoice_contract_allocations
    where contract_item_id = new.contract_item_id
      and (invoice_item_id, contract_item_id) <> (old.invoice_item_id, old.contract_item_id);
  else
    select coalesce(sum(allocated_quantity), 0), coalesce(sum(allocated_amount), 0)
      into v_invoice_allocated_quantity, v_invoice_allocated_amount
    from public.erp_v2_invoice_contract_allocations
    where invoice_item_id = new.invoice_item_id;

    select coalesce(sum(allocated_quantity), 0)
      into v_contract_shipped_quantity
    from public.erp_v2_invoice_contract_allocations
    where contract_item_id = new.contract_item_id;
  end if;

  if v_invoice_allocated_quantity + new.allocated_quantity > v_invoice_item_quantity + 0.000001
     or v_invoice_allocated_amount + new.allocated_amount > v_invoice_item_amount + 0.005 then
    raise exception 'Allocation exceeds the Invoice item quantity or amount';
  end if;

  if v_contract_shipped_quantity + new.allocated_quantity > v_contract_item_quantity + 0.000001 then
    raise exception 'Shipment allocation exceeds the Contract item quantity';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_erp_v2_validate_payment_allocation
  on public.erp_v2_payment_contract_allocations;
create trigger trg_erp_v2_validate_payment_allocation
before insert or update on public.erp_v2_payment_contract_allocations
for each row execute function public.erp_v2_validate_payment_allocation();

drop trigger if exists trg_erp_v2_validate_invoice_allocation
  on public.erp_v2_invoice_contract_allocations;
create trigger trg_erp_v2_validate_invoice_allocation
before insert or update on public.erp_v2_invoice_contract_allocations
for each row execute function public.erp_v2_validate_invoice_allocation();

revoke all on function public.erp_v2_validate_payment_allocation()
  from public, anon, authenticated;
revoke all on function public.erp_v2_validate_invoice_allocation()
  from public, anon, authenticated;
