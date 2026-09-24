import test from "node:test";
import assert from "node:assert/strict";
import {
  enrollKit,
  kitBroadcast,
  kitStatus,
  dispatchKitEdition,
} from "../netlify/lib/kit.mjs";
const edition = {
  date: "2026-09-24",
  rate: 80000,
  priceCents: 1750,
  title: "Chicken <script>",
  headline: "A real find",
  description: "A & B",
  verifiedAt: "2026-09-24T06:00:00Z",
  merchant: "Store",
};
function setup() {
  const keys = {
    NEWSLETTER_ENV: "production",
    KIT_API_KEY: "test-only",
    KIT_FORM_ID: "11",
    KIT_DAILY_TAG_ID: "12",
    KIT_WEEKLY_TAG_ID: "13",
    KIT_EMAIL_TEMPLATE_ID: "14",
    KIT_SETUP_VERIFIED: "true",
    NEWSLETTER_SEND_ENABLED: "false",
  };
  const previous = Object.fromEntries(
    Object.keys(keys).map((k) => [k, process.env[k]]),
  );
  Object.assign(process.env, keys);
  return () => {
    for (const [k, v] of Object.entries(previous))
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
  };
}
test("Kit maps confirmation and suppression state without assuming an opt-in", () => {
  assert.equal(kitStatus("inactive"), "pending");
  assert.equal(kitStatus("active"), "confirmed");
  assert.equal(kitStatus("complained"), "suppressed");
  assert.equal(kitStatus("cancelled"), "unsubscribed");
});
test("Kit broadcasts are drafts, target exactly one frequency and escape merchant text", () => {
  const restore = setup();
  try {
    const daily = kitBroadcast(edition, "daily");
    const weekly = kitBroadcast(edition, "weekly");
    assert.equal(daily.send_at, null);
    assert.equal(daily.public, false);
    assert.deepEqual(daily.subscriber_filter, [
      { all: [{ type: "tag", ids: [12] }] },
    ]);
    assert.deepEqual(weekly.subscriber_filter, [
      { all: [{ type: "tag", ids: [13] }] },
    ]);
    assert.ok(daily.content.includes("Chicken &lt;script&gt;"));
    assert.ok(daily.content.includes("subscriber.bitcoin_perspective"));
    delete process.env.KIT_DAILY_TAG_ID;
    assert.throws(() => kitBroadcast(edition, "daily"), /missing/);
  } finally {
    restore();
  }
});
test("Kit enrollment creates inactive subscriber and triggers the configured confirmation form only once", async () => {
  const restore = setup();
  const original = global.fetch;
  const calls = [];
  const sub = {
    email: "example@example.com",
    btc: 1,
    frequency: "daily",
    token: "private-test-token",
    status: "pending",
  };
  try {
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      return Response.json({ subscriber: { id: 101, state: "inactive" } });
    };
    await enrollKit(sub, async () => {});
    await enrollKit(sub, async () => {});
    assert.equal(JSON.parse(calls[0].options.body).state, "inactive");
    assert.equal(sub.status, "pending");
    assert.equal(
      calls.filter((c) => c.url.includes("/forms/11/subscribers/101")).length,
      1,
    );
    assert.equal(calls.filter((c) => c.url.includes("/tags/13/")).length, 1);
    assert.equal(
      calls.find((c) => c.url.includes("/tags/13/")).options.method,
      "DELETE",
    );
  } finally {
    global.fetch = original;
    restore();
  }
});
test("Kit does not reactivate a suppressed or unsubscribed recipient", async () => {
  const restore = setup();
  const original = global.fetch;
  const calls = [];
  try {
    global.fetch = async (url) => {
      calls.push(url);
      return Response.json({ subscriber: { id: 101, state: "cancelled" } });
    };
    const sub = { kitId: 101, status: "pending" };
    await enrollKit(sub, async () => {});
    assert.equal(sub.status, "unsubscribed");
    assert.equal(calls.length, 1);
  } finally {
    global.fetch = original;
    restore();
  }
});
test("Kit broadcast ledger blocks duplicate creation including uncertain provider failures", async () => {
  const restore = setup();
  const original = global.fetch;
  let calls = 0;
  const data = new Map();
  const db = {
    setJSON: async (k, v, o) => {
      if (o?.onlyIfNew && data.has(k)) return { modified: false };
      data.set(k, v);
      return { modified: true };
    },
  };
  try {
    global.fetch = async () => {
      calls++;
      throw new Error("timeout");
    };
    await assert.rejects(() => dispatchKitEdition(db, edition), /timeout/);
    assert.equal(
      data.get("kit-broadcasts/2026-09-24/daily").status,
      "needs_review",
    );
    await dispatchKitEdition(db, edition);
    assert.equal(calls, 1);
  } finally {
    global.fetch = original;
    restore();
  }
});
