"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Flame,
  Crosshair,
  Share2,
  Trophy,
} from "lucide-react";
import { track } from "@/services/analytics";
import "./game.css";
type Tick = { time: number; price: number };
type Round = {
  id: string;
  phase: "ready" | "locked" | "done";
  anchor: number;
  halfWidth: number;
  expiresAt: number;
  startsAt?: number;
  endsAt?: number;
  low?: number;
  high?: number;
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
export default function LiveGame() {
  const [run, setRun] = useState<Run | null>(null),
    [ticks, setTicks] = useState<Tick[]>([]),
    [center, setCenter] = useState(0);
  const [now, setNow] = useState(Date.now()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [connection, setConnection] = useState(false),
    [shared, setShared] = useState("");
  const [finish, setFinish] = useState<{ id: string; ticks: Tick[] } | null>(
    null,
  );
  const offset = useRef(0),
    pending = useRef(false),
    seen = useRef(""),
    chart = useRef<SVGSVGElement>(null);
  const round = run?.round,
    locked = round?.phase === "locked",
    ready = round?.phase === "ready";
  const apply = useCallback((data: Run) => {
    offset.current = data.serverNow - Date.now();
    setNow(data.serverNow);
    setRun(data);
    if (data.round.phase === "ready") setCenter(data.round.anchor);
    if (data.history?.length) setTicks(data.history);
    if (data.round.phase === "done" && seen.current !== data.round.id) {
      seen.current = data.round.id;
      track("game_round_result", {
        outcome: data.round.outcome,
        method: "live",
      });
    }
  }, []);
  const request = useCallback(
    async (action: string, id?: string, target?: number) => {
      if (pending.current) return;
      pending.current = true;
      setBusy(true);
      setError("");
      try {
        const r = await fetch("/.netlify/functions/game", {
          method: "POST",
          signal: AbortSignal.timeout(12000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, id, center: target }),
        });
        const data = await r.json();
        if (!r.ok)
          throw new Error(data.error || "Game unavailable. Please retry.");
        apply(data);
        if (action === "lock") track("game_round_locked", { method: "live" });
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Connection lost. Retry to resume your round.",
        );
      } finally {
        pending.current = false;
        setBusy(false);
      }
    },
    [apply],
  );
  useEffect(() => {
    track("game_view", { method: "live" });
    void request("prepare");
    const timer = setInterval(() => setNow(Date.now() + offset.current), 100);
    return () => clearInterval(timer);
  }, [request]);
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
          setConnection(true);
          setTicks((old) =>
            [
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
        setConnection(false);
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
  const last = ticks.at(-1),
    fresh = connection && !!last && now - last.time < 5000;
  const anchor = round?.anchor || last?.price || 0,
    width = round?.halfWidth || 10;
  const min = anchor - width * 4.6,
    max = anchor + width * 4.6;
  const y = (p: number) => 310 - ((p - min) / (max - min)) * 280;
  const end = round?.endsAt && !ready ? round.endsAt : now + 12000;
  const start = end - 45000,
    x = (t: number) => 32 + ((t - start) / 45000) * 716;
  useEffect(() => {
    if (round?.phase === "done" && finish?.id !== round.id)
      setFinish({ id: round.id, ticks });
  }, [round, ticks, finish]);
  const visible = (
    round?.phase === "done" && finish?.id === round.id ? finish.ticks : ticks
  ).filter((t) => t.time >= start && t.time <= end);
  const path = visible
    .map(
      (t, i) =>
        `${i ? "L" : "M"}${x(t.time).toFixed(1)},${y(t.price).toFixed(1)}`,
    )
    .join(" ");
  const selected = ready
    ? center
    : ((round?.low || 0) + (round?.high || 0)) / 2;
  const remaining = Math.max(0, ((round?.endsAt || 0) - now) / 1000);
  const expired = ready && now > round.expiresAt;
  function drag(e: React.PointerEvent<SVGSVGElement>) {
    if (!ready || busy || expired) return;
    const box = chart.current!.getBoundingClientRect();
    const pos = ((e.clientY - box.top) / box.height) * 350;
    const value = max - ((pos - 30) / 280) * (max - min);
    setCenter(
      Math.round(
        Math.max(anchor - width * 3, Math.min(anchor + width * 3, value)) * 100,
      ) / 100,
    );
  }
  async function share() {
    const text = `I caught ${run?.best || 0} Bitcoin moves in a row. Can you beat my streak?`;
    try {
      await navigator.clipboard.writeText(
        `${text} https://whatsbitcoinsprice.com/play?utm_source=player&utm_medium=share&utm_campaign=live_game`,
      );
      setShared("Challenge link copied");
      track("game_share", { method: "copy" });
    } catch {
      setShared("Share this page: whatsbitcoinsprice.com/play");
    }
  }
  const outcome = round?.outcome;
  return (
    <main className="game-shell">
      <nav className="game-nav">
        <Link href="/">
          <ArrowLeft size={17} /> Bitcoin / in real life
        </Link>
        <Link href="/daily">
          The daily find <ArrowUpRight size={16} />
        </Link>
      </nav>
      <div className="game-intro">
        <span className="game-kicker">
          <i /> LIVE BITCOIN / FREE TO PLAY
        </span>
        <h1>
          Catch the <br />
          <em>next move.</em>
        </h1>
        <p>Ten seconds. One target. How long can you keep your streak alive?</p>
      </div>
      <section className="game-arena" aria-label="Live Bitcoin prediction game">
        <div className="game-score">
          <span>
            <Flame size={20} /> STREAK <strong>{run?.streak || 0}</strong>
          </span>
          <span>
            <Trophy size={18} /> BEST <strong>{run?.best || 0}</strong>
          </span>
          <span className={fresh ? "feed-live" : "feed-wait"}>
            <i />
            {fresh ? "LIVE" : "CONNECTING"}
          </span>
        </div>
        <div className="game-chart-head">
          <div>
            <small>BTC / USD · COINBASE</small>
            <strong>{last ? usd(last.price) : "Connecting to Bitcoin…"}</strong>
          </div>
          <div className="game-clock">
            {locked ? (
              <>
                <strong>
                  {remaining.toFixed(1)}
                  <small>s</small>
                </strong>
                <span>
                  {now < (round.startsAt || 0)
                    ? "LOCK-IN BUFFER"
                    : remaining > 0
                      ? "FOLLOW THE PRICE"
                      : "VERIFYING RESULT"}
                </span>
              </>
            ) : (
              <>
                <Crosshair size={25} />
                <span>{ready ? "DRAG YOUR TARGET" : "YOUR NEXT MOVE"}</span>
              </>
            )}
          </div>
        </div>
        <svg
          ref={chart}
          className={`game-chart ${ready ? "can-drag" : ""}`}
          viewBox="0 0 800 350"
          preserveAspectRatio="none"
          role="img"
          aria-label="Live Bitcoin chart. Use the target slider below to choose your price range."
          onPointerDown={(e) => {
            if (ready) {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag(e);
            }
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) drag(e);
          }}
        >
          <defs>
            <linearGradient id="target-fill">
              <stop stopColor="#c5ff5d" stopOpacity=".03" />
              <stop offset="1" stopColor="#c5ff5d" stopOpacity=".24" />
            </linearGradient>
            <clipPath id="plot-clip">
              <rect x="0" y="15" width="800" height="310" />
            </clipPath>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line
                x1="25"
                x2="760"
                y1={30 + i * 70}
                y2={30 + i * 70}
                stroke="#ffffff0e"
              />
              <text
                x="758"
                y={24 + i * 70}
                textAnchor="end"
                fill="#7b8581"
                fontSize="11"
              >
                {usd(max - (i * (max - min)) / 4)}
              </text>
            </g>
          ))}
          <g clipPath="url(#plot-clip)">
            {round && (
              <>
                <rect
                  x="28"
                  y={y(selected + width)}
                  width="720"
                  height={y(selected - width) - y(selected + width)}
                  rx="5"
                  fill="url(#target-fill)"
                  stroke="#c5ff5d"
                  strokeDasharray={ready ? "5 5" : "0"}
                  opacity=".85"
                />
                <line
                  x1="28"
                  x2="748"
                  y1={y(selected)}
                  y2={y(selected)}
                  stroke="#c5ff5d"
                  opacity=".25"
                />
              </>
            )}
            <line
              x1="748"
              x2="748"
              y1="20"
              y2="320"
              stroke="#c5ff5d"
              strokeDasharray="3 6"
              opacity=".5"
            />
            {round?.settledPrice !== undefined && (
              <circle
                cx="748"
                cy={y(round.settledPrice)}
                r="7"
                fill={outcome === "win" ? "#c5ff5d" : "#f9b08b"}
              />
            )}
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
                fill="#c5ff5d"
              />
            )}
          </g>
          <text x="748" y="343" fill="#c5ff5d" textAnchor="end" fontSize="11">
            FINISH
          </text>
          <text x="28" y="343" fill="#7b8581" fontSize="11">
            REAL MARKET. YOUR CALL.
          </text>
        </svg>
        <div className="game-controls">
          {ready && (
            <>
              <label htmlFor="target">
                Your landing zone{" "}
                <strong>
                  {usd(center - width)} – {usd(center + width)}
                </strong>
              </label>
              <input
                id="target"
                aria-label="Target price center"
                type="range"
                min={anchor - width * 3}
                max={anchor + width * 3}
                step="0.01"
                value={center}
                disabled={busy || expired}
                onChange={(e) => setCenter(Number(e.target.value))}
              />
              <div className="target-hints">
                <span>Lower</span>
                <span>Drag the band or move the slider</span>
                <span>Higher</span>
              </div>
              <button
                className="game-primary"
                disabled={busy || (!fresh && !expired)}
                onClick={() =>
                  void request(expired ? "prepare" : "lock", round.id, center)
                }
              >
                {busy
                  ? "Locking…"
                  : expired
                    ? "Refresh target"
                    : "Lock my prediction"}{" "}
                <ArrowUpRight size={20} />
              </button>
              <p className="game-footnote">
                {expired
                  ? "Your target expired. Refresh for current volatility."
                  : `10-second forecast after a 2-second buffer · Target width ${usd(width * 2)}`}
              </p>
            </>
          )}
          {locked && (
            <div className="game-watching">
              <span className="watch-dot" />
              <h2>
                {remaining > 0
                  ? "Prediction locked. Eyes on the line."
                  : "Checking the official finish…"}
              </h2>
              <p>
                {usd(round.low!)} – {usd(round.high!)}
                <br />
                Your band stays fixed. The market makes the next move.
              </p>
            </div>
          )}
          {round?.phase === "done" && (
            <div className={`game-result result-${outcome}`} aria-live="polite">
              <span className="result-label">
                {outcome === "win"
                  ? "CAUGHT IT"
                  : outcome === "miss"
                    ? "JUST MISSED"
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
                  `Official finish: ${usd(round.settledPrice!)} · Your band: ${usd(round.low!)} – ${usd(round.high!)}`}
              </p>
              <button
                className="game-primary"
                disabled={busy}
                onClick={() => {
                  track("game_replay", { outcome });
                  void request("prepare");
                }}
              >
                {busy
                  ? "Finding your next target…"
                  : outcome === "win"
                    ? "Catch the next one"
                    : "Play again"}{" "}
                <ArrowUpRight size={20} />
              </button>
              <button className="game-share" onClick={share}>
                <Share2 size={16} />
                {shared || "Challenge a friend"}
              </button>
            </div>
          )}
          {!round && (
            <div className="game-watching">
              <h2>{busy ? "Reading the market…" : "Ready when you are."}</h2>
              <p>We size your target to Bitcoin’s recent movement.</p>
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
      <div className="game-how">
        <div>
          <span>01 / AIM</span>
          <p>Slide your band to where Bitcoin will land.</p>
        </div>
        <div>
          <span>02 / WATCH</span>
          <p>Lock it. Follow ten seconds of real market movement.</p>
        </div>
        <div>
          <span>03 / REPEAT</span>
          <p>
            Catch the finish. Build your streak. Targets tighten every two wins.
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
            Free play. No deposits. No wallet. We’re exploring future rewards;
            today’s scores have no cash or token value and don’t promise future
            rewards.
          </p>
        </div>
        <Link
          href="/daily#subscribe"
          onClick={() => track("game_newsletter_click", { placement: "game" })}
        >
          Get the Daily Bitcoin <ArrowUpRight size={18} />
        </Link>
      </aside>
      <details className="game-rules">
        <summary>How pricing, timing, and fair play work</summary>
        <p>
          Reference market: Coinbase Exchange BTC/USD. Targets use recent
          10-second price moves and stay fixed for the round. After the server
          accepts your prediction, a 2-second buffer precedes the 10-second
          forecast. The official finish is the time-weighted last-trade price
          over the final second, calculated on the server—not the last dot on
          your screen. Boundaries count as a hit.
        </p>
        <p>
          Network delays can make the displayed chart differ from settlement.
          Missing or stale settlement data voids the round and preserves your
          streak. Keep the tab open for verification; returning more than 60
          seconds after the finish ends your streak. Your streak and best are
          saved for this browser with a game cookie. No competitive leaderboard
          or prizes are offered in this beta.
        </p>
      </details>
    </main>
  );
}
