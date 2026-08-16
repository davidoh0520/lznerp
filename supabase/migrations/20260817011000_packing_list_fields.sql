-- Packing details for the English export document set sent to iiNEER.

alter table public.erp_v2_invoices
  add column if not exists package_count integer
    check (package_count is null or package_count > 0),
  add column if not exists package_type text,
  add column if not exists net_weight_kg numeric(18,3)
    check (net_weight_kg is null or net_weight_kg >= 0),
  add column if not exists gross_weight_kg numeric(18,3)
    check (gross_weight_kg is null or gross_weight_kg >= 0),
  add column if not exists dimensions_cm text,
  add column if not exists shipping_marks text;

comment on column public.erp_v2_invoices.package_count is
  'Number of packages shown on the English packing list.';
comment on column public.erp_v2_invoices.dimensions_cm is
  'Package dimensions as printable free text, for example 60 x 40 x 35 cm.';
