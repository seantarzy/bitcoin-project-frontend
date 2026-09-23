// Reviewed editorial candidates. Only this allowlist may be fetched by the publisher.
export const catalog = [
  {
    id: "emotional-support-chicken",
    title: "Emotional Support Chicken",
    merchant: "Archie McPhee",
    url: "https://mcphee.com/products/emotional-support-chicken",
    variant: "31937150025801",
    category: "Everyday absurdities",
    emoji: "🐔",
    headline: "Your portfolio needs emotional support.",
    description:
      "A tiny vest. A very loud squawk. A wonderfully ridiculous way to put Bitcoin into perspective.",
  },
  {
    id: "biggest-and-loudest-rubber-chicken",
    title: "Biggest and Loudest Rubber Chicken",
    merchant: "Archie McPhee",
    url: "https://mcphee.com/products/biggest-and-loudest-rubber-chicken",
    category: "Everyday absurdities",
    emoji: "🐔",
    headline: "Imagine the noise.",
    description:
      "Twenty-two inches of rubber chicken. Now imagine what a whole Bitcoin’s worth would sound like.",
  },
];
export async function verify(item) {
  const response = await fetch(`${item.url}.js`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Merchant unavailable");
  const product = await response.json();
  const variant = product.variants?.find((v) =>
    item.variant ? String(v.id) === item.variant : v.available,
  );
  if (
    !variant?.available ||
    !Number.isInteger(variant.price) ||
    variant.price <= 0
  )
    throw new Error("No available offer");
  const rawImage = variant.featured_image?.src || product.featured_image;
  const imageUrl =
    typeof rawImage === "string" ? new URL(rawImage, item.url).href : undefined;
  if (!imageUrl?.startsWith("https://cdn.shopify.com/s/files/1/1365/2497/")) {
    throw new Error("No trusted product photo");
  }
  return {
    ...item,
    imageUrl,
    variant: String(variant.id),
    priceCents: variant.price,
    currency: "USD",
    verifiedAt: new Date().toISOString(),
    sourceUrl: `${item.url}?variant=${variant.id}`,
  };
}
// Variety in the launch queue; each selection is refreshed from its exact listing.
catalog.push(
  ...[
    [
      "shrimp-string-lights",
      "Shrimp String Lights",
      "🦐",
      "A brighter financial future. With shrimp.",
      "A string of shrimp-shaped lights, priced as one complete retail set.",
    ],
    [
      "emergency-frog",
      "Emergency Frog",
      "🐸",
      "Break glass. Deploy frog.",
      "An emergency frog is a real product. Today, it is also a unit of Bitcoin perspective.",
    ],
    [
      "pickle-string-lights",
      "Pickle String Lights",
      "🥒",
      "A surprisingly well-lit pickle.",
      "One retail set of pickle-shaped lights. Some portfolios are simply more festive than others.",
    ],
    [
      "corkroach-wine-stopper",
      "Corkroach Wine Stopper",
      "🍷",
      "A very questionable dinner guest.",
      "A novelty wine stopper that puts an unexpected spin on keeping things bottled up.",
    ],
    [
      "axolotl-back-scratcher",
      "Axolotl Back Scratcher",
      "🦎",
      "Scratch that. Buy an axolotl.",
      "An axolotl-inspired back scratcher, for an itch your price chart cannot reach.",
    ],
    [
      "jalapeno-candy",
      "Jalapeño Candy in Tin",
      "🌶️",
      "Your portfolio, but spicy.",
      "One tin of jalapeño candy. The comparison counts tins, not individual candies.",
    ],
    [
      "finger-shrimp",
      "Finger Shrimp",
      "🦐",
      "A shrimp-sized perspective shift.",
      "A finger shrimp listing, converted into Bitcoin. Check the listing for its exact package contents.",
    ],
    [
      "meditating-venus-flytrap",
      "Meditating Venus Flytrap",
      "🌱",
      "Even your plant needs a moment.",
      "A meditating plant novelty. Take a breath, then see the price in Bitcoin.",
    ],
  ].map(([id, title, emoji, headline, description]) => ({
    id,
    title,
    emoji,
    headline,
    description,
    merchant: "Archie McPhee",
    url: `https://mcphee.com/products/${id}`,
    category: "Everyday absurdities",
  })),
);
