-- Existing Supabase projects may auto-grant broad Data API privileges.
-- Keep the workflow owner-only and preserve history by omitting DELETE.

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
