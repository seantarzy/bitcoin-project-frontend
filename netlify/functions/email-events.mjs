import { Webhook } from "svix";
import { store, json } from "../lib/storage.mjs";
import { hash } from "../lib/core.mjs";
export default async (request) => {
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);
  if (!process.env.RESEND_WEBHOOK_SECRET)
    return json({ error: "Webhook not configured" }, 503);
  try {
    const event = new Webhook(process.env.RESEND_WEBHOOK_SECRET).verify(
      await request.text(),
      Object.fromEntries(request.headers),
    );
    if (["email.bounced", "email.complained"].includes(event.type)) {
      const db = store();
      for (const email of event.data.to || []) {
        const key = `subscribers/${hash(email.toLowerCase())}`;
        const sub = await db.get(key, { type: "json" });
        if (sub) {
          sub.status = "suppressed";
          sub.suppressedAt = new Date().toISOString();
          await db.setJSON(key, sub);
        }
      }
    }
    return json({ ok: true });
  } catch {
    return json({ error: "Invalid event" }, 400);
  }
};
