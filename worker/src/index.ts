export interface Env {
  DB: KVNamespace;
  ALLOWED_ORIGIN: string;
}

// ── Types (mirrors src/types/index.ts) ────────────────────────────────────────

interface TikTokProduct {
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

type WholesalePlatform =
  | "Alibaba" | "AliExpress" | "DHgate" | "Made-in-China"
  | "Global Sources" | "IndiaMart" | "Faire" | "Tundra";

interface WholesaleSource {
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

interface PLAnalysis {
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

// ── P&L calculation ────────────────────────────────────────────────────────────

function calculatePL(source: WholesaleSource, sellPrice: number): PLAnalysis {
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
    sourceId: source.id, unitCost: source.unitPrice, shippingPerUnit: source.shippingCostPerUnit,
    importDuty, landedCost, sellPrice, grossProfit, grossMarginPct, markup,
    breakEvenUnits, roi, moqInvestment, moqRevenue, moqProfit,
  };
}

// ── Seed data ──────────────────────────────────────────────────────────────────

const SEED_PRODUCTS: TikTokProduct[] = [
  { id: "p1", name: "LED Cloud Night Light", category: "Home Decor", tiktokViews: 48200000, tiktokHashtag: "#cloudlight", tiktokSellPrice: 29.99, imageUrl: "", trending: true, addedAt: "2026-06-01" },
  { id: "p2", name: "Magnetic Eyelashes Kit", category: "Beauty", tiktokViews: 31500000, tiktokHashtag: "#magneticlashes", tiktokSellPrice: 19.99, imageUrl: "", trending: true, addedAt: "2026-06-02" },
  { id: "p3", name: "Insulated Water Bottle 40oz", category: "Fitness", tiktokViews: 22800000, tiktokHashtag: "#stanleydupe", tiktokSellPrice: 24.99, imageUrl: "", trending: true, addedAt: "2026-06-03" },
  { id: "p4", name: "Portable Blender", category: "Kitchen", tiktokViews: 19700000, tiktokHashtag: "#portableblender", tiktokSellPrice: 34.99, imageUrl: "", trending: true, addedAt: "2026-06-04" },
  { id: "p5", name: "Silicone Ice Cube Tray (Large)", category: "Kitchen", tiktokViews: 15400000, tiktokHashtag: "#icecubetray", tiktokSellPrice: 12.99, imageUrl: "", trending: false, addedAt: "2026-06-05" },
  { id: "p6", name: "Gua Sha Face Tool Set", category: "Beauty", tiktokViews: 27300000, tiktokHashtag: "#guasha", tiktokSellPrice: 22.99, imageUrl: "", trending: true, addedAt: "2026-06-06" },
  { id: "p7", name: "RGB Gaming LED Strip Lights", category: "Home Decor", tiktokViews: 36100000, tiktokHashtag: "#ledstrip", tiktokSellPrice: 18.99, imageUrl: "", trending: true, addedAt: "2026-06-07" },
  { id: "p8", name: "Electric Scalp Massager", category: "Beauty", tiktokViews: 11200000, tiktokHashtag: "#scalpmassager", tiktokSellPrice: 27.99, imageUrl: "", trending: false, addedAt: "2026-06-08" },
];

const SEED_SOURCES: WholesaleSource[] = [
  { id: "s1a", productId: "p1", platform: "Alibaba", supplierName: "Shenzhen LightCo", unitPrice: 4.2, moq: 50, currency: "USD", link: "https://www.alibaba.com", shippingCostPerUnit: 1.1, importDutyPct: 5, leadTimeDays: 18, rating: 4.8, inStock: true },
  { id: "s1b", productId: "p1", platform: "DHgate", supplierName: "CloudLux Factory", unitPrice: 5.1, moq: 20, currency: "USD", link: "https://www.dhgate.com", shippingCostPerUnit: 1.4, importDutyPct: 5, leadTimeDays: 22, rating: 4.5, inStock: true },
  { id: "s1c", productId: "p1", platform: "AliExpress", supplierName: "Dream Lights Store", unitPrice: 6.3, moq: 5, currency: "USD", link: "https://www.aliexpress.com", shippingCostPerUnit: 1.8, importDutyPct: 5, leadTimeDays: 25, rating: 4.6, inStock: true },
  { id: "s2a", productId: "p2", platform: "Alibaba", supplierName: "BeautyPro Wholesale", unitPrice: 1.8, moq: 100, currency: "USD", link: "https://www.alibaba.com", shippingCostPerUnit: 0.5, importDutyPct: 6.5, leadTimeDays: 15, rating: 4.9, inStock: true },
  { id: "s2b", productId: "p2", platform: "Made-in-China", supplierName: "Lash Kingdom", unitPrice: 2.1, moq: 50, currency: "USD", link: "https://www.made-in-china.com", shippingCostPerUnit: 0.6, importDutyPct: 6.5, leadTimeDays: 20, rating: 4.4, inStock: true },
  { id: "s2c", productId: "p2", platform: "Faire", supplierName: "Glam Essentials", unitPrice: 4.5, moq: 12, currency: "USD", link: "https://www.faire.com", shippingCostPerUnit: 0.8, importDutyPct: 0, leadTimeDays: 7, rating: 4.7, inStock: false },
  { id: "s3a", productId: "p3", platform: "Alibaba", supplierName: "HydroFactory Ningbo", unitPrice: 5.5, moq: 100, currency: "USD", link: "https://www.alibaba.com", shippingCostPerUnit: 1.5, importDutyPct: 3.4, leadTimeDays: 20, rating: 4.7, inStock: true },
  { id: "s3b", productId: "p3", platform: "Global Sources", supplierName: "StainlessPro Exports", unitPrice: 6.2, moq: 50, currency: "USD", link: "https://www.globalsources.com", shippingCostPerUnit: 1.6, importDutyPct: 3.4, leadTimeDays: 18, rating: 4.6, inStock: true },
  { id: "s4a", productId: "p4", platform: "Alibaba", supplierName: "BlendTech Manufacturing", unitPrice: 7.8, moq: 50, currency: "USD", link: "https://www.alibaba.com", shippingCostPerUnit: 2.1, importDutyPct: 3.7, leadTimeDays: 22, rating: 4.8, inStock: true },
  { id: "s4b", productId: "p4", platform: "DHgate", supplierName: "JuiceMaster Pro", unitPrice: 9.2, moq: 20, currency: "USD", link: "https://www.dhgate.com", shippingCostPerUnit: 2.4, importDutyPct: 3.7, leadTimeDays: 18, rating: 4.5, inStock: true },
  { id: "s5a", productId: "p5", platform: "Alibaba", supplierName: "SiliconeMolds Co", unitPrice: 0.9, moq: 200, currency: "USD", link: "https://www.alibaba.com", shippingCostPerUnit: 0.4, importDutyPct: 3.3, leadTimeDays: 14, rating: 4.6, inStock: true },
  { id: "s5b", productId: "p5", platform: "Tundra", supplierName: "KitchenPlus Wholesale", unitPrice: 2.8, moq: 24, currency: "USD", link: "https://www.tundra.com", shippingCostPerUnit: 0.6, importDutyPct: 0, leadTimeDays: 5, rating: 4.3, inStock: true },
  { id: "s6a", productId: "p6", platform: "Alibaba", supplierName: "JadeCraft Workshop", unitPrice: 2.4, moq: 100, currency: "USD", link: "https://www.alibaba.com", shippingCostPerUnit: 0.6, importDutyPct: 4.2, leadTimeDays: 16, rating: 4.9, inStock: true },
  { id: "s6b", productId: "p6", platform: "IndiaMart", supplierName: "Natural Stone Exports", unitPrice: 3.1, moq: 50, currency: "USD", link: "https://www.indiamart.com", shippingCostPerUnit: 0.9, importDutyPct: 4.2, leadTimeDays: 21, rating: 4.4, inStock: true },
  { id: "s7a", productId: "p7", platform: "Alibaba", supplierName: "LEDWorld Shenzhen", unitPrice: 2.6, moq: 100, currency: "USD", link: "https://www.alibaba.com", shippingCostPerUnit: 0.8, importDutyPct: 3.9, leadTimeDays: 15, rating: 4.8, inStock: true },
  { id: "s7b", productId: "p7", platform: "AliExpress", supplierName: "RGB Masters", unitPrice: 3.5, moq: 10, currency: "USD", link: "https://www.aliexpress.com", shippingCostPerUnit: 1.0, importDutyPct: 3.9, leadTimeDays: 20, rating: 4.6, inStock: true },
  { id: "s8a", productId: "p8", platform: "Alibaba", supplierName: "WellnessGadgets Factory", unitPrice: 4.8, moq: 50, currency: "USD", link: "https://www.alibaba.com", shippingCostPerUnit: 1.2, importDutyPct: 3.7, leadTimeDays: 18, rating: 4.7, inStock: true },
  { id: "s8b", productId: "p8", platform: "Made-in-China", supplierName: "HealthTech Exports", unitPrice: 5.3, moq: 30, currency: "USD", link: "https://www.made-in-china.com", shippingCostPerUnit: 1.3, importDutyPct: 3.7, leadTimeDays: 22, rating: 4.5, inStock: false },
];

// ── KV helpers ─────────────────────────────────────────────────────────────────

async function getProducts(db: KVNamespace): Promise<TikTokProduct[]> {
  const raw = await db.get("products");
  if (!raw) {
    await db.put("products", JSON.stringify(SEED_PRODUCTS));
    return SEED_PRODUCTS;
  }
  return JSON.parse(raw);
}

async function getSources(db: KVNamespace): Promise<WholesaleSource[]> {
  const raw = await db.get("sources");
  if (!raw) {
    await db.put("sources", JSON.stringify(SEED_SOURCES));
    return SEED_SOURCES;
  }
  return JSON.parse(raw);
}

function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ── CORS ───────────────────────────────────────────────────────────────────────

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}

function err(message: string, status: number, cors: Record<string, string>): Response {
  return json({ error: message }, status, cors);
}

// ── Request router ─────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(env.ALLOWED_ORIGIN ?? "*");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";
    const method = request.method;

    // GET /api/health
    if (path === "/api/health" && method === "GET") {
      return json({ status: "ok", ts: Date.now() }, 200, cors);
    }

    // GET /api/products
    // Returns all products with their sources and computed P&L
    if (path === "/api/products" && method === "GET") {
      const [products, sources] = await Promise.all([
        getProducts(env.DB),
        getSources(env.DB),
      ]);
      const result = products.map((p) => ({
        ...p,
        sources: sources
          .filter((s) => s.productId === p.id)
          .map((s) => ({ ...s, pl: calculatePL(s, p.tiktokSellPrice) })),
      }));
      return json(result, 200, cors);
    }

    // POST /api/products
    // Body: Omit<TikTokProduct, "id" | "addedAt">
    if (path === "/api/products" && method === "POST") {
      let body: Partial<TikTokProduct>;
      try { body = await request.json(); } catch { return err("Invalid JSON", 400, cors); }

      if (!body.name || !body.category) {
        return err("name and category are required", 400, cors);
      }

      const products = await getProducts(env.DB);
      const product: TikTokProduct = {
        id: newId("p"),
        name: body.name,
        category: body.category,
        tiktokViews: body.tiktokViews ?? 0,
        tiktokHashtag: body.tiktokHashtag ?? "",
        tiktokSellPrice: body.tiktokSellPrice ?? 0,
        imageUrl: body.imageUrl ?? "",
        trending: body.trending ?? false,
        addedAt: new Date().toISOString().slice(0, 10),
      };

      products.push(product);
      await env.DB.put("products", JSON.stringify(products));
      return json(product, 201, cors);
    }

    // GET /api/products/:id
    const productMatch = path.match(/^\/api\/products\/([^/]+)$/);
    if (productMatch) {
      const id = productMatch[1];

      if (method === "GET") {
        const [products, sources] = await Promise.all([
          getProducts(env.DB),
          getSources(env.DB),
        ]);
        const product = products.find((p) => p.id === id);
        if (!product) return err("Product not found", 404, cors);
        return json({
          ...product,
          sources: sources
            .filter((s) => s.productId === id)
            .map((s) => ({ ...s, pl: calculatePL(s, product.tiktokSellPrice) })),
        }, 200, cors);
      }

      // PUT /api/products/:id  — update sell price (and other fields)
      if (method === "PUT") {
        let body: Partial<TikTokProduct>;
        try { body = await request.json(); } catch { return err("Invalid JSON", 400, cors); }

        const products = await getProducts(env.DB);
        const idx = products.findIndex((p) => p.id === id);
        if (idx === -1) return err("Product not found", 404, cors);

        products[idx] = { ...products[idx], ...body, id };
        await env.DB.put("products", JSON.stringify(products));
        return json(products[idx], 200, cors);
      }

      // DELETE /api/products/:id
      if (method === "DELETE") {
        const [products, sources] = await Promise.all([
          getProducts(env.DB),
          getSources(env.DB),
        ]);
        const filtered = products.filter((p) => p.id !== id);
        if (filtered.length === products.length) return err("Product not found", 404, cors);
        const filteredSources = sources.filter((s) => s.productId !== id);
        await Promise.all([
          env.DB.put("products", JSON.stringify(filtered)),
          env.DB.put("sources", JSON.stringify(filteredSources)),
        ]);
        return json({ deleted: id }, 200, cors);
      }
    }

    // POST /api/products/:id/sources
    const sourceMatch = path.match(/^\/api\/products\/([^/]+)\/sources$/);
    if (sourceMatch && method === "POST") {
      const productId = sourceMatch[1];
      let body: Partial<WholesaleSource>;
      try { body = await request.json(); } catch { return err("Invalid JSON", 400, cors); }

      if (!body.platform || !body.supplierName) {
        return err("platform and supplierName are required", 400, cors);
      }

      const [products, sources] = await Promise.all([
        getProducts(env.DB),
        getSources(env.DB),
      ]);
      if (!products.find((p) => p.id === productId)) {
        return err("Product not found", 404, cors);
      }

      const source: WholesaleSource = {
        id: newId("s"),
        productId,
        platform: body.platform as WholesalePlatform,
        supplierName: body.supplierName,
        unitPrice: body.unitPrice ?? 0,
        moq: body.moq ?? 1,
        currency: body.currency ?? "USD",
        link: body.link ?? "",
        shippingCostPerUnit: body.shippingCostPerUnit ?? 0,
        importDutyPct: body.importDutyPct ?? 0,
        leadTimeDays: body.leadTimeDays ?? 0,
        rating: body.rating ?? 0,
        inStock: body.inStock ?? true,
      };

      sources.push(source);
      await env.DB.put("sources", JSON.stringify(sources));

      const product = products.find((p) => p.id === productId)!;
      return json({ ...source, pl: calculatePL(source, product.tiktokSellPrice) }, 201, cors);
    }

    // DELETE /api/sources/:id
    const delSourceMatch = path.match(/^\/api\/sources\/([^/]+)$/);
    if (delSourceMatch && method === "DELETE") {
      const id = delSourceMatch[1];
      const sources = await getSources(env.DB);
      const filtered = sources.filter((s) => s.id !== id);
      if (filtered.length === sources.length) return err("Source not found", 404, cors);
      await env.DB.put("sources", JSON.stringify(filtered));
      return json({ deleted: id }, 200, cors);
    }

    // POST /api/reset  — re-seed from defaults (useful for dev)
    if (path === "/api/reset" && method === "POST") {
      await Promise.all([
        env.DB.put("products", JSON.stringify(SEED_PRODUCTS)),
        env.DB.put("sources", JSON.stringify(SEED_SOURCES)),
      ]);
      return json({ reset: true }, 200, cors);
    }

    return err("Not found", 404, cors);
  },
};
