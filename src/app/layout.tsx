import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteBrandColor, siteDescription, siteName, siteOgImagePath, siteUrl } from "@/lib/public-site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  category: "technology",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon", type: "image/png", sizes: "32x32" },
      { url: "/icon", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: siteName,
    description: siteDescription,
    siteName,
    type: "website",
    url: siteUrl,
    images: [
      {
        url: siteOgImagePath,
        width: 1200,
        height: 630,
        alt: `${siteName} social preview`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: [siteOgImagePath],
  },
  other: {
    "theme-color": siteBrandColor,
  },
};

export const viewport: Viewport = {
  themeColor: siteBrandColor,
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[#f8fafc] text-slate-950">{children}</body>
    </html>
  );
}
