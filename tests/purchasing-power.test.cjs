const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseBtc,
  buyingPower,
  parseSharedComparison,
  comparisons,
} = require("../.test-build/services/purchasingPower.js");
test("BTC accepts satoshi precision and zero, rejects invalid and out-of-range input", () => {
  for (const raw of [
    "",
    ".",
    "-1",
    "1e3",
    "NaN",
    "Infinity",
    "1,000",
    "0.000000001",
    "21000001",
  ])
    assert.equal(parseBtc(raw), null, raw);
  assert.equal(parseBtc("0.00000001"), 0.00000001);
  assert.equal(parseBtc("0"), 0);
  assert.equal(parseBtc("21000000"), 21000000);
});
test("purchasing power rounds whole units down and caps goal progress", () => {
  assert.deepEqual(buyingPower(0.1, 80000, 6), {
    dollars: 8000,
    units: 1333,
    progress: 100,
    btcNeeded: 6 / 80000,
  });
  const home = buyingPower(1, 80000, 400000);
  assert.equal(home.units, 0);
  assert.equal(home.progress, 20);
  assert.equal(home.btcNeeded, 5);
  assert.equal(buyingPower(0, 80000, 6).progress, 0);
});
test("unavailable rate and invalid budgets never generate misleading quantities", () => {
  for (const budget of [0, -1, NaN, Infinity])
    assert.equal(buyingPower(1, 80000, budget), null);
  assert.equal(buyingPower(1, null, 6), null);
  assert.equal(buyingPower(1, 0, 6), null);
  assert.equal(buyingPower(-1, 80000, 6), null);
});
test("shared comparisons round-trip a hypothetical amount and edited budget", () => {
  assert.deepEqual(parseSharedComparison("#btc=0.1&pick=coffee&budget=7.5"), {
    amount: "0.1",
    pick: "coffee",
    budget: 7.5,
  });
  assert.equal(parseSharedComparison("#btc=-1&pick=coffee"), null);
  assert.equal(parseSharedComparison("#btc=1&pick=made-up"), null);
  assert.equal(
    parseSharedComparison("#btc=1&pick=coffee&budget=Infinity").budget,
    6,
  );
  assert.equal(new Set(comparisons.map((i) => i.id)).size, comparisons.length);
});
