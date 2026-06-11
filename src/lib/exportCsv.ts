import { ProductWithSources } from "@/types";

function esc(val: string | number | boolean): string {
  const s = String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

const HEADERS = [
  "Product",
  "Category",
  "TikTok Views",
  "TikTok Hashtag",
  "Platform",
  "Supplier",
  "Rating",
  "MOQ",
  "Unit Cost (USD)",
  "Shipping Per Unit (USD)",
  "Import Duty (USD)",
  "Landed Cost (USD)",
  "Sell Price (GBP)",
  "Gross Profit (GBP)",
  "Gross Margin %",
  "Markup %",
  "ROI %",
  "MOQ Investment (GBP)",
  "MOQ Revenue (GBP)",
  "MOQ Profit (GBP)",
  "Lead Time (days)",
  "In Stock",
  "Supplier Link",
];

export function exportToCsv(products: ProductWithSources[], filename = "tiktok-sourcing-hub.csv") {
  const rows: string[] = [HEADERS.join(",")];

  for (const product of products) {
    for (const source of product.sources) {
      const { pl } = source;
      rows.push(
        [
          esc(product.name),
          esc(product.category),
          esc(product.tiktokViews),
          esc(product.tiktokHashtag),
          esc(source.platform),
          esc(source.supplierName),
          esc(source.rating),
          esc(source.moq),
          esc(pl.unitCost.toFixed(2)),
          esc(pl.shippingPerUnit.toFixed(2)),
          esc(pl.importDuty.toFixed(2)),
          esc(pl.landedCost.toFixed(2)),
          esc(pl.sellPrice.toFixed(2)),
          esc(pl.grossProfit.toFixed(2)),
          esc(pl.grossMarginPct.toFixed(1)),
          esc(pl.markup.toFixed(1)),
          esc(pl.roi.toFixed(1)),
          esc(pl.moqInvestment.toFixed(2)),
          esc(pl.moqRevenue.toFixed(2)),
          esc(pl.moqProfit.toFixed(2)),
          esc(source.leadTimeDays),
          esc(source.inStock ? "Yes" : "No"),
          esc(source.link),
        ].join(",")
      );
    }
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
