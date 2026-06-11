"use client";
import { useState } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Star,
} from "lucide-react";
import { ProductWithSources, WholesalePlatform } from "@/types";
import {
  formatCurrency,
  formatPct,
  formatViews,
} from "@/lib/calculations";
import { useStore } from "@/store/useStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortCol =
  | "product"
  | "views"
  | "platform"
  | "supplier"
  | "moq"
  | "unitCost"
  | "shipping"
  | "importDuty"
  | "landedCost"
  | "sellPrice"
  | "grossProfit"
  | "margin"
  | "markup"
  | "roi"
  | "moqInvestment"
  | "moqProfit"
  | "leadDays"
  | "stock";

type SortDir = "asc" | "desc";

interface RowData {
  productId: string;
  productName: string;
  category: string;
  tiktokViews: number;
  platform: WholesalePlatform;
  supplierName: string;
  rating: number;
  moq: number;
  unitCost: number;
  shipping: number;
  importDuty: number;
  landedCost: number;
  sellPrice: number;
  grossProfit: number;
  margin: number;
  markup: number;
  roi: number;
  moqInvestment: number;
  moqProfit: number;
  leadDays: number;
  inStock: boolean;
  link: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  "Home Decor": "bg-blue-900/40 text-blue-300 border-blue-700/40",
  Beauty: "bg-pink-900/40 text-pink-300 border-pink-700/40",
  Fitness: "bg-green-900/40 text-green-300 border-green-700/40",
  Kitchen: "bg-amber-900/40 text-amber-300 border-amber-700/40",
};

const PLATFORM_COLORS: Record<WholesalePlatform, string> = {
  Alibaba: "bg-orange-900/40 text-orange-300 border-orange-700/40",
  AliExpress: "bg-red-900/40 text-red-300 border-red-700/40",
  DHgate: "bg-blue-900/40 text-blue-300 border-blue-700/40",
  "Made-in-China": "bg-yellow-900/40 text-yellow-300 border-yellow-700/40",
  "Global Sources": "bg-teal-900/40 text-teal-300 border-teal-700/40",
  IndiaMart: "bg-indigo-900/40 text-indigo-300 border-indigo-700/40",
  Faire: "bg-purple-900/40 text-purple-300 border-purple-700/40",
  Tundra: "bg-cyan-900/40 text-cyan-300 border-cyan-700/40",
};

// ─── Helper: build flat rows ──────────────────────────────────────────────────

function buildRows(products: ProductWithSources[]): RowData[] {
  const rows: RowData[] = [];
  for (const p of products) {
    for (const s of p.sources) {
      rows.push({
        productId: p.id,
        productName: p.name,
        category: p.category,
        tiktokViews: p.tiktokViews,
        platform: s.platform,
        supplierName: s.supplierName,
        rating: s.rating,
        moq: s.moq,
        unitCost: s.pl.unitCost,
        shipping: s.pl.shippingPerUnit,
        importDuty: s.pl.importDuty,
        landedCost: s.pl.landedCost,
        sellPrice: s.pl.sellPrice,
        grossProfit: s.pl.grossProfit,
        margin: s.pl.grossMarginPct,
        markup: s.pl.markup,
        roi: s.pl.roi,
        moqInvestment: s.pl.moqInvestment,
        moqProfit: s.pl.moqProfit,
        leadDays: s.leadTimeDays,
        inStock: s.inStock,
        link: s.link,
      });
    }
  }
  return rows;
}

function sortRows(rows: RowData[], col: SortCol, dir: SortDir): RowData[] {
  return [...rows].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (col) {
      case "product":
        aVal = a.productName.toLowerCase();
        bVal = b.productName.toLowerCase();
        break;
      case "views":
        aVal = a.tiktokViews;
        bVal = b.tiktokViews;
        break;
      case "platform":
        aVal = a.platform.toLowerCase();
        bVal = b.platform.toLowerCase();
        break;
      case "supplier":
        aVal = a.supplierName.toLowerCase();
        bVal = b.supplierName.toLowerCase();
        break;
      case "moq":
        aVal = a.moq;
        bVal = b.moq;
        break;
      case "unitCost":
        aVal = a.unitCost;
        bVal = b.unitCost;
        break;
      case "shipping":
        aVal = a.shipping;
        bVal = b.shipping;
        break;
      case "importDuty":
        aVal = a.importDuty;
        bVal = b.importDuty;
        break;
      case "landedCost":
        aVal = a.landedCost;
        bVal = b.landedCost;
        break;
      case "sellPrice":
        aVal = a.sellPrice;
        bVal = b.sellPrice;
        break;
      case "grossProfit":
        aVal = a.grossProfit;
        bVal = b.grossProfit;
        break;
      case "margin":
        aVal = a.margin;
        bVal = b.margin;
        break;
      case "markup":
        aVal = a.markup;
        bVal = b.markup;
        break;
      case "roi":
        aVal = a.roi;
        bVal = b.roi;
        break;
      case "moqInvestment":
        aVal = a.moqInvestment;
        bVal = b.moqInvestment;
        break;
      case "moqProfit":
        aVal = a.moqProfit;
        bVal = b.moqProfit;
        break;
      case "leadDays":
        aVal = a.leadDays;
        bVal = b.leadDays;
        break;
      case "stock":
        aVal = a.inStock ? 1 : 0;
        bVal = b.inStock ? 1 : 0;
        break;
      default:
        return 0;
    }

    if (typeof aVal === "string" && typeof bVal === "string") {
      return dir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    return dir === "asc"
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortIcon({
  col,
  active,
  dir,
}: {
  col: SortCol;
  active: SortCol;
  dir: SortDir;
}) {
  if (col !== active)
    return <ArrowUpDown className="w-3 h-3 opacity-30 ml-1 flex-shrink-0" />;
  return dir === "asc" ? (
    <ArrowUp className="w-3 h-3 ml-1 flex-shrink-0 text-pink-400" />
  ) : (
    <ArrowDown className="w-3 h-3 ml-1 flex-shrink-0 text-pink-400" />
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            i <= Math.round(rating)
              ? "text-yellow-400 fill-yellow-400"
              : "text-gray-600"
          }`}
        />
      ))}
    </span>
  );
}

// ─── Inline sell-price editor ─────────────────────────────────────────────────

function SellPriceCell({
  productId,
  sellPrice,
}: {
  productId: string;
  sellPrice: number;
}) {
  const { updateSellPrice } = useStore();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(sellPrice.toString());

  const save = () => {
    const val = parseFloat(input);
    if (!isNaN(val) && val > 0) updateSellPrice(productId, val);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-[90px]">
        <span className="text-gray-400 text-xs">£</span>
        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={save}
          className="w-16 bg-gray-900 border border-pink-500 rounded px-1 py-0.5 text-xs text-white text-right focus:outline-none"
          autoFocus
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setInput(sellPrice.toString());
        setEditing(true);
      }}
      className="text-white hover:text-pink-300 transition-colors text-right w-full tabular-nums"
      title="Click to edit sell price"
    >
      {formatCurrency(sellPrice)}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  products: ProductWithSources[];
}

export default function ComparisonTable({ products }: Props) {
  const [sortCol, setSortCol] = useState<SortCol>("margin");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (col: SortCol) => {
    if (col === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const allRows = buildRows(products);
  const rows = sortRows(allRows, sortCol, sortDir);

  if (rows.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500 text-sm">
        No sources match the current filters.
      </div>
    );
  }

  // ── Column header helper ──
  const Th = ({
    col,
    label,
    className = "",
  }: {
    col: SortCol;
    label: string;
    className?: string;
  }) => (
    <th
      className={`px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-white transition-colors ${
        sortCol === col ? "text-pink-400" : ""
      } ${className}`}
      onClick={() => toggleSort(col)}
    >
      <span className="flex items-center">
        {label}
        <SortIcon col={col} active={sortCol} dir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-900">
      <table className="w-full text-sm border-collapse min-w-[1600px]">
        <thead>
          <tr className="border-b border-gray-700 bg-gray-800/80">
            {/* Sticky product column */}
            <Th
              col="product"
              label="Product"
              className="sticky left-0 z-10 bg-gray-800 min-w-[180px] max-w-[220px]"
            />
            <Th col="views" label="TikTok Views" />
            <Th col="platform" label="Platform" />
            <Th col="supplier" label="Supplier" />
            <Th col="moq" label="MOQ" />
            <Th col="unitCost" label="Unit Cost" />
            <Th col="shipping" label="Shipping/Unit" />
            <Th col="importDuty" label="Import Duty" />
            {/* Highlighted columns */}
            <Th
              col="landedCost"
              label="Landed Cost"
              className="border-l-2 border-l-blue-600/60 bg-blue-950/20"
            />
            <Th col="sellPrice" label="Sell Price" />
            <Th
              col="grossProfit"
              label="Gross Profit"
              className="border-l-2 border-l-emerald-600/60 bg-emerald-950/20"
            />
            <Th
              col="margin"
              label="Margin %"
              className="border-l-2 border-l-pink-600/60 bg-pink-950/20"
            />
            <Th col="markup" label="Markup %" />
            <Th col="roi" label="ROI %" />
            <Th col="moqInvestment" label="MOQ Investment" />
            <Th col="moqProfit" label="MOQ Profit" />
            <Th col="leadDays" label="Lead Days" />
            <Th col="stock" label="Stock" />
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">
              Link
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const catColor =
              CATEGORY_COLORS[row.category] ??
              "bg-gray-700 text-gray-300 border-gray-600";
            const platformColor =
              PLATFORM_COLORS[row.platform] ??
              "bg-gray-700 text-gray-300 border-gray-600";

            const marginColor =
              row.margin >= 50
                ? "text-emerald-400"
                : row.margin >= 30
                ? "text-yellow-400"
                : "text-red-400";

            const profitColor =
              row.grossProfit > 0 ? "text-emerald-400" : "text-red-400";
            const moqProfitColor =
              row.moqProfit > 0 ? "text-emerald-400" : "text-red-400";

            const rowBase =
              idx % 2 === 0 ? "bg-gray-900" : "bg-gray-800/40";

            return (
              <tr
                key={`${row.productId}-${row.supplierName}-${idx}`}
                className={`${rowBase} border-b border-gray-700/50 hover:bg-gray-700/40 transition-colors`}
              >
                {/* Sticky product cell */}
                <td
                  className={`sticky left-0 z-10 px-3 py-3 ${rowBase} min-w-[180px] max-w-[220px] border-r border-gray-700`}
                >
                  <div className="font-medium text-white text-xs leading-snug truncate max-w-[200px]">
                    {row.productName}
                  </div>
                  <span
                    className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full border ${catColor}`}
                  >
                    {row.category}
                  </span>
                </td>

                {/* Views */}
                <td className="px-3 py-3 text-gray-300 tabular-nums whitespace-nowrap">
                  {formatViews(row.tiktokViews)}
                </td>

                {/* Platform */}
                <td className="px-3 py-3 whitespace-nowrap">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border ${platformColor}`}
                  >
                    {row.platform}
                  </span>
                </td>

                {/* Supplier */}
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-gray-200 text-xs font-medium truncate max-w-[140px]">
                    {row.supplierName}
                  </div>
                  <Stars rating={row.rating} />
                </td>

                {/* MOQ */}
                <td className="px-3 py-3 text-gray-300 tabular-nums">
                  {row.moq.toLocaleString()}
                </td>

                {/* Unit Cost */}
                <td className="px-3 py-3 text-gray-300 tabular-nums whitespace-nowrap">
                  {formatCurrency(row.unitCost)}
                </td>

                {/* Shipping */}
                <td className="px-3 py-3 text-gray-300 tabular-nums whitespace-nowrap">
                  {formatCurrency(row.shipping)}
                </td>

                {/* Import Duty */}
                <td className="px-3 py-3 text-gray-300 tabular-nums whitespace-nowrap">
                  {formatCurrency(row.importDuty)}
                </td>

                {/* Landed Cost — highlighted */}
                <td className="px-3 py-3 tabular-nums whitespace-nowrap border-l-2 border-l-blue-600/60 bg-blue-950/10 text-blue-300 font-semibold">
                  {formatCurrency(row.landedCost)}
                </td>

                {/* Sell Price — editable */}
                <td className="px-3 py-3 tabular-nums whitespace-nowrap">
                  <SellPriceCell
                    productId={row.productId}
                    sellPrice={row.sellPrice}
                  />
                </td>

                {/* Gross Profit — highlighted */}
                <td
                  className={`px-3 py-3 tabular-nums whitespace-nowrap border-l-2 border-l-emerald-600/60 bg-emerald-950/10 font-semibold ${profitColor}`}
                >
                  {formatCurrency(row.grossProfit)}
                </td>

                {/* Margin % — highlighted */}
                <td
                  className={`px-3 py-3 tabular-nums whitespace-nowrap border-l-2 border-l-pink-600/60 bg-pink-950/10 font-bold ${marginColor}`}
                >
                  {formatPct(row.margin)}
                </td>

                {/* Markup % */}
                <td className="px-3 py-3 text-purple-400 tabular-nums whitespace-nowrap">
                  {formatPct(row.markup)}
                </td>

                {/* ROI % */}
                <td className="px-3 py-3 text-cyan-400 tabular-nums whitespace-nowrap">
                  {formatPct(row.roi)}
                </td>

                {/* MOQ Investment */}
                <td className="px-3 py-3 text-gray-300 tabular-nums whitespace-nowrap">
                  {formatCurrency(row.moqInvestment)}
                </td>

                {/* MOQ Profit */}
                <td
                  className={`px-3 py-3 tabular-nums whitespace-nowrap font-medium ${moqProfitColor}`}
                >
                  {formatCurrency(row.moqProfit)}
                </td>

                {/* Lead Days */}
                <td className="px-3 py-3 text-gray-300 tabular-nums text-center">
                  {row.leadDays}
                </td>

                {/* Stock */}
                <td className="px-3 py-3 whitespace-nowrap">
                  {row.inStock ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-700/40">
                      In Stock
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-700/40">
                      Out of Stock
                    </span>
                  )}
                </td>

                {/* Link */}
                <td className="px-3 py-3">
                  <a
                    href={row.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-pink-400 transition-colors inline-flex items-center"
                    title="Open supplier page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
