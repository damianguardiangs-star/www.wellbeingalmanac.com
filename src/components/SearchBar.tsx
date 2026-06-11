"use client";
import { Search, X } from "lucide-react";
import { useStore } from "@/store/useStore";

export default function SearchBar() {
  const { filters, setFilter } = useStore();

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
        type="text"
        placeholder="Search products or hashtags..."
        value={filters.query}
        onChange={(e) => setFilter("query", e.target.value)}
        className="w-full pl-10 pr-10 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
      />
      {filters.query && (
        <button
          onClick={() => setFilter("query", "")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
