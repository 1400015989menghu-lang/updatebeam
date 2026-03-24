import type { MetadataRoute } from "next";
import { listPublicSourceRouteEntries, listPublicUpdateRouteEntries } from "@/lib/monitoring-service";
import { absoluteUrl } from "@/lib/seo";
import { publicRoutes, publicUseCasePages } from "@/lib/public-site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [sources, updates] = await Promise.all([
    listPublicSourceRouteEntries(),
    listPublicUpdateRouteEntries(),
  ]);
  const routes = [
    ...publicRoutes,
    ...publicUseCasePages.map((page) => `/use-cases/${page.slug}`),
    ...sources.map((source) => `/sources/${source.slug}`),
    ...updates.map((update) => `/updates/${update.sourceSlug}/${update.slug}`),
  ];
  const lastModifiedByRoute = new Map<string, Date>();

  sources.forEach((source) => {
    lastModifiedByRoute.set(`/sources/${source.slug}`, source.lastModified);
  });

  updates.forEach((update) => {
    lastModifiedByRoute.set(`/updates/${update.sourceSlug}/${update.slug}`, update.lastModified);
  });

  return routes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: lastModifiedByRoute.get(route) || new Date(),
    changeFrequency:
      route === "/" || route === "/sources" ? "weekly" : "monthly",
    priority:
      route === "/" ? 1
        : route === "/sources" ? 0.9
          : route.startsWith("/sources/") ? 0.85
            : route.startsWith("/updates/") ? 0.8
              : route.startsWith("/use-cases/") ? 0.82
                : 0.7,
  }));
}
