"use client";
import { PLAnalysis } from "@/types";
import { formatCurrency, formatPct } from "@/lib/calculations";
import { TrendingUp, TrendingDown, Package, DollarSign, BarChart3, ArrowRight } from "lucide-react";

interface Props {
  pl: PLAnalysis;
  moq: number;
  platform: string;
  supplierName: string;
  link: string;
  leadTimeDays: number;
  rating: number;
  inStock: boolean;
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "red" | "neutral" }) {
  const color = highlight === "green" ? "text-emerald-400" : highlight === "red" ? "text-red-400" : "text-gray-300";
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-700/50 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-xs font-semibold ${color}`}>{value}</span>
    </div>
  );
}

export default function PLBreakdown({ pl, moq, platform, supplierName, link, leadTimeDays, rating, inStock }: Props) {
  const marginColor = pl.grossMarginPct >= 50 ? "green" : pl.grossMarginPct >= 30 ? "neutral" : "red";

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div>
          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-purple-900/50 text-purple-300 border border-purple-700/50 mr-2">
            {platform}
          </span>
          <span className="text-sm text-white font-medium">{supplierName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${inStock ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
            {inStock ? "In Stock" : "Out of Stock"}
          </span>
          <div className="text-xs text-yellow-400">{"★".repeat(Math.round(rating))} {rating}</div>
        </div>
      </div>

      <div className="p-3 grid grid-cols-2 gap-3">
        {/* Cost Breakdown */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-gray-300 uppercase tracking-wide">
            <DollarSign className="w-3.5 h-3.5 text-blue-400" />
            Cost Breakdown
          </div>
          <StatRow label="Unit Cost" value={formatCurrency(pl.unitCost)} />
          <StatRow label="Shipping / Unit" value={formatCurrency(pl.shippingPerUnit)} />
          <StatRow label="Import Duty" value={formatCurrency(pl.importDuty)} />
          <StatRow label="Landed Cost" value={formatCurrency(pl.landedCost)} highlight="neutral" />
        </div>

        {/* P&L */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-gray-300 uppercase tracking-wide">
            <BarChart3 className="w-3.5 h-3.5 text-pink-400" />
            P&amp;L per Unit
          </div>
          <StatRow label="Sell Price" value={formatCurrency(pl.sellPrice)} />
          <StatRow label="Gross Profit" value={formatCurrency(pl.grossProfit)} highlight={pl.grossProfit > 0 ? "green" : "red"} />
          <StatRow label="Gross Margin" value={formatPct(pl.grossMarginPct)} highlight={marginColor} />
          <StatRow label="Markup" value={formatPct(pl.markup)} highlight="neutral" />
        </div>
      </div>

      {/* MOQ Row */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-gray-300 uppercase tracking-wide">
          <Package className="w-3.5 h-3.5 text-amber-400" />
          MOQ Analysis ({moq} units)
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-400 mb-0.5">Investment</div>
            <div className="text-sm font-bold text-amber-400">{formatCurrency(pl.moqInvestment)}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-400 mb-0.5">Revenue</div>
            <div className="text-sm font-bold text-blue-400">{formatCurrency(pl.moqRevenue)}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-400 mb-0.5">Profit</div>
            <div className={`text-sm font-bold ${pl.moqProfit > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatCurrency(pl.moqProfit)}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border-t border-gray-700 text-xs text-gray-400">
        <span>Lead time: {leadTimeDays} days</span>
        <span>
          ROI: <span className={pl.roi > 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>{formatPct(pl.roi)}</span>
        </span>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-pink-400 hover:text-pink-300 font-medium transition-colors"
        >
          View Source <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
