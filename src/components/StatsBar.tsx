"use client";
import { Package, TrendingUp, DollarSign, BarChart3, Star } from "lucide-react";
import { ProductWithSources } from "@/types";
import { formatCurrency, formatPct } from "@/lib/calculations";

interface Props {
  products: ProductWithSources[];
}

export default function StatsBar({ products }: Props) {
  const allSources = products.flatMap((p) => p.sources);
  const totalProducts = products.length;
  const totalSources = allSources.length;
  const avgMargin =
    allSources.length > 0
      ? allSources.reduce((s, src) => s + src.pl.grossMarginPct, 0) / allSources.length
      : 0;
  const bestMargin = allSources.length > 0
    ? Math.max(...allSources.map((s) => s.pl.grossMarginPct))
    : 0;
  const avgLandedCost =
    allSources.length > 0
      ? allSources.reduce((s, src) => s + src.pl.landedCost, 0) / allSources.length
      : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        icon={<Package className="w-5 h-5 text-blue-400" />}
        label="Products Tracked"
        value={`${totalProducts}`}
        sub={`${totalSources} sources`}
        bg="bg-blue-900/20 border-blue-700/30"
      />
      <StatCard
        icon={<TrendingUp className="w-5 h-5 text-pink-400" />}
        label="Avg Gross Margin"
        value={formatPct(avgMargin)}
        sub="across all sources"
        bg="bg-pink-900/20 border-pink-700/30"
      />
      <StatCard
        icon={<Star className="w-5 h-5 text-amber-400" />}
        label="Best Margin"
        value={formatPct(bestMargin)}
        sub="top opportunity"
        bg="bg-amber-900/20 border-amber-700/30"
      />
      <StatCard
        icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
        label="Avg Landed Cost"
        value={formatCurrency(avgLandedCost)}
        sub="per unit"
        bg="bg-emerald-900/20 border-emerald-700/30"
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  bg: string;
}) {
  return (
    <div className={`border rounded-xl p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}
