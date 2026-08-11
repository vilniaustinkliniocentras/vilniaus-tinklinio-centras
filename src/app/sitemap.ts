import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/constants";
import { seoConfig } from "@/lib/seo/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return seoConfig.publicRoutes.map((path) => ({
    url: path === "/" ? siteConfig.url : `${siteConfig.url}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
