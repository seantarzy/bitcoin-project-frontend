import { store, json, readBody, sameOrigin } from "../lib/storage.mjs";
import { hash, token } from "../lib/core.mjs";
export default async (request) => {
  try {
    if (request.method !== "POST")
      return json({ error: "Method not allowed" }, 405);
    if (!sameOrigin(request)) return json({ error: "Invalid origin" }, 403);
    const { edition, choice } = await readBody(request);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(edition) ||
      !["trade", "hold"].includes(choice)
    )
      return json({ error: "Invalid vote" }, 400);
    const db = store();
    if (!(await db.get(`editions/${edition}`)))
      return json({ error: "Edition unavailable" }, 404);
    const cookie =
      request.headers
        .get("cookie")
        ?.match(/(?:^|; )daily_voter=([a-f0-9]{64})(?:;|$)/)?.[1] || token();
    await db.setJSON(`votes/${edition}/${hash(cookie)}`, { choice });
    return new Response(
      JSON.stringify({ message: "Vote saved. Come back for the next find." }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Set-Cookie": `daily_voter=${cookie}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`,
        },
      },
    );
  } catch {
    return json({ error: "Could not save your vote" }, 503);
  }
};
