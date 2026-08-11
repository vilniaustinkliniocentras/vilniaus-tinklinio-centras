import type { Metadata } from "next";
import { seoConfig, siteConfig } from "@/lib/seo/config";

const sharedOpenGraph = {
  locale: "lt_LT" as const,
  type: "website" as const,
  siteName: siteConfig.name,
  images: [
    {
      url: seoConfig.ogImage.url,
      alt: seoConfig.ogImage.alt,
    },
  ],
};

const sharedTwitter = {
  card: "summary_large_image" as const,
  images: [seoConfig.ogImage.url],
};

export const rootMetadata: Metadata = {
  title: {
    default: seoConfig.defaultTitle,
    template: `%s | ${siteConfig.name}`,
  },
  description: seoConfig.defaultDescription,
  keywords: [...seoConfig.keywords],
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    ...sharedOpenGraph,
    title: seoConfig.openGraph.title,
    description: seoConfig.openGraph.description,
    url: siteConfig.url,
  },
  twitter: {
    ...sharedTwitter,
    title: seoConfig.openGraph.title,
    description: seoConfig.openGraph.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export function createPageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  openGraphTitle,
  openGraphDescription,
}: {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  openGraphTitle?: string;
  openGraphDescription?: string;
}): Metadata {
  const canonicalPath = path === "/" ? "/" : path;
  const pageUrl = `${siteConfig.url}${canonicalPath === "/" ? "" : canonicalPath}`;
  const ogTitle = openGraphTitle ?? title;
  const ogDescription = openGraphDescription ?? description;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      ...sharedOpenGraph,
      title: ogTitle,
      description: ogDescription,
      url: pageUrl,
    },
    twitter: {
      ...sharedTwitter,
      title: ogTitle,
      description: ogDescription,
    },
  };
}
