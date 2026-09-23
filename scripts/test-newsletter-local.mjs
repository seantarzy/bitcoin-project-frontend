// Run against Netlify Dev only. Never targets production or sends mail.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hash } from "../netlify/lib/core.mjs";
const base = "http://localhost:8888";
const endpoint = `${base}/.netlify/functions/newsletter`;
const email = `integration-${Date.now()}@example.com`;
async function post(body, origin = base) {
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}
assert.equal(
  (await (await fetch(endpoint)).json()).sendingEnabled,
  false,
  "Never run this test with real sending enabled",
);
const form = { email, btc: "0.2", frequency: "weekly", consent: true };
assert.equal((await post(form, "https://other.example")).status, 403);
assert.equal((await post({ ...form, consent: false })).status, 400);
assert.equal((await post(form)).status, 200);
const site = JSON.parse(readFileSync(".netlify/state.json")).siteId;
const file = `.netlify/blobs-serve/entries/${site}/site:daily-bitcoin-preview-v1/subscribers/${hash(email)}`;
const read = () => JSON.parse(readFileSync(file, "utf8"));
const first = read();
assert.equal(first.status, "pending");
assert.equal(first.btc, 0.2);
assert.equal((await post({ ...form, btc: "3" })).status, 200);
assert.equal(
  read().btc,
  0.2,
  "Anonymous submissions cannot overwrite preferences",
);
assert.equal(
  (await post({ token: first.token, action: "confirm" })).data.status,
  "confirmed",
);
assert.equal(
  (
    await post({
      token: first.token,
      action: "update",
      btc: "0.00000001",
      frequency: "daily",
    })
  ).status,
  200,
);
assert.equal(read().btc, 0.00000001);
await fetch(`${endpoint}?unsubscribe=${first.token}`);
assert.equal(
  read().status,
  "confirmed",
  "Link-scanner GET must not unsubscribe",
);
const unsub = await fetch(`${endpoint}?unsubscribe=${first.token}`, {
  method: "POST",
  body: "List-Unsubscribe=One-Click",
});
assert.equal(unsub.status, 200);
assert.equal(read().status, "unsubscribed");
assert.equal(
  (await post({ token: first.token, action: "confirm" })).status,
  400,
  "Old link cannot silently resubscribe",
);
assert.equal((await post(form)).status, 200);
assert.notEqual(read().token, first.token);
assert.equal(
  (await post({ token: first.token, action: "read" })).status,
  400,
  "Rotated links are invalid",
);
await post({ token: read().token, action: "unsubscribe" });
console.log(
  "PASS: persistence, consent, origin checks, private preferences, satoshi precision, unsubscribe, token rotation. Synthetic local record remains unsubscribed.",
);
