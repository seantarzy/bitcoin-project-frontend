import Head from "next/head";
import PriceDisplay from "./directory/PriceDisplay";
import { getBitCoinPrice, getBitcoinStockChartData } from "../services/utils";
import { CoinBaseResponse } from "../services/utils";
import { addCommas } from "../services/helperFunctions";
import moment from "moment";
import GoogleAnalytics from "./Analytics/GoogleAnalytics";

const Home = async () => {
  const bitcoinPriceResponse = await getBitCoinPrice();
  const bitcoinStockData = await getBitcoinStockChartData();

  const bitcoinInUSD = parseFloat(bitcoinPriceResponse.data.rates["USD"]);
  const priceNowString = addCommas(bitcoinInUSD.toFixed(2));
  const sortedData: any[] = [];
  let count = 0;

  for (let date in bitcoinStockData.bpi) {
    sortedData.push({
      d: moment(date).format("MMM DD"),
      p: bitcoinStockData.bpi[date].toLocaleString(),
      x: count,
      y: bitcoinStockData.bpi[date]
    });
    count++;
  }

  return (
    <>
      <Head>
        <title>Bitcoin Price Dashboard</title>
        <meta
          name="description"
          content="Get the latest Bitcoin price and trends. Find out how much your Bitcoins are worth in various currencies and explore investment opportunities."
        />
        <meta
          name="keywords"
          content="Bitcoin, Bitcoin Price, Cryptocurrency, BTC, Bitcoin Dashboard, Crypto Prices, Investment, Bitcoin Trends"
        />
        <meta name="author" content="Your Name or Company" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://whatsbitcoinsprice.com/" />
        <meta property="og:title" content="Bitcoin Price Dashboard" />
        <meta
          property="og:description"
          content="Get the latest Bitcoin price and trends. Find out how much your Bitcoins are worth in various currencies and explore investment opportunities."
        />
        <meta
          property="og:image"
          content="https://whatsbitcoinsprice.com/public/assets/bitcoin-coin.png.png"
        />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Bitcoin Price Dashboard" />
        <meta
          property="twitter:description"
          content="Get the latest Bitcoin price and trends. Find out how much your Bitcoins are worth in various currencies and explore investment opportunities."
        />
        <meta property="twitter:image" />

        <link rel="icon" href="/favicon.ico" />
      </Head>
      <GoogleAnalytics />
      <main className="flex min-h-screen flex-col items-center justify-between p-0 md:p-12">
        <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
          <PriceDisplay
            initialPrice={priceNowString}
            initialBitcoinInUSD={bitcoinInUSD}
            initialSortedData={sortedData}
          />
        </div>
      </main>
    </>
  );
};

export default Home;
