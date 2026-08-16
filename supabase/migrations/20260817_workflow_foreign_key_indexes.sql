-- Cover user-reference foreign keys used by the owner-only workflow.

create index if not exists erp_v2_supplier_quotes_created_by_idx
  on public.erp_v2_supplier_quotes (created_by);
create index if not exists erp_v2_purchase_orders_created_by_idx
  on public.erp_v2_purchase_orders (created_by);
create index if not exists erp_v2_contracts_created_by_idx
  on public.erp_v2_contracts (created_by);
create index if not exists erp_v2_payments_created_by_idx
  on public.erp_v2_payments (created_by);
create index if not exists erp_v2_invoices_created_by_idx
  on public.erp_v2_invoices (created_by);
