"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export default function Preferences() {
  const [token, setToken] = useState("");
  const [btc, setBtc] = useState("1");
  const [frequency, setFrequency] = useState("daily");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("Loading your preferences…");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const t = new URLSearchParams(location.hash.slice(1)).get("token") || "";
    setToken(t);
    history.replaceState(null, "", "/newsletter");
    if (!t) {
      setMessage("Open the private preferences link from your email.");
      return;
    }
    fetch("/.netlify/functions/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: t, action: "read" }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setBtc(String(d.btc));
        setFrequency(d.frequency);
        setStatus(d.status);
        setMessage(
          d.status === "pending"
            ? "One more click to confirm your subscription."
            : "Your email preferences.",
        );
      })
      .catch((e) => setMessage(e.message));
  }, []);
  async function action(action: string) {
    setBusy(true);
    try {
      const r = await fetch("/.netlify/functions/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, btc, frequency }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage(d.message);
      setStatus(d.status);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="wrap daily-preferences">
      <Link href="/daily">← The Daily Bitcoin</Link>
      <h1>
        Your daily dose.
        <br />
        Your rules.
      </h1>
      <p role="status">{message}</p>
      {status === "pending" ? (
        <button
          className="daily-primary"
          disabled={busy}
          onClick={() => action("confirm")}
        >
          Confirm my subscription
        </button>
      ) : null}
      {status === "confirmed" && (
        <>
          <label>
            Hypothetical BTC amount
            <input
              type="number"
              value={btc}
              onChange={(e) => setBtc(e.target.value)}
            />
          </label>
          <label>
            Frequency
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="daily">Daily discovery</option>
              <option value="weekly">One Sunday pick</option>
            </select>
          </label>
          <button
            className="daily-primary"
            disabled={busy}
            onClick={() => action("update")}
          >
            Save preferences
          </button>
        </>
      )}
      {status && status !== "unsubscribed" && (
        <button disabled={busy} onClick={() => action("unsubscribe")}>
          Unsubscribe
        </button>
      )}
    </main>
  );
}
