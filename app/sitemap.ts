import type { MetadataRoute } from "next";
import { LANGUAGE_ORDER } from "@/lib/languages";
import { SITE_URL, learnPath } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date("2026-10-09");
  return [
    { url: SITE_URL, lastModified: updated, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/learn`, lastModified: updated, changeFrequency: "monthly", priority: 0.9 },
    ...LANGUAGE_ORDER.map((code) => ({
      url: `${SITE_URL}${learnPath(code)}`,
      lastModified: updated,
      changeFrequency: "monthly" as const,
      priority: 0.9,
      images: [`${SITE_URL}/og/${learnPath(code).split("/").pop()}.png`],
    })),
    { url: `${SITE_URL}/about`, lastModified: updated, changeFrequency: "monthly", priority: 0.7 },
  ];
}
