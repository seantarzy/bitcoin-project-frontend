# Launch baseline and measurement plan

Observed in GA4 property 263613663 on September 24, 2026, filtered to September 23 (property reporting timezone).

- 9 active users, 8 new users, 18 page views, 60 events. Home overview compares these with the prior day: active users +200%, views +350%.
- Homepage: 14 views, 8 active users, 54 seconds average engagement per active user.
- Daily: 4 views, 2 active users, 1m41s average engagement per active user.
- 3 daily_teaser_click events from 2 users; 3 newsletter_signup events from 3 users; at least 1 calculator_used and 1 comparison_opened.
- Acquisition is dominated by Direct, with Unassigned also present; no demonstrated social or search growth. The acquisition table currently has inconsistent totals (12 total sessions, 12 Direct and 2 Unassigned). Treat recent figures as provisional.
- Not a controlled experiment: live QA and owner traffic were not excluded, several designs shipped during the day, and signup events represent accepted requests, not confirmed subscribers or necessarily unique stored addresses. Do not report a conversion rate from these aggregate counts.

## Questions the instrumentation answers

| Question | Events / breakdown |
| --- | --- |
| Does the photo teaser earn clicks? | daily_teaser_view → daily_teaser_click, item_id and edition_date |
| Do readers engage after the reveal? | daily_view → daily_amount_changed / daily_vote / daily_merchant_click / daily_share |
| Which calculator ideas get attention? | section_view (comparisons), comparison_opened, category_selected, item_id and category |
| Do sharing tools actually get used? | share_opened → share_link_copied / share_card_downloaded / native_share_completed |
| Where does signup lose people? | newsletter_view → newsletter_start → newsletter_submit → newsletter_signup or newsletter_error |
| Are signups waiting or emailed? | newsletter_signup broken down by outcome; provider is the source of truth for confirmation/delivery |

Use user/session-scoped funnels in GA Explore, not division of independent event totals. Visibility means 35% of the element (or viewport for tall sections) was visible for one second, once per mounted item. Treat clicks, confirmed subscriptions, and return visits as stronger signals than opens. Do not monetize based on launch-day sample size.

## Data hygiene

- Production domain only; localhost and Netlify previews do not track.
- Visit https://whatsbitcoinsprice.com/?analytics=off on each owner/test browser to persistently opt out; ?analytics=on restores it. This cannot remove yesterday's traffic.
- Page views are explicit on pathname changes. GA Enhanced Measurement history-based pageviews must be off to avoid duplicates. Site search and automatic form interactions are off. Normal scroll/outbound measurement remains on.
- No email, BTC amount, budget, goal text, private preference token, URL query or fragment in custom events. Event parameters are allowlisted. Newsletter management routes disable GA.
- Event-scoped dimensions: item_id, edition_date, category, section, placement, method, outcome.
- Social links: /daily?utm_source=tiktok&utm_medium=social&utm_campaign=daily-bitcoin (also instagram, youtube, x, reddit); email source is newsletter with medium email.
- Allow 24–48 hours for processed custom-dimension reports. Current realtime activity is not proof of organic growth.
