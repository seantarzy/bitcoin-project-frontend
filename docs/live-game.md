# Live game beta

`/play` is a free, non-prize BTC/USD prediction game. Reference feed: Coinbase Exchange ticker WebSocket in the browser, public trades REST endpoint for authoritative server decisions.

## Round rules (next move / version 5)

- Prepare: offer a chart scaled from recent volatility, valid for 30 seconds. No flat zone or progressively harder rules.
- Lock: accept only Up or Down; record the server timestamp before fetching fresh market history. Store the latest trade at or before that timestamp, including its exchange trade ID. No animation buffer shifts the cutoff.
- Settle: poll after 800ms. Ignore trades at or before the lock timestamp and trades at the unchanged cent price. The first changed price within 10 seconds wins or loses the call. Recover the last price at/before the cutoff from complete exchange history to account for late-arriving trades. Wait until the deciding trade is at least 800ms old to align with the smoothed chart.
- Require the saved anchor trade and contiguous exchange trade IDs in retrieved history. Missing coverage voids the round. No change by 10 seconds is a draw only after trades cover the deadline; allow up to 8 additional seconds for feed verification. A draw preserves streak without adding points. More than 60 seconds late ends the streak.
- Only the server changes scores. One active round per cookie; conditional writes and idempotent settlement prevent double awards. Previous mode scores are archived separately on preparation.

## Animation and sharing

The display runs on requestAnimationFrame with an 800ms buffer, interpolating only between received trades (no extrapolation, no bridging gaps over 2 seconds). Reduced-motion users get a slower visual refresh. Server settlement timing is unchanged by the display buffer. The chart stops at the deciding trade; the server records its exact price and time.

The score-card dialog offers PNG download, native sharing where supported, and a copyable emoji challenge. `/play/card?score=N` renders a bounded integer on the card. `/play?beat=N` displays the friend challenge and sets matching social metadata. Shared scores are claims for friendly play, not signed leaderboard records. v5 starts a separate direction streak/best on preparation, archiving old bests and any old locked round.

## Limits

No paid play, prize promises, transferable points, wallet connection, or competitive leaderboard. This is not an anti-bot system: new cookies can create new runs, and external feeds may be faster. Valuable rewards require a separate design and review. A market-wide feed outage voids rounds. Coinbase history is capped at 1,000 trades, so extreme activity may cause conservative voids instead of unverifiable outcomes.

Anonymous game cookie lasts 30 days. Current run replaces the previous one at `game-runs/<hashed-cookie>` in the existing environment-specific Netlify store. No email or wallet is attached. Browser chart traffic goes directly to Coinbase. Server requests occur on preparation, locking, and settlement, not on every tick.

## Measurement

`game_entry` (homepage/navigation), `game_view`, `game_round_locked`, `game_round_result` (win/miss/draw/void), `game_replay`, `game_share_opened`, `game_share` (copy/download/native), `game_newsletter_click`. View/lock/result events use method=next_move; lock/result category identifies the chosen direction to distinguish the new mode. Event parameters exclude target values and cookie IDs. Track unique players, first completion, replay, shared-link acquisition, and next-day returns. Owner/preview exclusions remain active. These events measure behavior, not prize eligibility.

## Validation

`npm test` includes deterministic settlement, first-change ordering, deadline draws, missing trade sequences, cent boundaries, fresh lock anchors, stale data, invalid directions, early/repeated settlement, tampered input, expired offers, origin validation, and concurrent-write rejection. Run the site through `netlify dev` to test both UI and function; Next.js alone does not serve the function.
