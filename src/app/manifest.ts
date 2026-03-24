import type { MetadataRoute } from "next";
import { siteBrandColor, siteDescription, siteName } from "@/lib/public-site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: siteName,
    description: siteDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: siteBrandColor,
    categories: ["business", "productivity", "news"],
    lang: "en",
    orientation: "portrait",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Browse sources",
        short_name: "Sources",
        description: "Explore the public sources currently monitored by UpdateBeam.",
        url: "/sources",
      },
      {
        name: "Request a source",
        short_name: "Request",
        description: "Submit a public website your team wants monitored next.",
        url: "/request-a-source",
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  };
}
