# What's Bitcoin's Price?

Next.js dashboard for Bitcoin exchange rates and the last 30 completed UTC daily closes.

## Development

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Production validation:

```sh
npm test
npm run build
npm start
```

`npm test` compiles the market-data functions into ignored `.test-build/` output and runs Node's regression tests. No live API calls are made by the tests.

## Market data

- Current exchange rates: Coinbase `/v2/exchange-rates?currency=BTC`.
- Daily closes: Coinbase Exchange `/products/BTC-USD/candles`, with `granularity=86400` and explicit UTC date bounds. Incomplete current-day candles are excluded, results are validated, deduplicated and sorted, and stale history is rejected.
- Pages and `/api/market-data` revalidate every 60 seconds. Upstream quotes cache for 60 seconds and historical requests for one hour. The browser refreshes on arrival, every minute while visible, and on request. API credentials are not required for these public endpoints.
- Quote and history requests fail independently. The page can render when either provider request fails. Refresh failures retain the previous values with a visible warning and suppress the change calculation.
- Dates label candle **start dates**; amounts are the closing price for that UTC day. The summary compares the latest quote with the first available closing price in the displayed range, with its date explicitly labeled.
- Non-USD charts estimate historical values using the latest USD conversion ratio. They do not incorporate historical foreign-exchange movements; the page explains this limitation.
- Keep numeric prices as numbers across server/client boundaries. Formatting is for display only.

## Analytics

Production builds use `NEXT_PUBLIC_MEASUREMENT_ID`. Development mode does not load Analytics. For a local production preview without recording traffic, build with:

```sh
NEXT_PUBLIC_MEASUREMENT_ID='' npm run build
```

Before deploying, use the existing live site's hosting project and configured measurement ID. The working changes do not alter the live deployment or analytics settings.

## Regression coverage

Tests cover numeric prices containing thousands, malformed rates, candle sorting/ranges/freshness, currency conversion, missing baselines, flat chart scales, rate limits and provider outages. Browser verification should include USD/EUR switching, refresh, chart inspection and mobile layout.
