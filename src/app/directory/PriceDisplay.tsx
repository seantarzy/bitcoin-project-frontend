"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Select from "react-select";
import Currencies from "../currencies";
import LineChart from "../LineChart";
import InfoBox from "../InfoBox";
import { chartData, formatAmount, type MarketData } from "@/services/marketData";

export default function PriceDisplay({ initialData }: { initialData: MarketData }) {
  const [market, setMarket] = useState(initialData);
  const [currency, setCurrency] = useState("USD");
  const [refreshing, setRefreshing] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    const timeout = setTimeout(() => request.abort(), 15000);
    setRefreshing(true);
    try {
      const response = await fetch("/api/market-data", { signal: request.signal, cache: "no-store" });
      if (!response.ok) throw new Error("Refresh failed");
      const next: MarketData = await response.json();
      setMarket(previous => ({
        ...next,
        quote: next.quote ?? previous.quote,
        history: next.historyError ? previous.history : next.history
      }));
    } catch {
      setMarket(previous => ({ ...previous, quoteError: true, historyError: true }));
    } finally {
      clearTimeout(timeout);
      controller.current = null;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Revalidate on arrival as an ISR page may contain an older snapshot.
    void refresh();
    const interval = setInterval(() => { if (!document.hidden) void refresh(); }, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  const price = market.quote?.rates[currency] ?? null;
  const points = chartData(market.history, market.quote?.rates, currency);
  const options = Currencies.filter(option => !market.quote || market.quote.rates[option.value]);
  return (
    <div className="flex flex-col gap-5 rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 p-4 text-white shadow-lg md:p-8">
      <h1 className="text-center text-3xl font-bold text-teal-300 md:text-4xl">What&apos;s Bitcoin&apos;s Price?</h1>
      <p className="text-center text-xl text-teal-200">The one million dollar question</p>
      <div className="mx-auto w-full max-w-sm">
        <label htmlFor="currency" className="mb-2 block">Select currency</label>
        <Select
          inputId="currency" instanceId="currency" options={options}
          value={Currencies.find(option => option.value === currency)}
          onChange={option => { if (option) setCurrency(option.value); }}
          styles={{
            control: base => ({ ...base, backgroundColor: "#1f2937", borderColor: "#64748b" }),
            menu: base => ({ ...base, backgroundColor: "#1f2937" }),
            option: (base, state) => ({ ...base, backgroundColor: state.isFocused || state.isSelected ? "#115e59" : "#1f2937" }),
            input: base => ({ ...base, color: "white" }),
            singleValue: base => ({ ...base, color: "white" })
          }}
        />
      </div>
      <div className="text-center" aria-live="polite">
        <p className="text-3xl text-teal-300">{price === null ? "Price unavailable" : formatAmount(price, currency)}</p>
        <p className="mt-2">{price === null ? "Please try refreshing." : `One bitcoin in ${currency}`}</p>
        {market.quote && <p className="mt-2 text-xs text-gray-300">Rates retrieved {new Date(market.quote.fetchedAt).toISOString().replace("T", " ").replace(".000Z", " UTC")}</p>}
        {market.quoteError && <p role="status" className="mt-2 text-amber-200">{market.quote ? "Price refresh failed. Showing the last retrieved quote." : "Current prices are temporarily unavailable."}</p>}
      </div>
      <div className="text-center">
        <button onClick={() => void refresh()} disabled={refreshing} className="rounded border border-teal-400 px-4 py-2 text-teal-200 disabled:opacity-50">{refreshing ? "Refreshing…" : "Refresh data"}</button>
      </div>
      <h2 className="mt-4 text-center text-2xl font-semibold text-teal-300">30 Day Bitcoin Price Chart</h2>
      <InfoBox currentPrice={market.quoteError || market.historyError ? null : price} baseline={points[0]?.cy} currencyCode={currency} since={market.history[0]?.date} />
      {market.historyError && <p role="status" className="text-center text-amber-200">{points.length ? "History refresh failed. Showing the last retrieved chart." : "Historical prices are temporarily unavailable. Try refreshing."}</p>}
      {points.length ? <LineChart key={currency} data={points} /> : !market.historyError && <p className="text-center">Chart unavailable for this currency.</p>}
      <p className="text-center text-xs text-gray-300">
        Completed daily closes in UTC. {currency !== "USD" && "Converted from USD using the latest retrieved exchange rate; historical FX changes are not included."}
      </p>
      <p className="text-center text-teal-300">Price and historical data from <a className="underline" href="https://www.coinbase.com/price/bitcoin" target="_blank" rel="noopener noreferrer">Coinbase</a>.</p>
    </div>
  );
}
