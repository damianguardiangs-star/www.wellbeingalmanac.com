import { WholesaleSource, PLAnalysis, ProductWithSources, TikTokProduct } from "@/types";
import { MOCK_PRODUCTS, MOCK_SOURCES } from "./mockData";

export function calculatePL(source: WholesaleSource, sellPrice: number): PLAnalysis {
  const importDuty = source.unitPrice * (source.importDutyPct / 100);
  const landedCost = source.unitPrice + source.shippingCostPerUnit + importDuty;
  const grossProfit = sellPrice - landedCost;
  const grossMarginPct = sellPrice > 0 ? (grossProfit / sellPrice) * 100 : 0;
  const markup = landedCost > 0 ? ((sellPrice - landedCost) / landedCost) * 100 : 0;
  const roi = landedCost > 0 ? (grossProfit / landedCost) * 100 : 0;
  const moqInvestment = landedCost * source.moq;
  const moqRevenue = sellPrice * source.moq;
  const moqProfit = grossProfit * source.moq;
  const breakEvenUnits = grossProfit > 0 ? Math.ceil(moqInvestment / grossProfit) : Infinity;

  return {
    sourceId: source.id,
    unitCost: source.unitPrice,
    shippingPerUnit: source.shippingCostPerUnit,
    importDuty,
    landedCost,
    sellPrice,
    grossProfit,
    grossMarginPct,
    markup,
    breakEvenUnits,
    roi,
    moqInvestment,
    moqRevenue,
    moqProfit,
  };
}

export function buildProductsWithSources(): ProductWithSources[] {
  return MOCK_PRODUCTS.map((product) => {
    const sources = MOCK_SOURCES.filter((s) => s.productId === product.id).map((source) => ({
      ...source,
      pl: calculatePL(source, product.tiktokSellPrice),
    }));
    return { ...product, sources };
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(0)}K`;
  return views.toString();
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export const CATEGORIES = ["All", ...Array.from(new Set(MOCK_PRODUCTS.map((p) => p.category)))];
export const PLATFORMS = [
  "All",
  "Alibaba",
  "AliExpress",
  "DHgate",
  "Made-in-China",
  "Global Sources",
  "IndiaMart",
  "Faire",
  "Tundra",
] as const;
