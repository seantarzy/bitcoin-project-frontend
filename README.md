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

## Bitcoin in real life

The homepage now presents a purchasing-power calculator. `/price` retains the detailed market dashboard. Illustrative USD budgets live in `src/services/purchasingPower.ts`; they are explicitly labeled and editable, not claimed to be retailer prices. Eight comparisons cover everyday spending, tech, experiences and large goals.

Shared links encode a hypothetical BTC amount, item ID and budget in the URL fragment. Downloadable PNG cards are composed locally and include budget and quote-date context. Goals persist only in local storage. No wallet connection or account is required.

### Launch measurement

GA4 custom events: `calculator_used`, `category_selected`, `comparison_opened`, `benchmark_updated`, `share_opened`, `share_link_copied`, `share_card_downloaded`, `native_share_completed`, `goal_saved`. Parameters are limited to item/category/method: never BTC amounts, budgets or goal names. The configured analytics page address excludes fragments. A download event records creation of a download, not a confirmed social post.

Evaluate the first release after 30 days or 500 engaged visitors, whichever comes later. Compare calculator-use rate, comparison opens, successful share actions per user, and returning-user rate against the prior baseline. Treat these as a product experiment, not a promised traffic lift. Register `item_id` and `category` as event-scoped custom dimensions in GA4 to compare individual items. Traffic acquisition should be reviewed alongside engagement; this release does not itself supply distribution or advertising demand.

Original hero artwork is generated for this project. No stock photography or named products are used as price evidence. Ads are not enabled in this release; first establish engagement and repeat use.

## The Daily Bitcoin

`/daily` contains the sourced daily item, archived editions, both BTC conversions, voting, and newsletter signup. The homepage links to it. Edition prices are immutable dated snapshots, not promises of current stock or bulk availability. Merchant links are ordinary links, with no affiliate attribution or ads enabled. Artwork is an editorial emoji illustration, not a product photograph.

### Data and schedules

Native Netlify functions use a strongly consistent site Blobs store `daily-bitcoin-v1`. Deploy previews use `daily-bitcoin-preview-v1`; Netlify Dev uses local storage. No subscriber data is exposed by the public edition feed. Run `netlify dev` for the complete local flow; plain `next dev` does not serve newsletter/voting endpoints.

- `daily-publish`: 06:00 UTC daily. Refreshes the reviewed watchlist in `netlify/lib/catalog.mjs`, excludes recently featured products, validates exact in-stock variants and prices, fetches Coinbase BTC/USD, and saves one edition. No valid offer means no publication. `netlify functions:invoke daily-publish` tests it locally.
- `daily-dispatch`: 13:00 UTC daily. Triggers authenticated background sending only when explicitly enabled. Weekly subscribers receive the Sunday pick. Schedules remain UTC through daylight saving changes.
- `daily-send-background`: rechecks the product before edition delivery, sends confirmations to pending early-access signups, sends only to confirmed eligible subscribers, and keeps a persistent delivery ledger plus provider idempotency keys. Current editions only; no old-edition retry after 24 hours. The small-list launch worker needs batching/queues before approaching its 15-minute limit (~1,000 recipients); it is not a high-volume mailing system.
- `email-events`: verified Resend/Svix webhook suppresses bounced and complained recipients.

The catalog starts with ten manually selected novelty products from Archie McPhee. It is an automated **price-checking and publishing watchlist**, not unrestricted AI discovery. Expand it with reviewed merchants/products and licensed photographs. Cars, homes, Amazon and interest-based segmentation remain future integrations. Do not scrape arbitrary user-submitted URLs. Products are USD storefront prices in cents; package counts follow the actual listing.

### Activate email delivery

Signup safely collects pending early-access requests before these settings exist. It does **not** claim a message was sent. The UI switches to confirmation-based signup only when the production sender is ready.

Configure production Netlify environment variables (secrets must never enter Git or `NEXT_PUBLIC_*`):

- `RESEND_API_KEY`: key for an account with the site's sending domain verified, including its required DNS records.
- `NEWSLETTER_FROM`: verified sender, e.g. `The Daily Bitcoin <daily@whatsbitcoinsprice.com>`.
- `NEWSLETTER_POSTAL_ADDRESS`: the publisher's valid mailing address for the footer.
- `RESEND_WEBHOOK_SECRET`: configure the webhook at `https://whatsbitcoinsprice.com/.netlify/functions/email-events` for `email.bounced` and `email.complained`.
- `NEWSLETTER_JOB_SECRET`: random server-only secret shared by dispatch/background worker.
- `NEWSLETTER_SEND_ENABLED=true`: enable scheduled confirmation and edition delivery **after** testing a real confirmed subscriber and unsubscribe/bounce handling. Without this switch, scheduled emails do not send.

Confirmation is an explicit POST from the private email link; scanner GET requests do not subscribe/unsubscribe anyone. Tokens use URL fragments on the preferences page, are removed from the address bar, and that page does not load Analytics. One-click unsubscribe headers support explicit mailbox-provider POST requests. Hypothetical BTC preferences are private and never sent to GA or included in public edition links.

### Measurement and editorial operations

New GA events: `newsletter_signup` (request accepted, **not** confirmed subscription), `daily_vote`, `daily_share`, `daily_merchant_click`. Parameters remain restricted to item IDs and action methods. Confirmation/delivery counts come from stored subscriber status and the delivery ledger; no email address or BTC amount goes to GA. Vote cookies are a lightweight one-browser-per-edition control, not a fraud-proof public poll; totals are not displayed.

Check Netlify job logs after launch. Add reviewed products rather than repeating a failed listing, and monitor signup-to-confirmation, email-driven engaged visits, merchant clicks, unsubscribes and repeat visits. A manual first-week editorial review is recommended. Signup controls include a honeypot, consent, input length limits, and IP rate limiting; add a bot challenge and stronger distributed throttling if abuse grows.
