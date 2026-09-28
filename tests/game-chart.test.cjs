const test = require("node:test");
const assert = require("node:assert/strict");
const {
  priceAt,
  chartSeries,
  challengeScore,
} = require("../.test-build/services/gameChart.js");
test("chart interpolates received ticks without extrapolating or bridging outages", () => {
  const ticks = [
    { time: 1000, price: 100 },
    { time: 2000, price: 120 },
    { time: 6000, price: 90 },
  ];
  assert.equal(priceAt(ticks, 1500), 110);
  assert.equal(priceAt(ticks, 500), null);
  assert.equal(priceAt(ticks, 3000), 120);
  assert.equal(priceAt(ticks, 9000), 90);
  const series = chartSeries(ticks, 1000, 1550);
  assert.deepEqual(series.at(-1), { time: 1550, price: 111 });
  assert.ok(series.every((t) => t.time <= 1550));
  assert.equal(chartSeries(ticks, 1000, 9000).at(-1).time, 6000);
  assert.deepEqual(chartSeries([], 0, 1000), []);
});
test("shared scores only accept bounded nonnegative integers", () => {
  assert.equal(challengeScore("24"), 24);
  assert.equal(challengeScore("0"), 0);
  for (const value of [
    "-1",
    "10000",
    "Infinity",
    "2.4",
    "<script>",
    undefined,
    "",
  ])
    assert.equal(challengeScore(value), null);
});
