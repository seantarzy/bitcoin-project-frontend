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

- `NEWSLETTER_ENV=production`: explicitly marks production functions; all other environments use the isolated preview store and cannot send. Already configured for the production deploy context.
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


## Kit migration (prepared; activation pending account setup)

The Kit adapter is opt-in through `NEWSLETTER_PROVIDER=kit`. Until configured, early-access records remain in Netlify and no Kit request is made. The Resend path remains available for rollback; do not use Kit's shared postal address with Resend.

Complete setup in a dedicated Daily Bitcoin Kit account:

1. Choose the Free plan. Verify the account and sender `team@whatsbitcoinsprice.com` (this must be a working mailbox/alias). Complete any Kit sending approval and domain authentication.
2. In Kit Email settings use Kit's offered shared newsletter postal address, as described in https://help.kit.com/en/articles/2502494-alternatives-for-your-physical-address. It is only for newsletters through Kit.
3. Create a Daily Bitcoin form. Enable its incentive/confirmation email and turn OFF automatic confirmation. Customize the confirmation email and redirect confirmed readers to `/daily`. This integration must not bypass double opt-in.
4. Create tags `Daily Bitcoin - daily` and `Daily Bitcoin - weekly`. Create custom fields with exact keys `bitcoin_perspective`, `bitcoin_frequency`, and `bitcoin_preferences_url`.
5. Select a Classic/HTML email template supported by Kit's broadcast API. Its footer must include Kit's unsubscribe link and configured address. Starting point templates are not supported by this API.
6. Store server-only production variables: `KIT_API_KEY`, `KIT_FORM_ID`, `KIT_DAILY_TAG_ID`, `KIT_WEEKLY_TAG_ID`, `KIT_EMAIL_TEMPLATE_ID`, `KIT_FROM_EMAIL=team@whatsbitcoinsprice.com`, `NEWSLETTER_PROVIDER=kit`. Keep `NEWSLETTER_SEND_ENABLED=false`.
7. Set `KIT_SETUP_VERIFIED=true` only after the form, fields, tags, sender and footer have been checked. This enables signup confirmation requests and migration of pending consented early-access signups. It also permits the nightly job to create **draft** broadcasts. Existing unsubscribed/suppressed records are never migrated.
8. Test Sean's confirmation, private preference updates, both frequency tags, Kit unsubscribe, and a draft preview at 0.2/1/3 BTC. Verify the Liquid calculations and Kit-managed address/unsubscribe footer. Kit's state is authoritative when private preference links are opened; confirmation through a local token cannot activate a Kit subscriber.
9. Set `NEWSLETTER_SEND_ENABLED=true` and redeploy only after the end-to-end test. The 13:00 UTC job schedules one daily broadcast, plus a weekly-tag broadcast on Sundays, five minutes later. Kit delivers only to eligible active subscribers. Previously created drafts stay drafts and need scheduling in Kit; toggling the flag does not resend them.

Broadcasts preserve the site's dated price snapshot, include the real product photo, personalize the hypothetical BTC quantity using Kit custom fields, and use tagged newsletter links back to the daily edition. The site's preferences page updates Kit fields and replaces frequency tags. Kit handles bounces, complaints, email confirmation, and built-in unsubscribe; no Resend webhook is needed for Kit delivery.

`kit-broadcasts/<date>/<frequency>` is a creation ledger claimed atomically before calling Kit. A timeout or uncertain failure is marked `needs_review`, preventing blind retries that could duplicate mail. Reconcile with the matching description in Kit before changing a ledger record. A missing template/tag causes a hard failure instead of targeting the entire account.

See `docs/analytics.md` for the launch baseline, event funnels, owner-traffic exclusion and GA4 custom dimensions. `newsletter_signup` is a key event for accepted signup requests, **not** confirmed subscribers; Kit subscriber state and delivery/click reports measure the latter.
