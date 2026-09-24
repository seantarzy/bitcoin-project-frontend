import { getDailyEdition } from "@/services/daily";
import { getMarketData } from "../services/utils";
import PurchasingPower from "./components/PurchasingPower";
export const revalidate = 60;
export default async function Home() {
  const [market, edition] = await Promise.all([
    getMarketData(),
    getDailyEdition(),
  ]);
  return (
    <>
      <PurchasingPower initialData={market} dailyEdition={edition} />
    </>
  );
}
