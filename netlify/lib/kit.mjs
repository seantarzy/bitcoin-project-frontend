import { origin, escape, conversion } from "./core.mjs";
const positiveId = (value) =>
  /^\d+$/.test(String(value || "")) && Number(value) > 0;
export const kitSelected = () => process.env.NEWSLETTER_PROVIDER === "kit";
export const kitReady = () =>
  Boolean(
    process.env.NEWSLETTER_ENV === "production" &&
    process.env.KIT_API_KEY &&
    positiveId(process.env.KIT_FORM_ID) &&
    positiveId(process.env.KIT_DAILY_TAG_ID) &&
    positiveId(process.env.KIT_WEEKLY_TAG_ID) &&
    process.env.KIT_SETUP_VERIFIED === "true",
  );
export async function kitRequest(path, method = "GET", body) {
  const response = await fetch(`https://api.kit.com/v4${path}`, {
    method,
    headers: {
      "X-Kit-Api-Key": process.env.KIT_API_KEY,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  // Do not log provider response bodies: they can contain subscriber data.
  if (!response.ok) throw new Error(`Kit request failed (${response.status})`);
  return response.status === 204 ? {} : response.json();
}
export function kitStatus(state) {
  return (
    {
      active: "confirmed",
      inactive: "pending",
      cancelled: "unsubscribed",
      bounced: "suppressed",
      complained: "suppressed",
    }[state] || "pending"
  );
}
export async function syncKitPreferences(sub) {
  if (!positiveId(sub.kitId))
    throw new Error("Kit subscriber is not connected");
  await kitRequest(`/subscribers/${sub.kitId}`, "PUT", {
    fields: {
      bitcoin_perspective: String(sub.btc),
      bitcoin_frequency: sub.frequency,
      bitcoin_preferences_url: `${origin}/newsletter#token=${sub.token}`,
    },
  });
  const chosen =
    sub.frequency === "weekly"
      ? process.env.KIT_WEEKLY_TAG_ID
      : process.env.KIT_DAILY_TAG_ID;
  const other =
    sub.frequency === "weekly"
      ? process.env.KIT_DAILY_TAG_ID
      : process.env.KIT_WEEKLY_TAG_ID;
  // Remove the old frequency first so a partial failure cannot cause duplicate sends.
  await kitRequest(`/tags/${other}/subscribers/${sub.kitId}`, "DELETE");
  await kitRequest(`/tags/${chosen}/subscribers/${sub.kitId}`, "POST", {});
}
export async function enrollKit(sub, save) {
  if (!kitReady()) throw new Error("Kit setup is incomplete");
  if (!sub.kitId) {
    const result = await kitRequest("/subscribers", "POST", {
      email_address: sub.email,
      state: "inactive",
    });
    sub.kitId = result.subscriber?.id;
    if (!positiveId(sub.kitId))
      throw new Error("Kit did not return a subscriber");
    sub.status = kitStatus(result.subscriber.state);
    sub.provider = "kit";
    await save(sub);
  }
  const { subscriber } = await kitRequest(`/subscribers/${sub.kitId}`);
  sub.status = kitStatus(subscriber.state);
  // Never reactivate an unsubscribe, complaint or bounce through an anonymous signup.
  if (["unsubscribed", "suppressed"].includes(sub.status)) {
    await save(sub);
    return;
  }
  if (!sub.kitEnrolledAt) {
    await syncKitPreferences(sub);
    // This form must have incentive email ON and automatic confirmation OFF.
    await kitRequest(
      `/forms/${process.env.KIT_FORM_ID}/subscribers/${sub.kitId}`,
      "POST",
      { referrer: `${origin}/daily` },
    );
    sub.kitEnrolledAt = new Date().toISOString();
    await save(sub);
  }
}
export async function unsubscribeKit(sub) {
  if (sub.kitId)
    await kitRequest(`/subscribers/${sub.kitId}/unsubscribe`, "POST", {});
}
export function kitBroadcast(edition, frequency, schedule = false) {
  const tag =
    frequency === "weekly"
      ? process.env.KIT_WEEKLY_TAG_ID
      : process.env.KIT_DAILY_TAG_ID;
  if (!positiveId(tag) || !positiveId(process.env.KIT_EMAIL_TEMPLATE_ID))
    throw new Error("Kit audience/template is missing");
  const { btcPrice } = conversion(1, edition.rate, edition.priceCents);
  const unitsPerBtc = (edition.rate * 100) / edition.priceCents;
  const image = edition.imageUrl?.startsWith(
    "https://cdn.shopify.com/s/files/1/1365/2497/",
  )
    ? `<img src="${escape(edition.imageUrl)}" alt="${escape(edition.title)}" width="320" style="max-width:100%;height:auto" />`
    : "";
  return {
    email_template_id: Number(process.env.KIT_EMAIL_TEMPLATE_ID),
    email_address: process.env.KIT_FROM_EMAIL || "team@whatsbitcoinsprice.com",
    subject: `${edition.title}: ${btcPrice.toFixed(8)} BTC. Yes, really.`,
    description: `daily-bitcoin-${edition.date}-${frequency}`,
    public: false,
    published_at: `${edition.date}T13:00:00Z`,
    send_at: schedule ? new Date(Date.now() + 5 * 60000).toISOString() : null,
    preview_text: "A real photo. A checked price. Your Bitcoin perspective.",
    subscriber_filter: [{ all: [{ type: "tag", ids: [Number(tag)] }] }],
    content: `<h1>${escape(edition.headline)}</h1>${image}<p>${escape(edition.description)}</p><h2>${escape(edition.title)} = ${btcPrice.toFixed(8)} BTC</h2><p>{% assign perspective = subscriber.bitcoin_perspective | default: 1 | plus: 0 %}With {{ perspective }} BTC, that is {{ perspective | times: ${unitsPerBtc} | floor }} whole units at the listed price.</p><p>Listed at $${(edition.priceCents / 100).toFixed(2)} USD at ${escape(edition.merchant)}. Checked ${escape(edition.verifiedAt)}. BTC/USD $${edition.rate.toFixed(2)} at publication.</p><p><a href="${origin}/daily?edition=${edition.date}&utm_source=newsletter&utm_medium=email&utm_campaign=daily-bitcoin">Explore the find & vote →</a></p><p>Price equivalence before tax, shipping and exchange fees. Bulk inventory and Bitcoin payment acceptance are not implied.</p><p><a href="{{ subscriber.bitcoin_preferences_url }}">Change your Bitcoin perspective or frequency</a></p>`,
  };
}
export async function dispatchKitEdition(db, edition) {
  if (!kitReady()) return;
  const frequencies =
    new Date(edition.date + "T12:00:00Z").getUTCDay() === 0
      ? ["daily", "weekly"]
      : ["daily"];
  for (const frequency of frequencies) {
    const payload = kitBroadcast(
      edition,
      frequency,
      process.env.NEWSLETTER_SEND_ENABLED === "true",
    );
    const key = `kit-broadcasts/${edition.date}/${frequency}`;
    // Claim before contacting Kit; uncertain failures must be reconciled, never blindly resent.
    const claim = await db.setJSON(
      key,
      { status: "creating", at: new Date().toISOString() },
      { onlyIfNew: true },
    );
    if (!claim.modified) continue;
    try {
      const result = await kitRequest("/broadcasts", "POST", payload);
      await db.setJSON(key, {
        id: result.broadcast.id,
        status: payload.send_at ? "scheduled" : "draft",
        at: new Date().toISOString(),
      });
    } catch (error) {
      await db.setJSON(key, {
        status: "needs_review",
        at: new Date().toISOString(),
      });
      throw error;
    }
  }
}
