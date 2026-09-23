import { origin, escape, ready } from "./core.mjs";
export async function send(to, subject, content, key, manageToken) {
  if (!ready()) throw new Error("Email configuration is incomplete");
  const url = `${origin}/newsletter#token=${manageToken}`;
  const footer = `<p><a href="${url}">Manage preferences or unsubscribe</a></p><p>${escape(process.env.NEWSLETTER_POSTAL_ADDRESS)}</p>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: JSON.stringify({
      from: process.env.NEWSLETTER_FROM,
      to: [to],
      subject,
      html: `<div style="background:#141514;color:#f6f4ea;padding:36px;font-family:Arial;max-width:600px"><p style="color:#dafa5c">BITCOIN / IN REAL LIFE</p>${content}<hr>${footer}</div>`,
      headers: {
        "List-Unsubscribe": `<${origin}/.netlify/functions/newsletter?unsubscribe=${manageToken}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(`Email provider returned ${response.status}`);
  return response.json();
}
