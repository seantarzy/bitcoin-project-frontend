import test from "node:test";
import assert from "node:assert/strict";
import {
  makeOffer,
  settlement,
  cleanTrades,
  directionAt,
} from "../netlify/lib/game.mjs";
import { createGame } from "../netlify/functions/game.mjs";
const NOW = 1800000000000;
const history = () =>
  Array.from({ length: 121 }, (_, i) => ({
    time: NOW - (120 - i) * 1000,
    price: 80000 + Math.sin(i / 4) * 10,
  }));
test("next-move offers have no flat zone at any streak", () => {
  const easy = makeOffer(history(), 0, NOW),
    hard = makeOffer(history(), 8, NOW);
  assert.equal(easy.flatHalfWidth, hard.flatHalfWidth);
  assert.equal(easy.rulesVersion, 5);
  assert.equal(easy.flatHalfWidth, 0);
  assert.equal(
    makeOffer(
      history().map((t) => ({ ...t, price: 80000 })),
      100,
      NOW,
    ).flatHalfWidth,
    0,
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
  let recorded = history();
  const handler = createGame({
    getStore: () => db,
    clock: () => now,
    getTrades: async () => {
      calls++;
      if (now !== NOW) recorded = [...recorded, { time: now, price: 80000 }];
      return recorded;
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
  assert.equal(
    (await h.post({ action: "lock", id, direction: "flat" })).status,
    400,
  );
  assert.equal((await h.post({ action: "lock", id, center: 0 })).status, 400);
  r = await (
    await h.post({
      action: "lock",
      id,
      direction: "up",
      anchor: 1,
      streak: 999,
    })
  ).json();
  assert.equal(r.round.endsAt, NOW + 10000);
  assert.equal(
    (await (await h.post({ action: "prepare" })).json()).round.id,
    id,
  );
  assert.equal(
    (await (await h.post({ action: "lock", id, direction: "down" })).json())
      .round.low,
    r.round.low,
  );
  assert.equal(
    (await (await h.post({ action: "settle", id })).json()).round.phase,
    "locked",
  );
  h.advance(8000);
  await h.post({ action: "settle", id });
  h.advance(1000);
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
    (await h.post({ action: "lock", id: r.round.id, direction: "down" }))
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
        direction: "down",
      })
    ).status,
    503,
  );
  assert.equal(other.state().round.phase, "ready");
});

test("abandoned rounds reset the streak without depending on market availability", async () => {
  const h = harness();
  const offer = await (await h.post({ action: "prepare" })).json();
  await h.post({
    action: "lock",
    id: offer.round.id,
    direction: "up",
    anchor: 1,
  });
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

test("flat and both cent boundaries award either choice a win", () => {
  for (const [price, expected] of [
    [99.98, "down"],
    [99.99, "flat"],
    [100, "flat"],
    [100.01, "flat"],
    [100.02, "up"],
    [100.014, "flat"],
    [100.016, "up"],
  ]) {
    assert.equal(directionAt(price, 100, 0.01), expected);
    for (const direction of ["up", "down"]) {
      const result = settlement(
        [
          { time: NOW - 1500, price },
          { time: NOW, price: 999 },
        ],
        {
          rulesVersion: 4,
          anchor: 100,
          flatHalfWidth: 0.01,
          direction,
          endsAt: NOW,
        },
        NOW + 2000,
      );
      assert.equal(result.actualDirection, expected);
      assert.equal(
        result.outcome,
        direction === expected || expected === "flat" ? "win" : "miss",
      );
    }
  }
});

test("lock takes a fresh server anchor and ignores client anchor and score", async () => {
  const h = harness();
  const offer = await (await h.post({ action: "prepare" })).json();
  h.advance(1000);
  const locked = await (
    await h.post({
      action: "lock",
      id: offer.round.id,
      direction: "down",
      anchor: 1,
      streak: 999,
    })
  ).json();
  assert.equal(locked.round.anchor, 80000);
  assert.notEqual(locked.round.anchor, offer.round.anchor);
  assert.equal(locked.streak, 0);
});

test("direction mode archives old scores and locked rounds before starting fresh", async () => {
  const h = harness();
  await h.post({ action: "prepare" });
  Object.assign(h.state(), { rulesVersion: 1, best: 9, streak: 4 });
  const migrated = await (await h.post({ action: "prepare" })).json();
  assert.equal(migrated.legacyBest, 9);
  assert.equal(migrated.best, 0);
  assert.equal(migrated.streak, 0);
  assert.equal(migrated.rulesVersion, 5);
  const other = harness();
  const offer = await (await other.post({ action: "prepare" })).json();
  await other.post({
    action: "lock",
    id: offer.round.id,
    direction: "down",
  });
  Object.assign(other.state(), { rulesVersion: 1, best: 9, streak: 4 });
  const active = await (await other.post({ action: "prepare" })).json();
  assert.equal(active.round.phase, "ready");
  assert.equal(active.best, 0);
  assert.equal(active.legacyRound.phase, "locked");
  assert.equal(active.legacyBests[1], 9);
});

test("unchanged market draws without adding or removing streak points", async () => {
  for (const direction of ["up", "down"]) {
    const h = harness();
    const offer = await (await h.post({ action: "prepare" })).json();
    h.advance(1000);
    await h.post({ action: "lock", id: offer.round.id, direction });
    h.state().streak = 2;
    h.advance(12000);
    const result = await (
      await h.post({ action: "settle", id: offer.round.id })
    ).json();
    assert.equal(result.round.outcome, "draw");
    assert.equal(result.streak, 2);
    const again = await (
      await h.post({ action: "settle", id: offer.round.id })
    ).json();
    assert.equal(again.streak, 2);
  }
});

test("already-issued version 3 rounds retain their original flat rules", () => {
  const trades = [
    { time: NOW - 1500, price: 100 },
    { time: NOW, price: 100 },
  ];
  const round = {
    rulesVersion: 3,
    endsAt: NOW,
    anchor: 100,
    flatHalfWidth: 0.01,
  };
  assert.equal(
    settlement(trades, { ...round, direction: "up" }, NOW + 2000).outcome,
    "miss",
  );
  assert.equal(
    settlement(trades, { ...round, direction: "flat" }, NOW + 2000).outcome,
    "win",
  );
});

test("next move skips equal ticks, ignores pre-lock changes and resolves first cent change", () => {
  const r = {
    rulesVersion: 5,
    anchor: 100,
    anchorTime: NOW - 100,
    anchorTradeId: 10,
    startsAt: NOW,
    endsAt: NOW + 10000,
    direction: "up",
  };
  const trades = [
    { id: 10, time: NOW - 100, price: 100 },
    { id: 11, time: NOW, price: 101 },
    { id: 12, time: NOW + 100, price: 101 },
    { id: 13, time: NOW + 200, price: 101.01 },
    { id: 14, time: NOW + 300, price: 99 },
  ];
  assert.equal(settlement(trades, r, NOW + 900), null);
  const result = settlement(trades, r, NOW + 1100);
  assert.equal(result.outcome, "win");
  assert.equal(result.anchor, 101);
  assert.equal(result.settledPrice, 101.01);
  assert.equal(result.resolvedAt, NOW + 200);
  assert.equal(
    settlement(trades, { ...r, direction: "down" }, NOW + 1100).outcome,
    "miss",
  );
  assert.equal(
    settlement(
      trades.filter((t) => t.id !== 12),
      r,
      NOW + 1100,
    ).outcome,
    "void",
  );
  assert.equal(settlement(trades.slice(1), r, NOW + 1100).outcome, "void");
});
test("no-move draw requires deadline coverage and ignores moves after deadline", () => {
  const r = {
    rulesVersion: 5,
    anchor: 100,
    anchorTime: NOW,
    startsAt: NOW,
    endsAt: NOW + 10000,
    direction: "up",
  };
  const trades = [
    { time: NOW, price: 100 },
    { time: NOW + 100, price: 100 },
  ];
  assert.equal(settlement(trades, r, NOW + 11000), null);
  assert.equal(settlement(trades, r, NOW + 19000).outcome, "void");
  assert.equal(
    settlement([...trades, { time: NOW + 10001, price: 101 }], r, NOW + 11000)
      .outcome,
    "draw",
  );
  assert.equal(
    settlement([...trades, { time: NOW + 10000, price: 101 }], r, NOW + 11000)
      .outcome,
    "win",
  );
});
