import test from "node:test";
import assert from "node:assert/strict";
import {
  preferences,
  conversion,
  due,
  escape,
  token,
  hash,
} from "../netlify/lib/core.mjs";
import { verify } from "../netlify/lib/catalog.mjs";
test("subscription validates address, frequency, and positive hypothetical BTC", () => {
  assert.deepEqual(
    preferences({ email: " Sean@Example.com ", btc: "", frequency: "daily" }),
    { email: "sean@example.com", btc: 1, frequency: "daily" },
  );
  for (const btc of ["-1", "0", "NaN", "Infinity", "0.000000001", "21000001"])
    assert.throws(() =>
      preferences({ email: "a@b.com", btc, frequency: "daily" }),
    );
  assert.throws(() =>
    preferences({ email: "invalid", btc: 1, frequency: "daily" }),
  );
  assert.throws(() =>
    preferences({ email: "a@b.com", btc: 1, frequency: "hourly" }),
  );
});
test("both price perspectives round units down, never invent fractions of items", () => {
  assert.deepEqual(conversion(1, 100000, 1750), {
    units: 5714,
    btcPrice: 0.000175,
  });
  assert.equal(conversion(0.00001, 100000, 1750).units, 0);
  assert.throws(() => conversion(1, 0, 1750));
});
test("only confirmed recipients receive their chosen frequency", () => {
  assert.equal(
    due({ status: "pending", frequency: "daily" }, "2026-09-23"),
    false,
  );
  assert.equal(
    due({ status: "unsubscribed", frequency: "daily" }, "2026-09-23"),
    false,
  );
  assert.equal(
    due({ status: "suppressed", frequency: "daily" }, "2026-09-23"),
    false,
  );
  assert.equal(
    due({ status: "confirmed", frequency: "weekly" }, "2026-09-23"),
    false,
  );
  assert.equal(
    due({ status: "confirmed", frequency: "weekly" }, "2026-09-27"),
    true,
  );
  assert.equal(
    due({ status: "confirmed", frequency: "daily" }, "2026-09-23"),
    true,
  );
});
test("email rendering escapes text and private tokens are high entropy", () => {
  assert.equal(escape('<script>"&'), "&lt;script&gt;&quot;&amp;");
  assert.match(token(), /^[a-f0-9]{64}$/);
  assert.notEqual(token(), token());
  assert.equal(hash("test").length, 64);
});
test("verification rejects unavailable and malformed offers, preserves exact variant", async () => {
  const original = global.fetch;
  try {
    global.fetch = async () =>
      Response.json({ variants: [{ id: 123, available: true, price: 1750 }] });
    const result = await verify({
      url: "https://mcphee.com/products/example",
      variant: "123",
    });
    assert.equal(result.priceCents, 1750);
    assert.equal(
      result.sourceUrl,
      "https://mcphee.com/products/example?variant=123",
    );
    global.fetch = async () =>
      Response.json({ variants: [{ id: 123, available: false, price: 1750 }] });
    await assert.rejects(() =>
      verify({ url: "https://mcphee.com/products/example" }),
    );
    global.fetch = async () =>
      Response.json({ variants: [{ id: 123, available: true, price: 0 }] });
    await assert.rejects(() =>
      verify({ url: "https://mcphee.com/products/example" }),
    );
  } finally {
    global.fetch = original;
  }
});
