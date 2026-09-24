import {
  kitSelected,
  kitReady,
  enrollKit,
  dispatchKitEdition,
} from "../lib/kit.mjs";
import { store, json } from "../lib/storage.mjs";
import {
  day,
  due,
  ready,
  conversion,
  escape,
  origin,
  hash,
} from "../lib/core.mjs";
import { send } from "../lib/mail.mjs";
import { catalog, verify } from "../lib/catalog.mjs";
export default async (request) => {
  if (
    !process.env.NEWSLETTER_JOB_SECRET ||
    request.headers.get("authorization") !==
      `Bearer ${process.env.NEWSLETTER_JOB_SECRET}`
  )
    return json({ error: "Unauthorized" }, 401);
  if (
    kitSelected()
      ? !kitReady()
      : !ready() || process.env.NEWSLETTER_SEND_ENABLED !== "true"
  )
    return;
  const db = store();
  const date = day();
  const edition = await db.get(`editions/${date}`, { type: "json" });
  let verified = false;
  if (edition && Date.now() - Date.parse(edition.verifiedAt) < 86400000) {
    const candidate = catalog.find((c) => c.id === edition.id);
    if (candidate) {
      try {
        const offer = await verify({ ...candidate, variant: edition.variant });
        verified = offer.priceCents === edition.priceCents;
      } catch {
        console.warn(
          "Listing changed or unavailable; skipping edition delivery.",
        );
      }
    }
  }
  const { blobs } = await db.list({ prefix: "subscribers/" });
  if (kitSelected()) {
    for (const blob of blobs) {
      const sub = await db.get(blob.key, { type: "json" });
      if (sub?.status === "pending" && !sub.kitEnrolledAt) {
        await enrollKit(sub, (value) => db.setJSON(blob.key, value));
      }
    }
    if (verified) await dispatchKitEdition(db, edition);
    return;
  }
  for (const blob of blobs) {
    const sub = await db.get(blob.key, { type: "json" });
    if (!sub) continue;
    if (sub.status === "pending") {
      if (!(await db.get(`confirmations/${hash(sub.token)}`))) {
        await send(
          sub.email,
          "Confirm your Daily Bitcoin subscription",
          `<h1>Real things. Bitcoin perspective.</h1><p><a href="${origin}/newsletter#token=${sub.token}&confirm=1">Confirm your subscription</a></p>`,
          `confirm-${sub.token}`,
          sub.token,
        );
        await db.set(`confirmations/${hash(sub.token)}`, "sent");
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      continue;
    }
    if (!verified || !due(sub, date)) continue;
    const key = `deliveries/${date}/${hash(sub.email)}`;
    if (await db.get(key)) continue;
    const { units, btcPrice } = conversion(
      sub.btc,
      edition.rate,
      edition.priceCents,
    );
    const headline =
      units >= 1
        ? `${sub.btc} BTC ≈ ${units.toLocaleString("en-US")} ${edition.title.toLowerCase()} units`
        : `${edition.title}: ${btcPrice.toFixed(8)} BTC`;
    // One provider idempotency key plus a persistent ledger. Old editions are never retried after 24h.
    const result = await send(
      sub.email,
      headline,
      `<h1>${escape(edition.headline)}</h1><h2>${escape(headline)}</h2><p>${escape(edition.description)}</p><p>Listed at $${(edition.priceCents / 100).toFixed(2)} USD. Verified ${escape(edition.verifiedAt)}. BTC/USD: $${edition.rate.toFixed(2)}.</p><p>Price equivalence before tax and shipping. Bulk inventory and Bitcoin payment acceptance are not implied.</p><p><a style="color:#dafa5c" href="${origin}/daily?edition=${date}&utm_source=newsletter&utm_medium=email&utm_campaign=daily-bitcoin">Try your amount & vote →</a></p>`,
      `daily-${date}-${hash(sub.email)}`,
      sub.token,
    );
    await db.setJSON(key, { id: result.id, at: new Date().toISOString() });
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
};
export const config = { background: true };
