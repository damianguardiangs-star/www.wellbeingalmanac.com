import type { Metadata } from "next";
import IntelDashboard from "@/components/intel/IntelDashboard";

export const metadata: Metadata = {
  title: "24/7 Gap Intel — Indonesia, Thailand, Laos, Cambodia & Vietnam",
  description:
    "Live open-source intelligence: weather, crime, security, politics, geopolitics, commodities, shipping, student safety and more, fused by 100 cooperating agents.",
};

export default function Home() {
  return <IntelDashboard />;
}
