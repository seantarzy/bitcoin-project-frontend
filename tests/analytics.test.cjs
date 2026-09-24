const test = require("node:test");
const assert = require("node:assert/strict");
const {
  safeParameters,
  analyticsExcluded,
  track,
} = require("../.test-build/services/analytics.js");
test("analytics drops unknown keys, email addresses, URLs and private values", () => {
  assert.deepEqual(
    safeParameters({
      item_id: "emotional-support-chicken",
      outcome: "early_access",
      email: "person@example.com",
      btc: 3,
      token: "secret",
      method: "https://example.com/private",
      category: "person@example.com",
    }),
    { item_id: "emotional-support-chicken", outcome: "early_access" },
  );
});
test("tracking excludes previews, preference pages and opted-out browsers; page addresses omit private fragments", () => {
  const previous = {
    window: global.window,
    location: global.location,
    localStorage: global.localStorage,
    env: process.env.NODE_ENV,
    id: process.env.NEXT_PUBLIC_MEASUREMENT_ID,
  };
  try {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_MEASUREMENT_ID = "G-TEST";
    const events = [];
    global.window = { gtag: (...args) => events.push(args) };
    global.localStorage = { getItem: () => null };
    global.location = {
      hostname: "localhost",
      pathname: "/",
      origin: "http://localhost",
      search: "",
      hash: "",
    };
    assert.equal(analyticsExcluded(), true);
    track("daily_vote");
    assert.equal(events.length, 0);
    global.location = {
      hostname: "whatsbitcoinsprice.com",
      pathname: "/daily",
      origin: "https://whatsbitcoinsprice.com",
      search: "?email=private@example.com",
      hash: "#token=secret",
    };
    track("daily_vote", { item_id: "chicken", method: "item" });
    assert.equal(
      events[0][2].page_location,
      "https://whatsbitcoinsprice.com/daily",
    );
    assert.ok(!JSON.stringify(events).includes("secret"));
    global.location.pathname = "/newsletter";
    track("page_view");
    assert.equal(events.length, 1);
    global.location.pathname = "/";
    global.localStorage.getItem = () => "true";
    track("page_view");
    assert.equal(events.length, 1);
  } finally {
    global.window = previous.window;
    global.location = previous.location;
    global.localStorage = previous.localStorage;
    if (previous.env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.env;
    if (previous.id === undefined)
      delete process.env.NEXT_PUBLIC_MEASUREMENT_ID;
    else process.env.NEXT_PUBLIC_MEASUREMENT_ID = previous.id;
  }
});
