import json
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[2] / "erp_matched_data.json"
OUTPUT = Path(__file__).resolve().parents[1] / "supabase" / "seed.sql"


def sql(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''").replace("\x00", "") + "'"


data = json.loads(SOURCE.read_text(encoding="utf-8-sig"))
items = data["items"]
transactions = data["transactions"]

item_rows = []
for index, item in enumerate(items, 1):
    normalized = item["normalizedPartName"]
    item_rows.append("(" + ",".join([
        sql(normalized), sql(normalized), sql(item.get("displayPartName") or normalized),
        sql(item.get("product") or "제품확인필요"), sql(item.get("category") or "기타"),
        sql(item.get("material") or None), sql("EA"),
        sql(item.get("latestPurchaseUnitEx")), sql(item.get("latestSaleUnitEx")),
        sql(item.get("drawingMatch") or "미매칭"), sql(item.get("drawingFormats") or None),
        sql(item.get("drawingPath") or None), sql(None)
    ]) + ")")

tx_rows = []
for tx in transactions:
    tx_rows.append("(" + ",".join([
        sql(tx.get("id")), sql(tx.get("sheet")), sql(tx.get("sourceExcelRow")),
        sql(tx.get("supplier")), sql(tx.get("date")), sql(tx.get("orderNo")),
        sql(tx.get("partName")), sql(tx.get("normalizedPartName")),
        sql(tx.get("product") or "제품확인필요"), sql(tx.get("category") or "기타"),
        sql(tx.get("material") or None), sql(tx.get("purchaseStatus")),
        sql(tx.get("purchaseUnitEx")), sql(tx.get("purchaseQty")),
        sql(tx.get("effectivePurchaseAmountEx")), sql(tx.get("effectivePurchaseAmountInc")),
        sql(tx.get("saleRule")), sql(tx.get("effectiveSaleUnitEx")),
        sql(tx.get("effectiveSaleQty")), sql(tx.get("effectiveSaleAmountEx")),
        sql(tx.get("effectiveSaleAmountInc")), sql(tx.get("grossProfitEx")),
        sql(tx.get("drawingMatch")), sql(tx.get("drawingFormats") or None),
        sql(tx.get("drawingPath") or None), sql(tx.get("note") or None)
    ]) + ")")

seed = f"""-- Generated from the verified ERP workbook source. Idempotent upsert only.
insert into public.erp_v2_items (
  item_code, normalized_key, item_name, product, process_type, material, unit,
  latest_purchase_unit, latest_sale_unit, drawing_status, drawing_formats,
  drawing_path, remark
) values
{',\n'.join(item_rows)}
on conflict (normalized_key) do update set
  item_name = excluded.item_name,
  product = excluded.product,
  process_type = excluded.process_type,
  material = excluded.material,
  latest_purchase_unit = excluded.latest_purchase_unit,
  latest_sale_unit = excluded.latest_sale_unit,
  drawing_status = excluded.drawing_status,
  drawing_formats = excluded.drawing_formats,
  drawing_path = excluded.drawing_path,
  updated_at = now();

insert into public.erp_v2_transactions (
  transaction_code, source_sheet, source_row, supplier_name, transaction_date,
  order_no, part_name, normalized_part_name, product, process_type, material,
  purchase_status, purchase_unit_ex, purchase_qty, purchase_amount_ex,
  purchase_amount_inc, sale_rule, sale_unit_ex, sale_qty, sale_amount_ex,
  sale_amount_inc, gross_profit_ex, drawing_match, drawing_formats, drawing_path, note
) values
{',\n'.join(tx_rows)}
on conflict (transaction_code) do update set
  source_sheet = excluded.source_sheet,
  source_row = excluded.source_row,
  supplier_name = excluded.supplier_name,
  transaction_date = excluded.transaction_date,
  order_no = excluded.order_no,
  part_name = excluded.part_name,
  normalized_part_name = excluded.normalized_part_name,
  product = excluded.product,
  process_type = excluded.process_type,
  material = excluded.material,
  purchase_status = excluded.purchase_status,
  purchase_unit_ex = excluded.purchase_unit_ex,
  purchase_qty = excluded.purchase_qty,
  purchase_amount_ex = excluded.purchase_amount_ex,
  purchase_amount_inc = excluded.purchase_amount_inc,
  sale_rule = excluded.sale_rule,
  sale_unit_ex = excluded.sale_unit_ex,
  sale_qty = excluded.sale_qty,
  sale_amount_ex = excluded.sale_amount_ex,
  sale_amount_inc = excluded.sale_amount_inc,
  gross_profit_ex = excluded.gross_profit_ex,
  drawing_match = excluded.drawing_match,
  drawing_formats = excluded.drawing_formats,
  drawing_path = excluded.drawing_path,
  note = excluded.note,
  imported_at = now();
"""

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(seed, encoding="utf-8")
print(json.dumps({"items": len(items), "transactions": len(transactions), "output": str(OUTPUT)}, ensure_ascii=False))
