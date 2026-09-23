import { getDailyEdition } from "@/services/daily";
import { getMarketData } from "../services/utils";
import GoogleAnalytics from "./Analytics/GoogleAnalytics";
import PurchasingPower from "./components/PurchasingPower";
export const revalidate = 60;
export default async function Home() {
  const [market, edition] = await Promise.all([
    getMarketData(),
    getDailyEdition(),
  ]);
  return (
    <>
      <GoogleAnalytics />
      <PurchasingPower initialData={market} dailyEdition={edition} />
    </>
  );
}
