import { store } from "../lib/storage.mjs";
import { catalog, verify } from "../lib/catalog.mjs";
import { day } from "../lib/core.mjs";
export default async () => {
  const db = store();
  const date = day();
  if (await db.get(`editions/${date}`)) return;
  const { blobs } = await db.list({ prefix: "editions/" });
  const recent = await Promise.all(
    blobs
      .map((b) => b.key)
      .sort()
      .reverse()
      .slice(0, 30)
      .map((k) => db.get(k, { type: "json" })),
  );
  const lastUsed = (id) => recent.find((e) => e?.id === id)?.date || "";
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const candidates = catalog
    .filter((c) => lastUsed(c.id) < cutoff)
    .sort((a, b) => lastUsed(a.id).localeCompare(lastUsed(b.id)));
  // Parallel bounded requests keep the scheduled function below its 30-second limit.
  const [offers, quote] = await Promise.all([
    Promise.allSettled(candidates.map(verify)),
    fetch("https://api.coinbase.com/v2/exchange-rates?currency=BTC", {
      signal: AbortSignal.timeout(10000),
    }).then(async (r) => {
      if (!r.ok) throw new Error("Quote unavailable");
      return r.json();
    }),
  ]);
  const item = offers.find((r) => r.status === "fulfilled")?.value;
  const rate = Number(quote.data?.rates?.USD);
  if (!item || !Number.isFinite(rate) || rate <= 0) {
    console.warn("No verified candidate or valid quote. No edition published.");
    return;
  }
  await db.setJSON(
    `editions/${date}`,
    { ...item, date, rate, quoteAt: new Date().toISOString() },
    { onlyIfNew: true },
  );
};
export const config = { schedule: "0 6 * * *" };
