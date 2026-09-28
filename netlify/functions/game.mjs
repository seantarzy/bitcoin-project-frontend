import { randomBytes, createHash } from "node:crypto";
import { store, readBody, sameOrigin } from "../lib/storage.mjs";
import {
  makeOffer,
  marketTrades,
  settlement,
  BUFFER_MS,
  FORECAST_MS,
} from "../lib/game.mjs";
export const createGame =
  ({ getStore = store, getTrades = marketTrades, clock = Date.now } = {}) =>
  async (request) => {
    const headers = {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    };
    const reply = (data, status = 200) =>
      new Response(JSON.stringify({ ...data, serverNow: clock() }), {
        status,
        headers,
      });
    if (request.method !== "POST")
      return reply({ error: "Method not allowed" }, 405);
    if (!sameOrigin(request)) return reply({ error: "Invalid origin" }, 403);
    try {
      const body = await readBody(request);
      if (!["prepare", "lock", "settle"].includes(body.action))
        return reply({ error: "Invalid action" }, 400);
      let token = request.headers
        .get("cookie")
        ?.match(/(?:^|; )bitcoin_game=([a-f0-9]{64})(?:;|$)/)?.[1];
      if (!token) {
        if (body.action !== "prepare")
          return reply({ error: "Start a new round first." }, 400);
        token = randomBytes(32).toString("hex");
        headers["Set-Cookie"] =
          `bitcoin_game=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`;
      }
      const db = getStore(),
        key = `game-runs/${createHash("sha256").update(token).digest("hex")}`;
      const saved = await db.getWithMetadata(key, { type: "json" });
      const run = saved?.data || { streak: 0, best: 0, round: null };
      const commit = async () => {
        const result = await db.setJSON(
          key,
          run,
          saved ? { onlyIfMatch: saved.etag } : { onlyIfNew: true },
        );
        if (!result.modified)
          throw new Error("Another tab updated this game. Reload to resume.");
      };
      if (body.action === "prepare") {
        if (run.round?.phase === "locked") return reply(run);
        const trades = await getTrades(),
          now = clock();
        if (
          !run.round ||
          run.round.phase !== "ready" ||
          run.round.expiresAt < now
        ) {
          run.round = {
            id: randomBytes(16).toString("hex"),
            phase: "ready",
            ...makeOffer(trades, run.streak, now),
          };
          await commit();
        }
        return reply({
          ...run,
          history: trades.filter((t) => t.time >= now - 45000),
        });
      }
      if (body.id !== run.round?.id)
        return reply(
          { error: "This round is no longer active. Reload to resume." },
          409,
        );
      if (body.action === "lock") {
        if (run.round.phase === "locked" || run.round.phase === "done")
          return reply(run);
        const now = clock(),
          r = run.round;
        if (r.expiresAt < now)
          return reply(
            { error: "Target expired. Refresh the target and try again." },
            409,
          );
        if (
          !Number.isFinite(body.center) ||
          Math.abs(body.center - r.anchor) > r.halfWidth * 3
        )
          return reply({ error: "Choose a target inside the chart." }, 400);
        run.round = {
          ...r,
          phase: "locked",
          low: body.center - r.halfWidth,
          high: body.center + r.halfWidth,
          startsAt: now + BUFFER_MS,
          endsAt: now + BUFFER_MS + FORECAST_MS,
        };
        await commit();
        return reply(run);
      }
      if (run.round.phase === "done") return reply(run);
      if (run.round.phase !== "locked")
        return reply({ error: "Lock a prediction first." }, 400);
      if (clock() < run.round.endsAt + 1500) return reply(run);
      let result;
      try {
        result = settlement(await getTrades(), run.round, clock());
      } catch {
        result = {
          outcome: "void",
          reason: "Market feed unavailable. Your streak is safe.",
        };
      }
      if (!result) return reply(run);
      run.streak =
        result.outcome === "win"
          ? run.streak + 1
          : result.outcome === "miss"
            ? 0
            : run.streak;
      run.best = Math.max(run.best, run.streak);
      run.round = { ...run.round, ...result, phase: "done" };
      await commit();
      return reply(run);
    } catch (e) {
      return reply({ error: e.message || "Game unavailable. Try again." }, 503);
    }
  };

export default createGame();
