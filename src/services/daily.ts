import firstEdition from "@/data/first-edition.json";
import type { Edition } from "@/app/components/DailyBitcoin";
export async function getDailyEdition(): Promise<Edition> {
  try {
    const response = await fetch(
      "https://whatsbitcoinsprice.com/.netlify/functions/daily-feed",
      { next: { revalidate: 60 }, signal: AbortSignal.timeout(4000) },
    );
    if (response.ok) {
      const data = await response.json();
      if (data.editions?.length) return data.editions[0];
    }
  } catch {
    /* Keep the dated launch snapshot when the feed is unavailable. */
  }
  return firstEdition;
}
