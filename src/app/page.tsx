import PriceDisplay from "./directory/PriceDisplay";
import { getMarketData } from "../services/utils";
import GoogleAnalytics from "./Analytics/GoogleAnalytics";

// Refresh server-rendered prices rather than freezing them at deployment time.
export const revalidate = 60;

export default async function Home() {
  const initialData = await getMarketData();
  return (
    <>
      <GoogleAnalytics />
      <main className="min-h-screen p-3 md:p-12">
        <div className="mx-auto w-full max-w-5xl font-mono text-sm">
          <PriceDisplay initialData={initialData} />
        </div>
      </main>
    </>
  );
}
