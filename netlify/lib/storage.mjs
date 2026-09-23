import { getStore } from "@netlify/blobs";
export const store = () =>
  getStore({
    name:
      process.env.NEWSLETTER_ENV === "production"
        ? "daily-bitcoin-v1"
        : "daily-bitcoin-preview-v1",
    consistency: "strong",
  });
export const json = (body, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function readBody(request) {
  if (Number(request.headers.get("content-length")) > 4096)
    throw new Error("Request too large");
  const text = await request.text();
  if (text.length > 4096) throw new Error("Request too large");
  return JSON.parse(text);
}
export function sameOrigin(request) {
  const from = request.headers.get("origin");
  return from === new URL(request.url).origin;
}
