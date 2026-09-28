import test from "node:test";
import assert from "node:assert/strict";
import { makeOffer, settlement, cleanTrades } from "../netlify/lib/game.mjs";
import { createGame } from "../netlify/functions/game.mjs";
const NOW = 1800000000000;
const history = () =>
  Array.from({ length: 121 }, (_, i) => ({
    time: NOW - (120 - i) * 1000,
    price: 80000 + Math.sin(i / 4) * 10,
  }));
test("volatility bands use past prices, tighten after every win, and keep a floor", () => {
  const easy = makeOffer(history(), 0, NOW),
    hard = makeOffer(history(), 8, NOW);
  assert.ok(easy.halfWidth > hard.halfWidth);
  assert.ok(easy.halfWidth > makeOffer(history(), 1, NOW).halfWidth);
  assert.equal(
    makeOffer(
      history().map((t) => ({ ...t, price: 80000 })),
      100,
      NOW,
    ).halfWidth,
    0.5,
  );
  assert.throws(() => makeOffer(history(), 0, NOW + 10000), /delayed/);
  assert.throws(() => makeOffer(history().slice(-2), 0, NOW), /history/);
});
test("settlement is time weighted, includes boundaries, never uses post-finish price", () => {
  const r = { endsAt: NOW, low: 101, high: 101 };
  const trades = [
    { time: NOW - 1500, price: 100 },
    { time: NOW - 500, price: 102 },
    { time: NOW, price: 900 },
  ];
  assert.equal(settlement(trades, r, NOW), null);
  assert.deepEqual(settlement(trades, r, NOW + 2000), {
    outcome: "win",
    settledPrice: 101,
  });
  assert.equal(
    settlement(trades, { ...r, low: 102, high: 105 }, NOW + 2000).outcome,
    "miss",
  );
  assert.equal(settlement(trades.slice(1), r, NOW + 2000).outcome, "void");
  assert.equal(settlement(trades, r, NOW + 61000).outcome, "miss");
  assert.deepEqual(cleanTrades([{ time: "bad", price: "no" }]), []);
});
function harness() {
  let now = NOW,
    data = null,
    version = 0,
    forcedConflict = false,
    calls = 0;
  const db = {
    getWithMetadata: async () =>
      data ? { data: structuredClone(data), etag: String(version) } : null,
    setJSON: async (_, next, opts) => {
      if (
        forcedConflict ||
        (opts.onlyIfNew && data) ||
        (opts.onlyIfMatch && opts.onlyIfMatch !== String(version))
      )
        return { modified: false };
      data = structuredClone(next);
      version++;
      return { modified: true };
    },
  };
  const handler = createGame({
    getStore: () => db,
    clock: () => now,
    getTrades: async () => {
      calls++;
      return now === NOW
        ? history()
        : [
            { time: now - 5000, price: 80000 },
            { time: now - 2000, price: 80000 },
            { time: now, price: 80000 },
          ];
    },
  });
  const post = (body, origin = "https://example.com") =>
    handler(
      new Request("https://example.com/.netlify/functions/game", {
        method: "POST",
        headers: {
          origin,
          cookie: `bitcoin_game=${"a".repeat(64)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }),
    );
  return {
    post,
    advance: (ms) => (now += ms),
    state: () => data,
    conflict: () => (forcedConflict = true),
    calls: () => calls,
  };
}
test("server locks once, resumes active rounds, settles once and ignores submitted scores", async () => {
  const h = harness();
  let r = await (await h.post({ action: "prepare", streak: 999 })).json();
  assert.equal(r.streak, 0);
  const id = r.round.id;
  assert.equal((await h.post({ action: "lock", id, center: 0 })).status, 400);
  r = await (
    await h.post({ action: "lock", id, center: 80000, streak: 999 })
  ).json();
  assert.equal(r.round.endsAt, NOW + 6000);
  assert.equal(
    (await (await h.post({ action: "prepare" })).json()).round.id,
    id,
  );
  assert.equal(
    (await (await h.post({ action: "lock", id, center: 90000 })).json()).round
      .low,
    r.round.low,
  );
  assert.equal(
    (await (await h.post({ action: "settle", id })).json()).round.phase,
    "locked",
  );
  h.advance(8000);
  r = await (await h.post({ action: "settle", id, settledPrice: 0 })).json();
  assert.equal(r.streak, 1);
  assert.equal(r.best, 1);
  const calls = h.calls();
  r = await (await h.post({ action: "settle", id })).json();
  assert.equal(r.streak, 1);
  assert.equal(h.calls(), calls);
  assert.equal((await h.post({ action: "settle", id: "fake" })).status, 409);
});
test("expired offers, cross-origin requests and concurrent updates cannot lock", async () => {
  const h = harness();
  assert.equal(
    (await h.post({ action: "prepare" }, "https://evil.com")).status,
    403,
  );
  let r = await (await h.post({ action: "prepare" })).json();
  h.advance(31000);
  assert.equal(
    (await h.post({ action: "lock", id: r.round.id, center: r.round.anchor }))
      .status,
    409,
  );
  const other = harness();
  r = await (await other.post({ action: "prepare" })).json();
  other.conflict();
  assert.equal(
    (
      await other.post({
        action: "lock",
        id: r.round.id,
        center: r.round.anchor,
      })
    ).status,
    503,
  );
  assert.equal(other.state().round.phase, "ready");
});

test("abandoned rounds reset the streak without depending on market availability", async () => {
  const h = harness();
  const offer = await (await h.post({ action: "prepare" })).json();
  await h.post({ action: "lock", id: offer.round.id, center: 80000 });
  h.advance(73000);
  const calls = h.calls();
  const result = await (
    await h.post({ action: "settle", id: offer.round.id })
  ).json();
  assert.equal(result.round.outcome, "miss");
  assert.equal(result.streak, 0);
  assert.equal(h.calls(), calls);
});

test("settlement waits briefly for delayed REST coverage rather than voiding immediately", () => {
  const trades = [
    { time: NOW - 1500, price: 100 },
    { time: NOW - 500, price: 102 },
  ];
  const round = { endsAt: NOW, low: 100, high: 103 };
  assert.equal(settlement(trades, round, NOW + 2000), null);
  assert.equal(settlement(trades, round, NOW + 9000).outcome, "void");
  assert.equal(
    settlement([...trades, { time: NOW + 500, price: 101 }], round, NOW + 4000)
      .outcome,
    "win",
  );
});

test("winning targets shrink even when volatility increases, while chart scale stays fixed", () => {
  const first = makeOffer(history(), 0, NOW);
  const wild = history().map((t) => ({
    ...t,
    price: 80000 + (t.price - 80000) * 20,
  }));
  const second = makeOffer(wild, 1, NOW, { ...first, outcome: "win" });
  assert.ok(second.halfWidth <= first.halfWidth * 0.8);
  assert.equal(second.chartHalfSpan, first.chartHalfSpan);
  assert.equal(second.forecastMs, 5000);
  assert.equal(second.bufferMs, 1000);
  const refreshed = makeOffer(wild, 1, NOW, second);
  assert.equal(refreshed.halfWidth, second.halfWidth);
});

test("five-second mode archives the legacy best and does not interrupt a locked round", async () => {
  const h = harness();
  await h.post({ action: "prepare" });
  Object.assign(h.state(), { rulesVersion: 1, best: 9, streak: 4 });
  const migrated = await (await h.post({ action: "prepare" })).json();
  assert.equal(migrated.legacyBest, 9);
  assert.equal(migrated.best, 0);
  assert.equal(migrated.streak, 0);
  assert.equal(migrated.rulesVersion, 2);
  const other = harness();
  const offer = await (await other.post({ action: "prepare" })).json();
  await other.post({
    action: "lock",
    id: offer.round.id,
    center: offer.round.anchor,
  });
  Object.assign(other.state(), { rulesVersion: 1, best: 9, streak: 4 });
  const active = await (await other.post({ action: "prepare" })).json();
  assert.equal(active.round.phase, "locked");
  assert.equal(active.best, 9);
});
