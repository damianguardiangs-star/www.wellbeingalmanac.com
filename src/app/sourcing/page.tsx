import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "TikTok Sourcing Hub — Find & Profit from Trending Products",
  description: "Discover trending TikTok products, find wholesale sources, calculate landed cost, markup, and P&L in one dashboard.",
};

export default function SourcingPage() {
  return <Dashboard />;
}
