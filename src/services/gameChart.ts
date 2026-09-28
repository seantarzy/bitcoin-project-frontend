export type PriceTick = { time: number; price: number };
export const DISPLAY_DELAY_MS = 800;
// Interpolate only between received trades. Never extrapolate future prices.
export function priceAt(ticks: PriceTick[], time: number): number | null {
  if (!ticks.length || time < ticks[0].time) return null;
  let lo = 0,
    hi = ticks.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ticks[mid].time <= time) lo = mid;
    else hi = mid - 1;
  }
  const before = ticks[lo],
    after = ticks[lo + 1];
  if (!after || after.time - before.time > 2000) return before.price;
  const fraction = (time - before.time) / (after.time - before.time);
  return before.price + (after.price - before.price) * fraction;
}
export function chartSeries(
  ticks: PriceTick[],
  start: number,
  cutoff: number,
): PriceTick[] {
  if (!ticks.length) return [];
  const end = Math.min(cutoff, ticks[ticks.length - 1].time);
  const first = Math.max(start, ticks[0].time);
  if (end < first) return [];
  const points: PriceTick[] = [];
  for (let time = Math.ceil(first / 100) * 100; time < end; time += 100) {
    const price = priceAt(ticks, time);
    if (price !== null) points.push({ time, price });
  }
  const price = priceAt(ticks, end);
  if (price !== null) points.push({ time: end, price });
  return points;
}
export function challengeScore(raw: string | null | undefined): number | null {
  return raw && /^\d{1,4}$/.test(raw) ? Number(raw) : null;
}
