import type { Metadata } from "next";
import IntelDashboard from "@/components/intel/IntelDashboard";

export const metadata: Metadata = {
  title: "SEA Intel Swarm — 100-agent watch on Indonesia, Thailand, Laos, Cambodia & Vietnam",
  description:
    "Live open-source intelligence feed: weather, crime, security, politics, geopolitics, commodities, shipping, student safety and more, fused by 100 cooperating agents.",
};

export default function IntelPage() {
  return <IntelDashboard />;
}
