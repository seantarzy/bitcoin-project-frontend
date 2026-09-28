# Live game beta

`/play` is a free, non-prize BTC/USD prediction game. Reference feed: Coinbase Exchange ticker WebSocket in the browser, public trades REST endpoint for authoritative server decisions.

## Round rules

- Prepare: estimate the 70th percentile absolute 10-second move over up to 2 minutes of recent trades. Half-width is 1.3 times that move, reduced by 12% every two wins, with a 40% difficulty multiplier floor and $0.50 absolute half-width floor.
- Offer expires in 30 seconds. Chart bounds and band width are fixed. Center may move within three half-widths of the initial price.
- Lock: server records boundaries and a deadline 12 seconds after acceptance (2-second buffer, 10-second forecast).
- Settle: time-weighted last-trade price in the final second; inclusive target boundaries. Requires history on both sides of the window. Missing coverage, a feed gap over five seconds at the window boundaries, or settlement over 60 seconds late voids the round.
- Only the server changes streak and best. One outstanding round per anonymous browser cookie. Conditional blob writes prevent competing tabs from advancing a run twice. Repeated settle/lock is idempotent.

## Limits

No paid play, prize promises, transferable points, wallet connection, or competitive leaderboard. This is not an anti-bot system: new cookies can create new runs, and external feeds may be faster. Valuable rewards require a separate design and review. A market-wide feed outage voids rounds. Coinbase history is capped at 1,000 trades, so extreme activity may cause conservative voids instead of unverifiable outcomes.

Anonymous game cookie lasts 30 days. Current run replaces the previous one at `game-runs/<hashed-cookie>` in the existing environment-specific Netlify store. No email or wallet is attached. Browser chart traffic goes directly to Coinbase. Server requests occur on round preparation and settlement, not on every tick.

## Measurement

`game_entry` (homepage/navigation), `game_view`, `game_round_locked`, `game_round_result` (win/miss/void), `game_replay`, `game_share` (copied challenge link), `game_newsletter_click`. Event parameters exclude target values and cookie IDs. Track unique players, first completion, replay, shared-link acquisition, and next-day returns. Owner/preview exclusions remain active. These events measure behavior, not prize eligibility.

## Validation

`npm test` includes deterministic settlement, width adaptation, stale data, invalid targets, early/repeated settlement, tampered input, expired offers, origin validation, and concurrent-write rejection. Run the site through `netlify dev` to test both UI and function; Next.js alone does not serve the function.
