-- Invoices are shipment documents in the owner workflow.  Price approval or
-- order confirmation must not create a draft invoice automatically.

drop trigger if exists trg_erp_v2_auto_invoice on public.erp_v2_orders;
