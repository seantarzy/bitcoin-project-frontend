import { formatAmount, priceChange } from "@/services/marketData";

export default function InfoBox({ currentPrice, baseline, currencyCode, since }: {
  currentPrice: number | null;
  baseline: number | undefined;
  currencyCode: string;
  since: string | undefined;
}) {
  const change = priceChange(currentPrice, baseline);
  return (
    <div className="flex flex-col gap-4 text-center md:flex-row md:justify-center">
      <div className="flex-1 rounded bg-gray-900/50 p-4">
        <p className="text-xl text-teal-300">{change ? formatAmount(change.amount, currencyCode) : "Unavailable"}</p>
        <p className="mt-2 text-sm text-gray-300">Change{since ? ` since ${since}` : " over chart period"} ({currencyCode})</p>
      </div>
      <div className="flex-1 rounded bg-gray-900/50 p-4">
        <p className="text-xl text-teal-300">{change ? `${change.percent > 0 ? "+" : ""}${change.percent.toFixed(2)}%` : "Unavailable"}</p>
        <p className="mt-2 text-sm text-gray-300">Percentage change over chart period</p>
      </div>
    </div>
  );
}
