import firstEdition from "@/data/first-edition.json";
import DailyBitcoin, { type Edition } from "../components/DailyBitcoin";
import GoogleAnalytics from "../Analytics/GoogleAnalytics";
export const revalidate = 60;
export const metadata = {
  title: "The Daily Bitcoin · Real things. Bitcoin prices.",
  description:
    "One surprising real-world find. Verified listing prices, Bitcoin comparisons, and a daily dose of possibility.",
  openGraph: {
    title: "The Daily Bitcoin",
    description: "Real listings. Surprising possibilities. One find at a time.",
    url: "https://whatsbitcoinsprice.com/daily",
  },
  twitter: { card: "summary_large_image" as const, title: "The Daily Bitcoin" },
};
export default async function DailyPage() {
  let edition: Edition = firstEdition;
  try {
    const response = await fetch(
      "https://whatsbitcoinsprice.com/.netlify/functions/daily-feed",
      { next: { revalidate: 60 }, signal: AbortSignal.timeout(4000) },
    );
    if (response.ok) {
      const data = await response.json();
      if (data.editions?.length) edition = data.editions[0];
    }
  } catch {
    /* Dated launch snapshot remains explicitly labeled when feed is unavailable. */
  }
  return (
    <>
      <GoogleAnalytics />
      <DailyBitcoin initialEdition={edition} />
    </>
  );
}
