import { ImageResponse } from "next/og";
import { challengeScore } from "@/services/gameChart";
export async function GET(request: Request) {
  const score =
    challengeScore(new URL(request.url).searchParams.get("score")) ?? 0;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#101613",
          color: "#f0f2e9",
          display: "flex",
          flexDirection: "column",
          padding: "60px 70px",
          fontFamily: "sans-serif",
          border: "2px solid #344130",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 20,
            letterSpacing: 3,
            color: "#c5ff5d",
          }}
        >
          <span>BITCOIN / IN REAL LIFE</span>
          <span>UP / FLAT / DOWN · 5 SECONDS</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 45 }}>
          <span
            style={{
              fontSize: score >= 1000 ? 140 : score >= 100 ? 180 : 210,
              fontWeight: 700,
              lineHeight: 1,
              color: "#c5ff5d",
              letterSpacing: -12,
            }}
          >
            {score}
          </span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 62, fontWeight: 700, lineHeight: 1.05 }}>
              {score === 1 ? "right call." : "right calls."}
            </span>
            <span style={{ fontSize: 62, fontWeight: 700, lineHeight: 1.05 }}>
              Can you beat it?
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {Array.from({ length: Math.min(score, 12) }, (_, i) => (
            <div
              key={i}
              style={{
                width: 43,
                height: 43,
                borderRadius: 7,
                background: "#c5ff5d",
              }}
            />
          ))}
          {score === 0 && (
            <span style={{ fontSize: 25, color: "#a4af9d" }}>
              Your first streak starts here.
            </span>
          )}
          {score > 12 && (
            <span style={{ fontSize: 26, marginLeft: 8 }}>+{score - 12}</span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #344130",
            paddingTop: 26,
            fontSize: 23,
          }}
        >
          <span>whatsbitcoinsprice.com/play</span>
          <span style={{ color: "#a4af9d" }}>
            Free play. Real Bitcoin. Zero stakes.
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=86400" },
    },
  );
}
