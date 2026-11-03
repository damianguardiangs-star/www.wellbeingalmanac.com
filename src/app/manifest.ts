import type { MetadataRoute } from "next";

// Lets "Add to Home Screen" install 24/7 Gap Intel as a full-screen app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "24/7 Gap Intel",
    short_name: "24/7 Intel",
    description: "24/7 open-source intelligence on Indonesia, Thailand, Laos, Cambodia and Vietnam.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#070b12",
    theme_color: "#070b12",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
