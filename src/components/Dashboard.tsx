"use client";
import { useState } from "react";
import { Plus, ShoppingBag, Zap, LayoutGrid, Table2 } from "lucide-react";
import { useFilteredProductsWithSources } from "@/store/useStore";
import SearchBar from "./SearchBar";
import FilterPanel from "./FilterPanel";
import ProductCard from "./ProductCard";
import StatsBar from "./StatsBar";
import AddProductModal from "./AddProductModal";
import ComparisonTable from "./ComparisonTable";

type ViewMode = "cards" | "table";

export default function Dashboard() {
  const products = useFilteredProductsWithSources();
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl shadow-lg shadow-pink-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">TikTok Sourcing Hub</h1>
              <p className="text-xs text-gray-400">Find, source & calculate profit from trending products</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <SearchBar />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-pink-500/20 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <StatsBar products={products} />

        {/* Filters */}
        <FilterPanel />

        {/* Results Count + View Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <ShoppingBag className="w-4 h-4" />
            <span>
              <span className="text-white font-medium">{products.length}</span> products found
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">
              {viewMode === "cards"
                ? "Click a product to expand wholesale sources & full P&L"
                : "Click column headers to sort"}
            </span>
            {/* View toggle buttons */}
            <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode("cards")}
                title="Card view"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "cards"
                    ? "bg-pink-600 text-white shadow-sm shadow-pink-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                title="Table view"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "table"
                    ? "bg-pink-600 text-white shadow-sm shadow-pink-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Table2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Product Grid / Table */}
        {products.length > 0 ? (
          viewMode === "cards" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <ComparisonTable products={products} />
          )
        ) : (
          <div className="text-center py-20">
            <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No products match your filters</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </main>

      {showModal && <AddProductModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
