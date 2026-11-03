"use client";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { useStore } from "@/store/useStore";
import { CATEGORIES, PLATFORMS } from "@/lib/calculations";
import { SearchFilters, SortField } from "@/types";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "margin", label: "Gross Margin" },
  { value: "roi", label: "ROI" },
  { value: "markup", label: "Markup" },
  { value: "views", label: "TikTok Views" },
  { value: "landedCost", label: "Landed Cost" },
  { value: "moq", label: "MOQ" },
];

export default function FilterPanel() {
  const { filters, setFilter, resetFilters } = useStore();

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white font-medium">
          <SlidersHorizontal className="w-4 h-4 text-pink-400" />
          Filters
        </div>
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Category */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Category</label>
          <select
            value={filters.category}
            onChange={(e) => setFilter("category", e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg text-sm text-white py-2 px-2 focus:outline-none focus:border-pink-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Platform */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Platform</label>
          <select
            value={filters.platform}
            onChange={(e) => setFilter("platform", e.target.value as SearchFilters["platform"])}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg text-sm text-white py-2 px-2 focus:outline-none focus:border-pink-500"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Min Margin */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Min Margin: <span className="text-pink-400">{filters.minMargin}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={80}
            value={filters.minMargin}
            onChange={(e) => setFilter("minMargin", Number(e.target.value))}
            className="w-full accent-pink-500"
          />
        </div>

        {/* Max MOQ */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Max MOQ: <span className="text-pink-400">{filters.maxMOQ}</span>
          </label>
          <input
            type="range"
            min={5}
            max={500}
            step={5}
            value={filters.maxMOQ}
            onChange={(e) => setFilter("maxMOQ", Number(e.target.value))}
            className="w-full accent-pink-500"
          />
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Sort By</label>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilter("sortBy", e.target.value as SortField)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg text-sm text-white py-2 px-2 focus:outline-none focus:border-pink-500"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Sort Dir */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Direction</label>
          <select
            value={filters.sortDir}
            onChange={(e) => setFilter("sortDir", e.target.value as "asc" | "desc")}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg text-sm text-white py-2 px-2 focus:outline-none focus:border-pink-500"
          >
            <option value="desc">High to Low</option>
            <option value="asc">Low to High</option>
          </select>
        </div>
      </div>
    </div>
  );
}
