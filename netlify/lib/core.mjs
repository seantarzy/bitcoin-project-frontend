import { createHash, randomBytes } from "node:crypto";
export const origin = "https://whatsbitcoinsprice.com";
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const token = () => randomBytes(32).toString("hex");
export const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function preferences(body) {
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const btc = body.btc === "" || body.btc == null ? 1 : Number(body.btc);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new Error("Enter a valid email address.");
  if (
    !Number.isFinite(btc) ||
    btc <= 0 ||
    btc > 21000000 ||
    btc !== Number(btc.toFixed(8))
  )
    throw new Error("Choose a positive BTC amount with up to 8 decimals.");
  if (!["daily", "weekly"].includes(body.frequency))
    throw new Error("Choose daily or weekly.");
  return { email, btc, frequency: body.frequency };
}
export function conversion(btc, rate, cents) {
  if (![btc, rate, cents].every((n) => Number.isFinite(n) && n > 0))
    throw new Error("Invalid price");
  return {
    units: Math.floor((btc * rate * 100) / cents),
    btcPrice: cents / 100 / rate,
  };
}
export const day = () => new Date().toISOString().slice(0, 10);
export const ready = () =>
  Boolean(
    process.env.CONTEXT === "production" &&
    process.env.RESEND_WEBHOOK_SECRET &&
    process.env.RESEND_API_KEY &&
    process.env.NEWSLETTER_FROM &&
    process.env.NEWSLETTER_POSTAL_ADDRESS,
  );
export function due(subscriber, date) {
  return (
    subscriber.status === "confirmed" &&
    (subscriber.frequency === "daily" ||
      new Date(date + "T12:00:00Z").getUTCDay() === 0)
  );
}
