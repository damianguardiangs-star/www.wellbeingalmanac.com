export interface TikTokProduct {
  id: string;
  name: string;
  category: string;
  tiktokViews: number;
  tiktokHashtag: string;
  tiktokSellPrice: number;
  imageUrl: string;
  trending: boolean;
  addedAt: string;
}

export interface WholesaleSource {
  id: string;
  productId: string;
  platform: WholesalePlatform;
  supplierName: string;
  unitPrice: number;
  moq: number;
  currency: string;
  link: string;
  shippingCostPerUnit: number;
  importDutyPct: number;
  leadTimeDays: number;
  rating: number;
  inStock: boolean;
}

export type WholesalePlatform =
  | "Alibaba"
  | "AliExpress"
  | "DHgate"
  | "Made-in-China"
  | "Global Sources"
  | "IndiaMart"
  | "Faire"
  | "Tundra";

export interface PLAnalysis {
  sourceId: string;
  unitCost: number;
  shippingPerUnit: number;
  importDuty: number;
  landedCost: number;
  sellPrice: number;
  grossProfit: number;
  grossMarginPct: number;
  markup: number;
  breakEvenUnits: number;
  roi: number;
  moqInvestment: number;
  moqRevenue: number;
  moqProfit: number;
}

export interface ProductWithSources extends TikTokProduct {
  sources: (WholesaleSource & { pl: PLAnalysis })[];
}

export interface SearchFilters {
  query: string;
  platform: WholesalePlatform | "All";
  minMargin: number;
  maxMOQ: number;
  maxLandedCost: number;
  category: string;
  sortBy: SortField;
  sortDir: "asc" | "desc";
}

export type SortField =
  | "margin"
  | "landedCost"
  | "moq"
  | "views"
  | "roi"
  | "markup";
