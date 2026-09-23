import { getMarketData } from "../services/utils";
import GoogleAnalytics from "./Analytics/GoogleAnalytics";
import PurchasingPower from "./components/PurchasingPower";
export const revalidate = 60;
export default async function Home() {
  return (
    <>
      <GoogleAnalytics />
      <PurchasingPower initialData={await getMarketData()} />
    </>
  );
}
