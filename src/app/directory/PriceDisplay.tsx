"use client";
import React, { Suspense, useEffect, useState } from "react";
import moment from "moment";
import {
  CoinBaseResponse,
  getBitCoinPrice,
  getBitcoinStockChartData
} from "../../services/utils";
import Select from "react-select";
import Currencies, { Currency } from "../currencies";
import LineChart from "../LineChart";
import InfoBox from "../InfoBox";
import ToolTip from "../ToolTip";
import House from "../House";
import { addCommas } from "../../services/helperFunctions";
import * as getHouses from "../../pages/api/houses";
import { motion } from "framer-motion";
import { ActivePoint } from "../types";

const usStates = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" }
];

interface PriceDisplayProps {
  initialPrice: string;
  initialBitcoinInUSD: number;
  initialSortedData: any[];
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  initialPrice,
  initialBitcoinInUSD,
  initialSortedData
}) => {
  const [itemOfTheDay, setItemOfTheDay] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [currencyChosen, setCurrencyChosen] = useState("USD");
  const [currencyDisplayed, setCurrencyDisplayed] = useState("US Dollars");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [flippingCoin, setFlippingCoin] = useState(true);
  const [articles, setArticles] = useState([]);
  const [mobile, setMobile] = useState<boolean>(false);
  const [bitcoinInUSD, setBitcoinInUSD] = useState<number | null>(
    initialBitcoinInUSD
  );
  const [amazonProducts, setAmazonProducts] = useState([]);
  const [sortedData, setSortedData] = useState(initialSortedData);
  const [fetchingData, setFetchingData] = useState(false);
  const [priceNow, setPriceNow] = useState<string | null>(initialPrice);
  const [fullListOfHouses, setFullListOfHouses] = useState([]);
  const [houses, setHouses] = useState([]);
  const [hoverLoc, setHoverLoc] = useState<number | null>(null);
  const [activePoint, setActivePoint] = useState<ActivePoint | null>(null);
  const [cutoffHouseIndex, setCutoffHouseIndex] = useState(0);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [bitcoins, setBitcoins] = useState<number>(0);

  const handleChartHover = (hoverLoc: number, activePoint: ActivePoint) => {
    setHoverLoc(hoverLoc);
    setActivePoint(activePoint);
  };

  const handleSelect = (e: any) => {
    setCurrencyChosen(e.value);
    getBitCoinPriceByCurrentCurrency(e.value);
  };

  const getBitCoinPriceByCurrentCurrency = (currency: string = "USD") => {
    getBitCoinPrice()
      .then((resp: CoinBaseResponse) => {
        let bitcoinInUSD = null;
        if (resp.data.currency === "BTC") {
          bitcoinInUSD = resp.data.rates["USD"];
          const bitcointUSDNum = parseFloat(bitcoinInUSD);
          setBitcoinInUSD(bitcointUSDNum);
        }
        const price = resp.data.rates[currency];
        if (price) {
          const priceFloat = parseFloat(price);
          const roundedPrice = priceFloat.toFixed(2);
          const priceNowString = addCommas(roundedPrice);
          setPriceNow(priceNowString);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const fetchHouses = async () => {
    if (!selectedState || bitcoins <= 0) return;

    const priceInUSD = bitcoinInUSD ? bitcoinInUSD * bitcoins : 0;
    const response = await fetch(
      `https://api.bridgedataoutput.com/api/v2/OData/dataset_id/Properties?access_token=YOUR_ACCESS_TOKEN&$filter=ListPrice lt ${priceInUSD} and State eq '${selectedState}'`
    );
    const data = await response.json();
    setHouses(data.value);
  };

  useEffect(() => {
    getBitCoinPriceByCurrentCurrency();
    let sortedData: any = [];
    getBitcoinStockChartData().then((bitcoinData) => {
      let count = 0;
      for (let date in bitcoinData.bpi) {
        sortedData.push({
          d: moment(date).format("MMM DD"),
          p: bitcoinData.bpi[date].toLocaleString(),
          x: count,
          y: bitcoinData.bpi[date]
        });
        count++;
      }
      setSortedData(sortedData);
      setFetchingData(false);
    });

    if (window.innerWidth <= 760) {
      setMobile(true);
    }

    getBitCoinPrice();
    // if (articles.length == 0) {
    //   getArticles().then((articles) => {
    //     setArticles(articles.articles);
    //   });
    // }
  }, []);

  const showMoreHouses = () => {
    setCutoffHouseIndex(cutoffHouseIndex + 10);
  };

  const showLessHouses = () => {
    setCutoffHouseIndex(cutoffHouseIndex - 10);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-4 bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 rounded-lg shadow-lg backdrop-blur-md"
    >
      <motion.h1
        className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500"
        animate={{ y: [50, 0], opacity: [0, 1] }}
        transition={{ duration: 0.5 }}
      >
        What's Bitcoin's Price?
      </motion.h1>
      <h2 className="text-2xl font-semibold text-center text-teal-300">
        The one million dollar question
      </h2>
      <div className="picker-container text-center my-4">
        <span className="block text-lg mb-2">
          Currency: {currencyDisplayed}
        </span>
        <Select
          className="currency-picker"
          options={Currencies}
          onChange={handleSelect}
          placeholder="Select Currency"
          styles={{
            control: (base) => ({
              ...base,
              backgroundColor: "transparent",
              borderColor: "#2d3748",
              color: "white"
            }),
            menu: (base) => ({
              ...base,
              backgroundColor: "#2d3748"
            }),
            singleValue: (base) => ({
              ...base,
              color: "white"
            })
          }}
        />
      </div>

      <div className="flex flex-col gap-4 items-center text-center">
        <p className="text-3xl text-teal-400">
          {currencySymbol}
          {priceNow ? priceNow : "Loading..."}
          {" " + currencyChosen}
        </p>
        <p className="text-xl">
          One bitcoin is worth {priceNow} {currencyChosen}s
        </p>
      </div>
      <div className="container mt-8">
        <div className="row mb-4">
          <h1 className="text-2xl font-semibold text-center text-teal-300">
            30 Day Bitcoin Price Chart
          </h1>
        </div>
        <div className="row mb-4">
          {!fetchingData ? <InfoBox data={sortedData} /> : null}
        </div>
        <div className="row mb-4">
          <div className="popup">
            {hoverLoc && activePoint ? (
              <ToolTip hoverLoc={hoverLoc} activePoint={activePoint} />
            ) : null}
          </div>
        </div>
        <div className="row mb-4">
          <div className="chart w-full">
            {!fetchingData ? (
              <LineChart
                data={sortedData}
                onChartHover={(a, b) => {
                  !!a && !!b && handleChartHover(a, b);
                }}
              />
            ) : null}
          </div>
        </div>
        <div className="row mb-4">
          <div id="coindesk" className="text-teal-300 text-center">
            Powered by{" "}
            <a
              className="text-teal-300 hover:text-teal-500"
              href="http://www.coindesk.com/price/"
              target="_blank"
              rel="noopener noreferrer"
            >
              CoinDesk
            </a>
          </div>
        </div>
      </div>
      <div className={`hidden`}>
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-center text-teal-300 mb-4">
            Find Houses You Can Afford with Bitcoin
          </h2>
          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-md">
              <Select
                options={usStates}
                onChange={(e) => setSelectedState(e?.value || null)}
                placeholder="I want to live in..."
                className="mb-4"
              />
            </div>
            <div className="w-full max-w-md">
              <input
                type="number"
                placeholder="I have X amount of Bitcoins"
                value={bitcoins}
                onChange={(e) => setBitcoins(Number(e.target.value))}
                className="w-full p-2 rounded bg-gray-800 text-white"
              />
            </div>
            <button
              onClick={fetchHouses}
              className="bg-teal-400 hover:bg-teal-500 text-gray-900 px-4 py-2 rounded"
            >
              Find Houses
            </button>
          </div>
        </div>

        <div className="house-container mt-8">
          {houses.slice(0, cutoffHouseIndex).map((house: getHouses.House) => (
            <House
              key={house.id}
              {...house}
              bitcoinPrice={bitcoinInUSD}
              city={house.Address.City}
              state={house.Address.State}
            />
          ))}
          {cutoffHouseIndex > 0 ? (
            <div className="flex justify-center gap-4 mt-4">
              <button
                className="bg-teal-400 hover:bg-teal-500 text-gray-900 px-4 py-2 rounded"
                onClick={showMoreHouses}
              >
                Show More Houses
              </button>
              <button
                className="bg-teal-400 hover:bg-teal-500 text-gray-900 px-4 py-2 rounded"
                onClick={showLessHouses}
              >
                Show Less Houses
              </button>
            </div>
          ) : cutoffHouseIndex === 0 ? (
            <button
              className="bg-teal-400 hover:bg-teal-500 text-gray-900 px-4 py-2 rounded mx-auto block"
              onClick={showMoreHouses}
            >
              Show Houses
            </button>
          ) : cutoffHouseIndex === houses.length ? (
            <button
              className="bg-teal-400 hover:bg-teal-500 text-gray-900 px-4 py-2 rounded mx-auto block"
              onClick={showLessHouses}
            >
              Show Less Houses
            </button>
          ) : cutoffHouseIndex === 10 ? (
            <button
              className="bg-teal-400 hover:bg-teal-500 text-gray-900 px-4 py-2 rounded mx-auto block"
              onClick={showLessHouses}
            >
              Hide Houses
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
};

export default PriceDisplay;
