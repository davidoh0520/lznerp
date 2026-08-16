-- ERP V2 function hardening. Trigger functions are not callable through the API.
revoke all on function public.is_erp_v2_admin() from public, anon;
grant execute on function public.is_erp_v2_admin() to authenticated;

revoke all on function public.erp_v2_auto_invoice() from public, anon, authenticated;
revoke all on function public.erp_v2_set_number() from public, anon, authenticated;
revoke all on function public.next_erp_v2_order_number() from public, anon;
revoke all on function public.next_erp_v2_invoice_number() from public, anon;
grant execute on function public.next_erp_v2_order_number() to authenticated;
grant execute on function public.next_erp_v2_invoice_number() to authenticated;

revoke all on public.erp_v2_items, public.erp_v2_transactions,
  public.erp_v2_orders, public.erp_v2_order_items, public.erp_v2_drawings,
  public.erp_v2_invoices, public.erp_v2_invoice_items from anon;
revoke all on sequence public.erp_v2_order_no_seq, public.erp_v2_invoice_no_seq from anon;
