"use client";
import { create } from "zustand";
import { SearchFilters, TikTokProduct, WholesaleSource } from "@/types";
import { MOCK_PRODUCTS, MOCK_SOURCES } from "@/lib/mockData";
import { calculatePL } from "@/lib/calculations";

interface AppState {
  products: TikTokProduct[];
  sources: WholesaleSource[];
  filters: SearchFilters;
  selectedProductId: string | null;
  setFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  resetFilters: () => void;
  selectProduct: (id: string | null) => void;
  addProduct: (product: TikTokProduct) => void;
  addSource: (source: WholesaleSource) => void;
  updateSellPrice: (productId: string, price: number) => void;
}

const DEFAULT_FILTERS: SearchFilters = {
  query: "",
  platform: "All",
  minMargin: 0,
  maxMOQ: 10000,
  maxLandedCost: 1000,
  category: "All",
  sortBy: "margin",
  sortDir: "desc",
};

export const useStore = create<AppState>((set) => ({
  products: MOCK_PRODUCTS,
  sources: MOCK_SOURCES,
  filters: DEFAULT_FILTERS,
  selectedProductId: null,

  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),

  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  selectProduct: (id) => set({ selectedProductId: id }),

  addProduct: (product) =>
    set((state) => ({ products: [...state.products, product] })),

  addSource: (source) =>
    set((state) => ({ sources: [...state.sources, source] })),

  updateSellPrice: (productId, price) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId ? { ...p, tiktokSellPrice: price } : p
      ),
    })),
}));

export function useFilteredProductsWithSources() {
  const { products, sources, filters } = useStore();

  const productsWithSources = products.map((product) => {
    const productSources = sources
      .filter((s) => s.productId === product.id)
      .map((source) => ({
        ...source,
        pl: calculatePL(source, product.tiktokSellPrice),
      }))
      .filter((s) => {
        if (filters.platform !== "All" && s.platform !== filters.platform) return false;
        if (s.pl.grossMarginPct < filters.minMargin) return false;
        if (s.moq > filters.maxMOQ) return false;
        if (s.pl.landedCost > filters.maxLandedCost) return false;
        return true;
      });

    return { ...product, sources: productSources };
  });

  const filtered = productsWithSources.filter((p) => {
    const q = filters.query.toLowerCase();
    if (q && !p.name.toLowerCase().includes(q) && !p.tiktokHashtag.toLowerCase().includes(q)) return false;
    if (filters.category !== "All" && p.category !== filters.category) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    const bestSource = (p: typeof a) =>
      p.sources.length > 0 ? p.sources[0] : null;

    const aSource = bestSource(a);
    const bSource = bestSource(b);

    let aVal = 0, bVal = 0;
    switch (filters.sortBy) {
      case "margin":
        aVal = aSource?.pl.grossMarginPct ?? -Infinity;
        bVal = bSource?.pl.grossMarginPct ?? -Infinity;
        break;
      case "landedCost":
        aVal = aSource?.pl.landedCost ?? Infinity;
        bVal = bSource?.pl.landedCost ?? Infinity;
        break;
      case "moq":
        aVal = aSource?.moq ?? Infinity;
        bVal = bSource?.moq ?? Infinity;
        break;
      case "views":
        aVal = a.tiktokViews;
        bVal = b.tiktokViews;
        break;
      case "roi":
        aVal = aSource?.pl.roi ?? -Infinity;
        bVal = bSource?.pl.roi ?? -Infinity;
        break;
      case "markup":
        aVal = aSource?.pl.markup ?? -Infinity;
        bVal = bSource?.pl.markup ?? -Infinity;
        break;
    }

    return filters.sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });
}
