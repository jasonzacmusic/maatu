import type { MetadataRoute } from "next";
import { LANGS, SITE_URL, SLUGS, learnPath } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date("2026-11-03");
  return [
    { url: SITE_URL, lastModified: updated, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/learn`, lastModified: updated, changeFrequency: "monthly", priority: 0.9 },
    ...LANGS.map((code) => ({
      url: `${SITE_URL}${learnPath(code)}`,
      lastModified: updated,
      changeFrequency: "monthly" as const,
      priority: 0.9,
      images: [`${SITE_URL}/og/${SLUGS[code]}.png`],
    })),
    { url: `${SITE_URL}/about`, lastModified: updated, changeFrequency: "monthly", priority: 0.7 },
  ];
}
