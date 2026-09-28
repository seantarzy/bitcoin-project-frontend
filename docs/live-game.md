# Live game beta

`/play` is a free, non-prize BTC/USD prediction game. Reference feed: Coinbase Exchange ticker WebSocket in the browser, public trades REST endpoint for authoritative server decisions.

## Round rules (Up / Flat / Down / version 3)

- Prepare: estimate the 70th percentile absolute 5-second move over up to 2 minutes of recent trades. Flat half-width is 15% of that move, rounded to cents, with a $0.01 minimum. It adapts to volatility, never to streak length. Offers expire in 30 seconds.
- Before choosing, shaded Up/Flat/Down zones follow the buffered display price. Hover highlights a zone; clicking it or its accessible button locks immediately.
- Lock: fetch a fresh server trade to set the official anchor, then record the direction and a deadline 6 seconds after acceptance (1-second animation buffer, 5-second forecast). The anchor can differ from the delayed display preview. Clients cannot submit prices or scores.
- Settle: time-weighted last-trade price in the final second, compared in integer cents. Flat owns both boundaries; Up is strictly above and Down strictly below. Every verified finish has exactly one direction. Requires history on both sides of the window. Missing coverage or a feed gap over five seconds at the window boundaries voids the round. Settlement over 60 seconds late ends the streak.
- A correct call increments the streak; a miss resets it; a void preserves it. Only the server changes streak and best. One outstanding round per anonymous browser cookie. Conditional blob writes prevent competing tabs from advancing a run twice. Repeated settle/lock is idempotent.

## Animation and sharing

The display runs on requestAnimationFrame with an 800ms buffer, interpolating only between received trades (no extrapolation, no bridging gaps over 2 seconds). Reduced-motion users get a slower visual refresh. Server settlement timing is unchanged by the display buffer. The official final-second average may differ from the last displayed tick.

The score-card dialog offers PNG download, native sharing where supported, and a copyable emoji challenge. `/play/card?score=N` renders a bounded integer on the card. `/play?beat=N` displays the friend challenge and sets matching social metadata. Shared scores are claims for friendly play, not signed leaderboard records. v3 starts a separate direction streak/best on preparation, archiving old bests and any old locked round.

## Limits

No paid play, prize promises, transferable points, wallet connection, or competitive leaderboard. This is not an anti-bot system: new cookies can create new runs, and external feeds may be faster. Valuable rewards require a separate design and review. A market-wide feed outage voids rounds. Coinbase history is capped at 1,000 trades, so extreme activity may cause conservative voids instead of unverifiable outcomes.

Anonymous game cookie lasts 30 days. Current run replaces the previous one at `game-runs/<hashed-cookie>` in the existing environment-specific Netlify store. No email or wallet is attached. Browser chart traffic goes directly to Coinbase. Server requests occur on preparation, locking, and settlement, not on every tick.

## Measurement

`game_entry` (homepage/navigation), `game_view`, `game_round_locked`, `game_round_result` (win/miss/void), `game_replay`, `game_share_opened`, `game_share` (copy/download/native), `game_newsletter_click`. View/lock/result events use method=direction_5s; lock/result category identifies the chosen direction to distinguish the new mode. Event parameters exclude target values and cookie IDs. Track unique players, first completion, replay, shared-link acquisition, and next-day returns. Owner/preview exclusions remain active. These events measure behavior, not prize eligibility.

## Validation

`npm test` includes deterministic settlement, flat-zone adaptation, cent boundaries, fresh lock anchors, stale data, invalid directions, early/repeated settlement, tampered input, expired offers, origin validation, and concurrent-write rejection. Run the site through `netlify dev` to test both UI and function; Next.js alone does not serve the function.
