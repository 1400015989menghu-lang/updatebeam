import type { Metadata } from "next";
import { appBaseUrl } from "@/lib/monitoring";
import { siteBrandColor, siteDescription, siteName, siteOgImagePath, siteTagline, siteUrl } from "@/lib/public-site";

export function absoluteUrl(path = "/"): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildMetadata(input: {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
}): Metadata {
  const baseUrl = appBaseUrl();
  const title = input.title;
  const fullTitle = `${input.title} | ${siteName}`;
  const description = input.description || siteDescription;
  const canonical = `${baseUrl}${input.path || ""}`;
  const image = absoluteUrl(siteOgImagePath);

  return {
    applicationName: siteName,
    title,
    description,
    keywords: input.keywords,
    category: "technology",
    alternates: {
      canonical,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      type: "website",
      siteName,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${siteName} social preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    other: {
      "theme-color": siteBrandColor,
      "apple-mobile-web-app-title": siteName,
      "application-name": siteName,
      "og:site_name": siteName,
      "og:locale": "en_US",
      "product:tagline": siteTagline,
    },
  };
}
