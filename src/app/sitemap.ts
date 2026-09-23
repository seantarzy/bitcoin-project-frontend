import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://whatsbitcoinsprice.com/daily",
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: "https://whatsbitcoinsprice.com/",
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://whatsbitcoinsprice.com/price",
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://whatsbitcoinsprice.com/privacy",
      changeFrequency: "monthly",
      priority: 0.2,
    },
  ];
}
