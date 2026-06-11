"use client";
import { useState } from "react";
import { TrendingUp, Eye, Tag, ChevronDown, ChevronUp, Edit3, Check, ExternalLink } from "lucide-react";
import { ProductWithSources } from "@/types";
import { formatViews, formatCurrency, formatPct } from "@/lib/calculations";
import { useStore } from "@/store/useStore";
import PLBreakdown from "./PLBreakdown";

const CATEGORY_COLORS: Record<string, string> = {
  "Home Decor": "bg-blue-900/40 text-blue-300 border-blue-700/40",
  "Beauty": "bg-pink-900/40 text-pink-300 border-pink-700/40",
  "Fitness": "bg-green-900/40 text-green-300 border-green-700/40",
  "Kitchen": "bg-amber-900/40 text-amber-300 border-amber-700/40",
};

const CATEGORY_EMOJIS: Record<string, string> = {
  "Home Decor": "🏠",
  "Beauty": "💄",
  "Fitness": "💪",
  "Kitchen": "🍳",
};

interface Props {
  product: ProductWithSources;
}

export default function ProductCard({ product }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(product.tiktokSellPrice.toString());
  const { updateSellPrice } = useStore();

  const bestSource = product.sources[0] ?? null;
  const catColor = CATEGORY_COLORS[product.category] ?? "bg-gray-700 text-gray-300 border-gray-600";
  const catEmoji = CATEGORY_EMOJIS[product.category] ?? "📦";

  const handlePriceSave = () => {
    const val = parseFloat(priceInput);
    if (!isNaN(val) && val > 0) updateSellPrice(product.id, val);
    setEditingPrice(false);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-all">
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${catColor}`}>
                {catEmoji} {product.category}
              </span>
              {product.trending && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-700/40 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Trending
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-white truncate">{product.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {formatViews(product.tiktokViews)} views
              </span>
              <span className="flex items-center gap-1 text-pink-400">
                <Tag className="w-3 h-3" />
                {product.tiktokHashtag}
              </span>
            </div>
          </div>

          {/* Sell Price Editor */}
          <div className="flex-shrink-0 text-right">
            <div className="text-xs text-gray-400 mb-0.5">Sell Price</div>
            {editingPrice ? (
              <div className="flex items-center gap-1">
                <span className="text-gray-400 text-sm">£</span>
                <input
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePriceSave()}
                  className="w-20 bg-gray-900 border border-pink-500 rounded px-1 py-0.5 text-sm text-white text-right focus:outline-none"
                  autoFocus
                />
                <button onClick={handlePriceSave} className="text-emerald-400 hover:text-emerald-300">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingPrice(true); setPriceInput(product.tiktokSellPrice.toString()); }}
                className="flex items-center gap-1 text-xl font-bold text-white hover:text-pink-300 transition-colors"
              >
                {formatCurrency(product.tiktokSellPrice)}
                <Edit3 className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {bestSource && (
          <div className="grid grid-cols-4 gap-2">
            <QuickStat label="Landed Cost" value={formatCurrency(bestSource.pl.landedCost)} color="text-blue-400" />
            <QuickStat label="Margin" value={formatPct(bestSource.pl.grossMarginPct)} color={bestSource.pl.grossMarginPct >= 50 ? "text-emerald-400" : bestSource.pl.grossMarginPct >= 30 ? "text-yellow-400" : "text-red-400"} />
            <QuickStat label="Markup" value={formatPct(bestSource.pl.markup)} color="text-purple-400" />
            <QuickStat label="MOQ" value={bestSource.moq.toString()} color="text-amber-400" />
          </div>
        )}

        {product.sources.length === 0 && (
          <div className="text-center py-3 text-sm text-gray-500">No sources match current filters</div>
        )}
      </div>

      {/* Expand Toggle */}
      {product.sources.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-xs text-gray-300 transition-colors border-t border-gray-700"
        >
          <span>{product.sources.length} wholesale source{product.sources.length !== 1 ? "s" : ""} found</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}

      {/* Expanded Sources */}
      {expanded && (
        <div className="p-3 pt-0 space-y-3 border-t border-gray-700">
          <div className="pt-3" />
          {product.sources.map((source) => (
            <PLBreakdown
              key={source.id}
              pl={source.pl}
              moq={source.moq}
              platform={source.platform}
              supplierName={source.supplierName}
              link={source.link}
              leadTimeDays={source.leadTimeDays}
              rating={source.rating}
              inStock={source.inStock}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuickStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-900 rounded-lg p-2 text-center">
      <div className="text-xs text-gray-500 mb-0.5 truncate">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}
