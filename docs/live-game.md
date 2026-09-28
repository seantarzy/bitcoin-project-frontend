# Live game beta

`/play` is a free, non-prize BTC/USD prediction game. Reference feed: Coinbase Exchange ticker WebSocket in the browser, public trades REST endpoint for authoritative server decisions.

## Round rules (five-second mode / version 2)

- Prepare: estimate the 70th percentile absolute 5-second move over up to 2 minutes of recent trades. Half-width starts at 2.8 times that move and decreases 20% per win, with an 8% volatility multiplier floor and $0.50 absolute half-width floor. During a winning run, each new offer is also capped at 80% of the previous winning target width, so increased volatility cannot widen the target. The chart uses a separate vertical span preserved through the streak; targets visibly shrink. Refreshing an expired offer does not apply another win reduction.
- Offer expires in 30 seconds. Chart bounds and band width are fixed. Center may move within the chart bounds minus the half-width. Each round requires a fresh chart or slider placement before the UI enables locking. This is a UX affordance, not anti-bot protection or a claim of predictive skill.
- Lock: server records boundaries and a deadline 6 seconds after acceptance (1-second buffer, 5-second forecast).
- Settle: time-weighted last-trade price in the final second; inclusive target boundaries. Requires history on both sides of the window. Missing coverage or a feed gap over five seconds at the window boundaries voids the round. Settlement over 60 seconds late ends the streak to discourage abandoning a losing round.
- Only the server changes streak and best. One outstanding round per anonymous browser cookie. Conditional blob writes prevent competing tabs from advancing a run twice. Repeated settle/lock is idempotent.

## Animation and sharing

The display runs on requestAnimationFrame with an 800ms buffer, interpolating only between received trades (no extrapolation, no bridging gaps over 2 seconds). Reduced-motion users get a slower visual refresh. Server settlement timing is unchanged by the display buffer. The official final-second average may differ from the last displayed tick.

The score-card dialog offers PNG download, native sharing where supported, and a copyable emoji challenge. `/play/card?score=N` renders a bounded integer on the card. `/play?beat=N` displays the friend challenge and sets matching social metadata. Shared scores are claims for friendly play, not signed leaderboard records. v2 starts a separate five-second streak/best on preparation, archiving the old best as legacyBest after any already-locked old round finishes.

## Limits

No paid play, prize promises, transferable points, wallet connection, or competitive leaderboard. This is not an anti-bot system: new cookies can create new runs, and external feeds may be faster. Valuable rewards require a separate design and review. A market-wide feed outage voids rounds. Coinbase history is capped at 1,000 trades, so extreme activity may cause conservative voids instead of unverifiable outcomes.

Anonymous game cookie lasts 30 days. Current run replaces the previous one at `game-runs/<hashed-cookie>` in the existing environment-specific Netlify store. No email or wallet is attached. Browser chart traffic goes directly to Coinbase. Server requests occur on round preparation and settlement, not on every tick.

## Measurement

`game_entry` (homepage/navigation), `game_view`, `game_target_placed` (chart/slider), `game_round_locked`, `game_round_result` (win/miss/void), `game_replay`, `game_share_opened`, `game_share` (copy/download/native), `game_newsletter_click`. View/lock/result events use method=live_5s to distinguish the new mode. Event parameters exclude target values and cookie IDs. Track unique players, first completion, replay, shared-link acquisition, and next-day returns. Owner/preview exclusions remain active. These events measure behavior, not prize eligibility.

## Validation

`npm test` includes deterministic settlement, width adaptation, stale data, invalid targets, early/repeated settlement, tampered input, expired offers, origin validation, and concurrent-write rejection. Run the site through `netlify dev` to test both UI and function; Next.js alone does not serve the function.
