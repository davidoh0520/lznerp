-- Remove API table privileges from unauthenticated visitors.
revoke all on public.erp_v2_items, public.erp_v2_transactions,
  public.erp_v2_orders, public.erp_v2_order_items, public.erp_v2_drawings,
  public.erp_v2_invoices, public.erp_v2_invoice_items from anon;
revoke all on sequence public.erp_v2_order_no_seq, public.erp_v2_invoice_no_seq from anon;
