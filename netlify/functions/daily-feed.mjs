import { store, json } from "../lib/storage.mjs";
export default async () => {
  try {
    const db = store();
    const { blobs } = await db.list({ prefix: "editions/" });
    const keys = blobs
      .map((b) => b.key)
      .sort()
      .reverse()
      .slice(0, 30);
    const editions = await Promise.all(
      keys.map((k) => db.get(k, { type: "json" })),
    );
    return json({ editions: editions.filter(Boolean) });
  } catch {
    return json({ error: "Daily archive temporarily unavailable" }, 503);
  }
};
