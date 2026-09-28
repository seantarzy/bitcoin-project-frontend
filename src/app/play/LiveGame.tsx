"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Flame,
  Share2,
  Trophy,
} from "lucide-react";
import { track } from "@/services/analytics";
import { chartSeries, DISPLAY_DELAY_MS } from "@/services/gameChart";
import ScoreShare from "./ScoreShare";
import "./game.css";
type Tick = { time: number; price: number };
type Direction = "up" | "flat" | "down";
type Round = {
  id: string;
  phase: "ready" | "locked" | "done";
  anchor: number;
  flatHalfWidth: number;
  chartHalfSpan: number;
  forecastMs: number;
  bufferMs: number;
  expiresAt: number;
  startsAt?: number;
  endsAt?: number;
  direction?: Direction;
  actualDirection?: Direction;
  outcome?: "win" | "miss" | "void";
  settledPrice?: number;
  reason?: string;
};
type Run = {
  streak: number;
  best: number;
  round: Round;
  serverNow: number;
  history?: Tick[];
};
const usd = (v: number) =>
  v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const labels = { up: "Up", flat: "Flat", down: "Down" };
export default function LiveGame({
  challengeTarget = null,
  embedded = false,
}: {
  challengeTarget?: number | null;
  embedded?: boolean;
}) {
  const [run, setRun] = useState<Run | null>(null),
    [ticks, setTicks] = useState<Tick[]>([]);
  const [now, setNow] = useState(Date.now()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [connected, setConnected] = useState(false),
    [hover, setHover] = useState<Direction | null>(null),
    [shareScore, setShareScore] = useState<number | null>(null);
  const [finish, setFinish] = useState<{ id: string; ticks: Tick[] } | null>(
    null,
  );
  const offset = useRef(0),
    pending = useRef(false),
    seen = useRef("");
  const round = run?.round,
    ready = round?.phase === "ready",
    locked = round?.phase === "locked";
  const apply = useCallback((data: Run) => {
    offset.current = data.serverNow - Date.now();
    setNow(data.serverNow);
    setRun(data);
    setHover(null);
    if (data.history?.length)
      setTicks((old) => {
        const latest = data.history!.at(-1)!.time;
        return [...data.history!, ...old.filter((t) => t.time > latest)].slice(
          -1500,
        );
      });
    if (data.round.phase === "done" && seen.current !== data.round.id) {
      seen.current = data.round.id;
      track("game_round_result", {
        method: "direction_5s",
        outcome: data.round.outcome,
        category: data.round.direction,
      });
    }
  }, []);
  const request = useCallback(
    async (action: string, id?: string, direction?: Direction) => {
      if (pending.current) return;
      pending.current = true;
      setBusy(true);
      setError("");
      try {
        const r = await fetch("/.netlify/functions/game", {
          method: "POST",
          signal: AbortSignal.timeout(12000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, id, direction }),
        });
        const data = await r.json();
        if (!r.ok)
          throw Error(data.error || "Could not connect. Please retry.");
        apply(data);
        if (action === "lock")
          track("game_round_locked", {
            method: "direction_5s",
            category: direction,
          });
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Connection lost. Retry to resume.",
        );
      } finally {
        pending.current = false;
        setBusy(false);
      }
    },
    [apply],
  );
  useEffect(() => {
    track("game_view", {
      method: "direction_5s",
      placement: embedded ? "homepage" : "play",
    });
    void request("prepare");
    let frame = 0,
      lastFrame = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    function animate(time: number) {
      if (time - lastFrame >= (reduced.matches ? 250 : 1000 / 60)) {
        setNow(Date.now() + offset.current);
        lastFrame = time;
      }
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [request, embedded]);
  useEffect(() => {
    let ws: WebSocket,
      retry: ReturnType<typeof setTimeout>,
      stopped = false;
    function connect() {
      ws = new WebSocket("wss://ws-feed.exchange.coinbase.com");
      ws.onopen = () =>
        ws.send(
          JSON.stringify({
            type: "subscribe",
            product_ids: ["BTC-USD"],
            channels: ["ticker"],
          }),
        );
      ws.onmessage = (event) => {
        try {
          const d = JSON.parse(event.data);
          if (d.type !== "ticker") return;
          const tick = { time: Date.parse(d.time), price: Number(d.price) };
          if (
            !Number.isFinite(tick.time) ||
            !Number.isFinite(tick.price) ||
            tick.price <= 0
          )
            return;
          setConnected(true);
          setTicks((old) =>
            tick.time < (old.at(-1)?.time || 0)
              ? old
              : [
                  ...old.filter(
                    (t) => t.time >= tick.time - 60000 && t.time < tick.time,
                  ),
                  tick,
                ].slice(-1500),
          );
        } catch {}
      };
      ws.onerror = () => ws.close();
      ws.onclose = () => {
        setConnected(false);
        if (!stopped) retry = setTimeout(connect, 2500);
      };
    }
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      ws?.close();
    };
  }, []);
  const due = locked && now >= (round.endsAt || 0) + 1600;
  useEffect(() => {
    if (!due || error || busy) return;
    const timer = setTimeout(() => void request("settle", round?.id), 500);
    return () => clearTimeout(timer);
  }, [due, error, busy, request, round?.id]);
  useEffect(() => {
    if (round?.phase === "done" && finish?.id !== round.id)
      setFinish({ id: round.id, ticks });
  }, [round, ticks, finish]);
  const displayTime = now - DISPLAY_DELAY_MS;
  const end = round?.endsAt && !ready ? round.endsAt : displayTime + 6000,
    start = end - 25000;
  const visible = chartSeries(
    round?.phase === "done" && finish?.id === round.id ? finish.ticks : ticks,
    start,
    Math.min(end, displayTime),
  );
  const displayPrice =
    round?.phase === "done" && round.settledPrice !== undefined
      ? round.settledPrice
      : visible.at(-1)?.price;
  const reference = ready
    ? (displayPrice ?? round.anchor)
    : round?.anchor || displayPrice || 0;
  const span = round?.chartHalfSpan || 20,
    flat = round?.flatHalfWidth || 0.01;
  const axisCenter = ready
    ? Math.max(
        reference - span * 0.5,
        Math.min(reference + span * 0.5, round.anchor),
      )
    : reference;
  const min = axisCenter - span,
    max = axisCenter + span;
  const y = (price: number) => 310 - ((price - min) / (max - min)) * 280,
    x = (time: number) => 32 + ((time - start) / 25000) * 716;
  const path = visible
    .map(
      (t, i) =>
        `${i ? "L" : "M"}${x(t.time).toFixed(1)},${y(t.price).toFixed(1)}`,
    )
    .join(" ");
  const upperY = Math.max(30, Math.min(310, y(reference + flat))),
    lowerY = Math.max(30, Math.min(310, y(reference - flat)));
  const last = ticks.at(-1),
    fresh = connected && !!last && now - last.time < 5000;
  const expired = ready && now > round.expiresAt,
    canChoose = ready && !expired && !busy && fresh;
  const remaining = Math.max(
    0,
    Math.min(5, ((round?.endsAt || 0) - displayTime) / 1000),
  );
  const locking = locked && displayTime < (round.startsAt || 0);
  const selected = ready ? hover : round?.direction;
  function choose(direction: Direction) {
    if (canChoose) void request("lock", round.id, direction);
  }
  function share() {
    setShareScore(Math.min(run?.best || 0, 9999));
    track("game_share_opened", { method: "direction_card" });
  }
  const outcome = round?.outcome;
  const zones: [Direction, number, number][] = [
    ["up", 30, upperY - 30],
    ["flat", upperY, Math.max(1, lowerY - upperY)],
    ["down", lowerY, 310 - lowerY],
  ];
  const Shell = embedded ? "section" : "main";
  return (
    <Shell
      id={embedded ? "play" : undefined}
      className={`game-shell ${embedded ? "game-embedded" : ""}`}
      aria-label={embedded ? "Play live Bitcoin" : undefined}
    >
      {!embedded && (
        <nav className="game-nav">
          <Link href="/">
            <ArrowLeft size={17} />
            Bitcoin / in real life
          </Link>
          <Link href="/daily">
            The daily find <ArrowUpRight size={16} />
          </Link>
        </nav>
      )}
      <div className="game-intro">
        <span className="game-kicker">
          <i />
          LIVE BITCOIN / FREE TO PLAY
        </span>
        <h1>
          Catch the <br />
          <em>next move.</em>
        </h1>
        <p>Up, flat, or down? Call Bitcoin’s next five seconds.</p>
      </div>
      {challengeTarget !== null && (
        <div className="game-challenge" role="status">
          <span>FRIEND CHALLENGE</span>
          <strong>
            {(run?.best || 0) > challengeTarget
              ? "Challenge beaten. Set the next record."
              : `Beat ${challengeTarget} ${challengeTarget === 1 ? "call" : "calls"} in a row.`}
          </strong>
          <small>Live markets change. Every run is its own challenge.</small>
        </div>
      )}
      <section className="game-arena" aria-label="Live Bitcoin prediction game">
        <div className="game-score">
          <span>
            <Flame size={20} />
            STREAK <strong>{run?.streak || 0}</strong>
          </span>
          <span>
            <Trophy size={18} />
            BEST <strong>{run?.best || 0}</strong>
          </span>
          <span className={fresh ? "feed-live" : "feed-wait"}>
            <i />
            {fresh ? "LIVE" : "CONNECTING"}
          </span>
        </div>
        <div className="game-chart-head">
          <div>
            <small>BTC / USD · COINBASE</small>
            <strong>
              {displayPrice !== undefined
                ? usd(displayPrice)
                : "Connecting to Bitcoin…"}
            </strong>
            <span className="game-display-note">
              Smoothed live feed · 0.8s visual delay
            </span>
          </div>
          <div className="game-clock">
            {locked ? (
              <>
                <strong>
                  {remaining.toFixed(1)}
                  <small>s</small>
                </strong>
                <span>
                  {locking
                    ? "LOCKING YOUR CALL"
                    : remaining > 0
                      ? `${labels[round.direction!].toUpperCase()} LOCKED`
                      : "VERIFYING RESULT"}
                </span>
              </>
            ) : (
              <>
                <span className="direction-glyph">↗ → ↘</span>
                <span>{ready ? "MAKE YOUR CALL" : "YOUR NEXT MOVE"}</span>
              </>
            )}
          </div>
        </div>
        <svg
          className={`game-chart direction-chart ${canChoose ? "can-choose" : ""}`}
          viewBox="0 0 800 350"
          preserveAspectRatio="none"
          role="img"
          aria-label="Live chart with Up, Flat, and Down zones. Use the matching buttons below to make a prediction."
        >
          <defs>
            <clipPath id="direction-plot">
              <rect x="28" y="30" width="720" height="280" />
            </clipPath>
          </defs>
          {round &&
            zones.map(([direction, top, height]) => (
              <rect
                key={direction}
                className={`direction-zone zone-${direction} ${selected === direction ? "zone-active" : ""}`}
                x="28"
                y={top}
                width="720"
                height={height}
                onPointerEnter={() => {
                  if (canChoose) setHover(direction);
                }}
                onPointerLeave={() => setHover(null)}
                onClick={() => choose(direction)}
              />
            ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} pointerEvents="none">
              <line
                x1="28"
                x2="748"
                y1={30 + i * 70}
                y2={30 + i * 70}
                stroke="#ffffff0c"
              />
              <text
                x="740"
                y={25 + i * 70}
                textAnchor="end"
                fill="#87917f"
                fontSize="11"
              >
                {usd(max - (i * (max - min)) / 4)}
              </text>
            </g>
          ))}
          <g clipPath="url(#direction-plot)" pointerEvents="none">
            <line
              x1="28"
              x2="748"
              y1={y(reference)}
              y2={y(reference)}
              stroke="#f4e997"
              strokeDasharray="4 5"
              opacity=".7"
            />
            <path
              d={path}
              fill="none"
              stroke="#f6f7f2"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {visible.length > 0 && (
              <circle
                cx={x(visible.at(-1)!.time)}
                cy={y(visible.at(-1)!.price)}
                r="5"
                fill="#f6f7f2"
              />
            )}
            {round?.settledPrice !== undefined && (
              <circle
                cx="748"
                cy={y(round.settledPrice)}
                r="7"
                fill={outcome === "win" ? "#c5ff5d" : "#f9b08b"}
              />
            )}
          </g>
          {round && (
            <g pointerEvents="none" className="direction-zone-labels">
              <text
                x="60"
                y={Math.max(55, upperY - 15)}
                fill="#c5ff5d"
                fontSize="18"
              >
                ↑ UP {hover === "up" && canChoose ? "· CLICK TO CALL" : ""}
              </text>
              <text
                x="60"
                y={Math.min(297, lowerY + 28)}
                fill="#f4ad9b"
                fontSize="18"
              >
                ↓ DOWN {hover === "down" && canChoose ? "· CLICK TO CALL" : ""}
              </text>
              <text
                x="733"
                y={y(reference) - 7}
                textAnchor="end"
                fill="#f4e997"
                fontSize="12"
              >
                {ready ? "CURRENT" : "START"} {usd(reference)}
              </text>
            </g>
          )}
          <text x="748" y="343" fill="#c5ff5d" textAnchor="end" fontSize="11">
            {locked ? "FINISH" : "CHOOSE A ZONE"}
          </text>
          <text x="28" y="343" fill="#9baa93" fontSize="11">
            FLAT = WITHIN {usd(flat)} OF{" "}
            {ready ? "THE START PRICE" : "YOUR START PRICE"}
          </text>
        </svg>
        <div className="game-controls">
          {ready && (
            <>
              <div className="direction-question">
                <h2>Where will it finish?</h2>
                <p>Tap a shaded area or pick your call below.</p>
              </div>
              <div className="direction-options">
                {(["up", "flat", "down"] as Direction[]).map((direction) => (
                  <button
                    key={direction}
                    className={`direction-option option-${direction} ${hover === direction ? "option-active" : ""}`}
                    disabled={!canChoose}
                    onPointerEnter={() => setHover(direction)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(direction)}
                    onBlur={() => setHover(null)}
                    onClick={() => choose(direction)}
                  >
                    {direction === "up" ? (
                      <ArrowUp size={23} />
                    ) : direction === "down" ? (
                      <ArrowDown size={23} />
                    ) : (
                      <Minus size={23} />
                    )}
                    <strong>{labels[direction]}</strong>
                    <small>
                      {direction === "up"
                        ? `Above ${usd(reference + flat)}`
                        : direction === "down"
                          ? `Below ${usd(reference - flat)}`
                          : `±${usd(flat)} of start`}
                    </small>
                  </button>
                ))}
              </div>
              {expired ? (
                <button
                  className="game-primary direction-refresh"
                  disabled={busy}
                  onClick={() => void request("prepare")}
                >
                  Refresh round <ArrowUpRight size={18} />
                </button>
              ) : (
                <p className="game-footnote">
                  {busy
                    ? "Locking your call and checking the start price…"
                    : "One tap locks your call · 1s lock-in + 5s forecast"}
                </p>
              )}
              <p className="direction-start-note">
                Zones follow the price until you choose. The server then locks
                the official start price.
              </p>
            </>
          )}
          {locked && (
            <div className={`game-watching ${locking ? "is-locking" : ""}`}>
              <span className="watch-dot" />
              <h2>
                {locking
                  ? "Locking your call…"
                  : remaining > 0
                    ? `${labels[round.direction!]} is your call. Watch the line.`
                    : "Checking the official finish…"}
              </h2>
              <p>
                Start: <strong>{usd(round.anchor)}</strong> · Flat:{" "}
                {usd(round.anchor - flat)} – {usd(round.anchor + flat)}
                <br />
                Your start price stays fixed until the round ends.
              </p>
            </div>
          )}
          {round?.phase === "done" && (
            <div className={`game-result result-${outcome}`} aria-live="polite">
              <span className="result-label">
                {outcome === "win"
                  ? "CALLED IT"
                  : outcome === "miss"
                    ? "WRONG WAY"
                    : "ROUND VOIDED"}
              </span>
              <h2>
                {outcome === "win"
                  ? `${run!.streak} in a row. Keep it going.`
                  : outcome === "miss"
                    ? "New round. Fresh start."
                    : "Your streak is safe."}
              </h2>
              <p>
                {round.reason ||
                  `You called ${labels[round.direction!]}. It finished ${labels[round.actualDirection!]}.`}
                <br />
                {round.settledPrice !== undefined &&
                  `Start ${usd(round.anchor)} → Finish ${usd(round.settledPrice)}`}
              </p>
              <button
                className="game-primary"
                disabled={busy}
                onClick={() => {
                  track("game_replay", { method: "direction_5s", outcome });
                  void request("prepare");
                }}
              >
                {busy
                  ? "Getting the next round…"
                  : outcome === "win"
                    ? "Make the next call"
                    : "Play again"}
                <ArrowUpRight size={20} />
              </button>
              <button className="game-share" onClick={share}>
                <Share2 size={16} />
                Share score card · Challenge a friend
              </button>
            </div>
          )}
          {!round && (
            <div className="game-watching">
              <h2>
                {busy ? "Connecting to the market…" : "Ready when you are."}
              </h2>
              <p>Real Bitcoin. Three choices. Five seconds.</p>
              {!busy && (
                <button
                  className="game-primary"
                  onClick={() => void request("prepare")}
                >
                  Connect to the game
                </button>
              )}
            </div>
          )}
          {error && (
            <div className="game-error" role="alert">
              {error}
              <button
                onClick={() =>
                  void request(locked ? "settle" : "prepare", round?.id)
                }
              >
                Retry / resume
              </button>
            </div>
          )}
        </div>
      </section>
      {!embedded && (
        <>
          <div className="game-how">
            <div>
              <span>01 / CALL IT</span>
              <p>Up, flat, or down? Tap your prediction to lock it.</p>
            </div>
            <div>
              <span>02 / WATCH</span>
              <p>
                Five seconds of real Bitcoin movement. One fixed start price.
              </p>
            </div>
            <div>
              <span>03 / KEEP GOING</span>
              <p>
                Right call, longer streak. Wrong call, fresh start. Same rules
                every round.
              </p>
            </div>
          </div>
          <aside className="game-future">
            <div>
              <span className="game-kicker">JUST HERE FOR THE FUN</span>
              <h2>
                Big streak energy.
                <br />
                Zero money on the line.
              </h2>
              <p>
                Free play. No deposits. No wallet. We’re exploring future
                rewards; today’s scores have no cash or token value and don’t
                promise future rewards.
              </p>
            </div>
            <Link
              href="/daily#subscribe"
              onClick={() =>
                track("game_newsletter_click", { placement: "game" })
              }
            >
              Get the Daily Bitcoin <ArrowUpRight size={18} />
            </Link>
          </aside>
        </>
      )}
      <details className="game-rules">
        <summary>How Up, Flat, Down and fair play work</summary>
        <p>
          Reference market: Coinbase Exchange BTC/USD. Before you choose, zones
          follow the smoothed live price. When the server accepts your choice it
          fetches the latest trade and fixes the official start price, which may
          differ slightly from the preview. A one-second lock-in precedes the
          five-second forecast.
        </p>
        <p>
          Flat means within the displayed dollar tolerance of the start price,
          including both boundaries and an exactly unchanged price. Up is
          strictly above that zone; Down is strictly below it. The tolerance is
          15% of a recent typical five-second move, with a one-cent minimum. It
          adapts to the market, never to your streak. The official finish is the
          time-weighted last-trade price over the final second, rounded to
          cents. Every verified result has exactly one outcome.
        </p>
        <p>
          The chart keeps its 800ms visual buffer to smoothly interpolate
          received trades. It never predicts future prices or changes server
          timing. Missing or stale settlement data voids the round and preserves
          your streak; verification more than 60 seconds late ends the run. Your
          streak and personal best are saved in this browser using a game
          cookie. Scores from previous modes are archived separately. No prizes
          or competitive leaderboard are offered in this beta.
        </p>
      </details>
      {shareScore !== null && (
        <ScoreShare score={shareScore} onClose={() => setShareScore(null)} />
      )}
    </Shell>
  );
}
