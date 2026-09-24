import {
  kitSelected,
  kitReady,
  enrollKit,
  unsubscribeKit,
  syncKitPreferences,
  kitRequest,
  kitStatus,
} from "../lib/kit.mjs";
import { store, json, readBody, sameOrigin } from "../lib/storage.mjs";
import {
  preferences,
  hash,
  token,
  ready,
  origin,
  escape,
} from "../lib/core.mjs";
import { send } from "../lib/mail.mjs";
export default async (request, context) => {
  try {
    const db = store();
    const url = new URL(request.url);
    if (request.method === "GET")
      return json({ sendingEnabled: kitSelected() ? kitReady() : ready() });
    if (request.method !== "POST")
      return json({ error: "Method not allowed" }, 405);
    const unsubscribe = url.searchParams.get("unsubscribe");
    if (unsubscribe) {
      const id = await db.get(`tokens/${hash(unsubscribe)}`);
      if (id) {
        const sub = await db.get(`subscribers/${id}`, { type: "json" });
        if (sub && sub.token === unsubscribe) {
          if (sub.provider === "kit") await unsubscribeKit(sub);
          sub.status = "unsubscribed";
          await db.setJSON(`subscribers/${id}`, sub);
        }
      }
      return json({ message: "Unsubscribed." });
    }
    if (!sameOrigin(request))
      return json({ error: "Invalid request origin" }, 403);
    const body = await readBody(request);
    if (body.website)
      return json({
        message: "Check your inbox.",
        outcome: "request_accepted",
      });
    if (body.token) {
      const id = await db.get(`tokens/${hash(String(body.token))}`);
      const sub = id && (await db.get(`subscribers/${id}`, { type: "json" }));
      if (!sub || sub.token !== body.token)
        return json({ error: "This link is invalid." }, 400);
      if (
        sub.provider === "kit" &&
        sub.kitId &&
        ["read", "confirm"].includes(body.action)
      ) {
        const result = await kitRequest(`/subscribers/${sub.kitId}`);
        sub.status = kitStatus(result.subscriber.state);
        await db.setJSON(`subscribers/${id}`, sub);
        if (body.action === "confirm")
          return json({
            message:
              sub.status === "confirmed"
                ? "Your subscription is confirmed."
                : "Please use the confirmation button in your Kit email.",
            status: sub.status,
          });
      }
      if (body.action === "read")
        return json({
          frequency: sub.frequency,
          btc: sub.btc,
          status: sub.status,
        });
      if (body.action === "confirm") {
        if (["unsubscribed", "suppressed"].includes(sub.status))
          return json({ error: "Please subscribe again on the site." }, 400);
        sub.status = "confirmed";
        sub.confirmedAt = new Date().toISOString();
      } else if (body.action === "unsubscribe") {
        if (sub.provider === "kit") await unsubscribeKit(sub);
        sub.status = "unsubscribed";
      } else if (body.action === "update") {
        const prefs = preferences({ ...body, email: sub.email });
        sub.btc = prefs.btc;
        sub.frequency = prefs.frequency;
        if (sub.provider === "kit") await syncKitPreferences(sub);
      } else return json({ error: "Unknown action" }, 400);
      await db.setJSON(`subscribers/${id}`, sub);
      return json({
        message:
          body.action === "unsubscribe"
            ? "You are unsubscribed."
            : "Saved. Thank you!",
        status: sub.status,
      });
    }
    const prefs = preferences(body);
    if (body.consent !== true)
      return json({ error: "Please agree to receive the newsletter." }, 400);
    const ipKey = `limits/${hash(context.ip || "unknown")}/${Math.floor(Date.now() / 3600000)}`;
    const count = Number((await db.get(ipKey)) || 0);
    if (count >= 5) return json({ error: "Please try again in an hour." }, 429);
    await db.set(ipKey, String(count + 1));
    const id = hash(prefs.email);
    const existing = await db.get(`subscribers/${id}`, { type: "json" });
    if (["confirmed", "suppressed"].includes(existing?.status))
      return json({
        message:
          "If this address is already subscribed, use the preferences link in your email. Otherwise, check your inbox.",
        outcome: "request_accepted",
      });
    // Do not allow anonymous resubmission to overwrite pending preferences or rotate its token.
    const sub =
      existing?.status === "pending"
        ? existing
        : {
            ...prefs,
            status: "pending",
            token: token(),
            createdAt: new Date().toISOString(),
            consentVersion: "2026-09-23",
          };
    await db.setJSON(`subscribers/${id}`, sub);
    await db.set(`tokens/${hash(sub.token)}`, id);
    if (kitSelected() && kitReady()) {
      await enrollKit(sub, (value) => db.setJSON(`subscribers/${id}`, value));
      return json({
        message:
          "Check your inbox for your Daily Bitcoin confirmation. If already subscribed, use the preferences link in your email.",
        outcome: "confirmation_requested",
      });
    }
    if (!kitSelected() && ready()) {
      const confirmationKey = `confirmations/${hash(sub.token)}`;
      if (await db.get(confirmationKey))
        return json({
          message: "Check your inbox for your confirmation link.",
          outcome: "confirmation_requested",
        });
      await send(
        sub.email,
        "Confirm your Daily Bitcoin subscription",
        `<h1>Your daily dose of possibility.</h1><p>One surprising real listing. Prices checked at the source. Your chosen perspective: ${escape(sub.btc)} BTC, ${escape(sub.frequency)}.</p><p><a style="color:#dafa5c" href="${origin}/newsletter#token=${sub.token}&confirm=1">Confirm my subscription</a></p>`,
        `confirm-${sub.token}`,
        sub.token,
      );
      await db.set(confirmationKey, "sent");
      return json({
        message: "Check your inbox to confirm your subscription.",
        outcome: "confirmation_requested",
      });
    }
    return json({
      message:
        "You’re on the early-access list. We’ll send a confirmation email when delivery launches; daily emails have not started yet.",
      outcome: "early_access",
    });
  } catch (error) {
    console.error("Newsletter request failed", error.message);
    return json(
      {
        error:
          error.message.startsWith("Enter") ||
          error.message.startsWith("Choose")
            ? error.message
            : "We couldn’t complete that request. Please try again.",
      },
      400,
    );
  }
};
