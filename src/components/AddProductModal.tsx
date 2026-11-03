"use client";
import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useStore } from "@/store/useStore";
import { TikTokProduct, WholesaleSource, WholesalePlatform } from "@/types";
import { PLATFORMS } from "@/lib/calculations";

interface Props {
  onClose: () => void;
}

export default function AddProductModal({ onClose }: Props) {
  const { addProduct, addSource, products } = useStore();
  const [step, setStep] = useState<"product" | "source">("product");
  const [newProductId, setNewProductId] = useState("");

  const [product, setProduct] = useState({
    name: "",
    category: "Home Decor",
    tiktokViews: "",
    tiktokHashtag: "",
    tiktokSellPrice: "",
    trending: true,
  });

  const [source, setSource] = useState({
    platform: "Alibaba" as WholesalePlatform,
    supplierName: "",
    unitPrice: "",
    moq: "",
    link: "",
    shippingCostPerUnit: "",
    importDutyPct: "",
    leadTimeDays: "",
    rating: "4.5",
    inStock: true,
  });

  const handleAddProduct = () => {
    if (!product.name || !product.tiktokSellPrice) return;
    const id = `custom-${Date.now()}`;
    setNewProductId(id);
    addProduct({
      id,
      name: product.name,
      category: product.category,
      tiktokViews: Number(product.tiktokViews) || 0,
      tiktokHashtag: product.tiktokHashtag || "#trending",
      tiktokSellPrice: Number(product.tiktokSellPrice),
      imageUrl: "",
      trending: product.trending,
      addedAt: new Date().toISOString().split("T")[0],
    });
    setStep("source");
  };

  const handleAddSource = () => {
    if (!source.supplierName || !source.unitPrice || !newProductId) return;
    addSource({
      id: `cs-${Date.now()}`,
      productId: newProductId,
      platform: source.platform,
      supplierName: source.supplierName,
      unitPrice: Number(source.unitPrice),
      moq: Number(source.moq) || 1,
      currency: "USD",
      link: source.link || "#",
      shippingCostPerUnit: Number(source.shippingCostPerUnit) || 0,
      importDutyPct: Number(source.importDutyPct) || 0,
      leadTimeDays: Number(source.leadTimeDays) || 14,
      rating: Number(source.rating) || 4.5,
      inStock: source.inStock,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {step === "product" ? "Add TikTok Product" : "Add Wholesale Source"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {step === "product" ? (
            <>
              <Field label="Product Name *">
                <input
                  type="text"
                  placeholder="e.g. LED Cloud Night Light"
                  value={product.name}
                  onChange={(e) => setProduct({ ...product, name: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select
                    value={product.category}
                    onChange={(e) => setProduct({ ...product, category: e.target.value })}
                    className={inputCls}
                  >
                    {["Home Decor", "Beauty", "Fitness", "Kitchen", "Tech", "Fashion", "Pets", "Other"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="TikTok Sell Price (£) *">
                  <input
                    type="number"
                    placeholder="29.99"
                    value={product.tiktokSellPrice}
                    onChange={(e) => setProduct({ ...product, tiktokSellPrice: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="TikTok Views">
                  <input
                    type="number"
                    placeholder="1000000"
                    value={product.tiktokViews}
                    onChange={(e) => setProduct({ ...product, tiktokViews: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="TikTok Hashtag">
                  <input
                    type="text"
                    placeholder="#cloudlight"
                    value={product.tiktokHashtag}
                    onChange={(e) => setProduct({ ...product, tiktokHashtag: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="trending"
                  checked={product.trending}
                  onChange={(e) => setProduct({ ...product, trending: e.target.checked })}
                  className="accent-pink-500"
                />
                <label htmlFor="trending" className="text-sm text-gray-300">Mark as Trending</label>
              </div>
              <button
                onClick={handleAddProduct}
                disabled={!product.name || !product.tiktokSellPrice}
                className="w-full py-2.5 bg-pink-600 hover:bg-pink-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                Next: Add Wholesale Source
              </button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Platform">
                  <select
                    value={source.platform}
                    onChange={(e) => setSource({ ...source, platform: e.target.value as WholesalePlatform })}
                    className={inputCls}
                  >
                    {PLATFORMS.filter((p) => p !== "All").map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Supplier Name *">
                  <input
                    type="text"
                    placeholder="Supplier Co."
                    value={source.supplierName}
                    onChange={(e) => setSource({ ...source, supplierName: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit Price (USD) *">
                  <input
                    type="number"
                    placeholder="4.20"
                    value={source.unitPrice}
                    onChange={(e) => setSource({ ...source, unitPrice: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="MOQ">
                  <input
                    type="number"
                    placeholder="50"
                    value={source.moq}
                    onChange={(e) => setSource({ ...source, moq: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Shipping / Unit (USD)">
                  <input
                    type="number"
                    placeholder="1.10"
                    value={source.shippingCostPerUnit}
                    onChange={(e) => setSource({ ...source, shippingCostPerUnit: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Import Duty (%)">
                  <input
                    type="number"
                    placeholder="5"
                    value={source.importDutyPct}
                    onChange={(e) => setSource({ ...source, importDutyPct: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Lead Time (days)">
                  <input
                    type="number"
                    placeholder="18"
                    value={source.leadTimeDays}
                    onChange={(e) => setSource({ ...source, leadTimeDays: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Supplier Rating">
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    placeholder="4.5"
                    value={source.rating}
                    onChange={(e) => setSource({ ...source, rating: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Product Link">
                <input
                  type="url"
                  placeholder="https://alibaba.com/product/..."
                  value={source.link}
                  onChange={(e) => setSource({ ...source, link: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="instock"
                  checked={source.inStock}
                  onChange={(e) => setSource({ ...source, inStock: e.target.checked })}
                  className="accent-pink-500"
                />
                <label htmlFor="instock" className="text-sm text-gray-300">Currently In Stock</label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("product")}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleAddSource}
                  disabled={!source.supplierName || !source.unitPrice}
                  className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Add Product
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-gray-900 border border-gray-600 rounded-lg text-sm text-white py-2 px-3 focus:outline-none focus:border-pink-500 placeholder-gray-500";
