import { ImageResponse } from "next/og";
export const alt =
  "Bitcoin. But make it real life. What could your Bitcoin buy?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#141514",
          color: "#f2f3eb",
          padding: "65px",
          flexDirection: "column",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 23, color: "#dafa5c" }}>
          BITCOIN / IN REAL LIFE
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 95,
            fontWeight: 700,
            lineHeight: 1,
            marginTop: 55,
          }}
        >
          Bitcoin.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 95,
            fontWeight: 700,
            lineHeight: 1,
            color: "#dafa5c",
          }}
        >
          But make it real life.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 25,
            marginTop: 45,
            color: "#a5af97",
          }}
        >
          Coffee runs. Dream getaways. A place of your own.
        </div>
        <div style={{ display: "flex", fontSize: 18, marginTop: 35 }}>
          WHATSBITCOINSPRICE.COM
        </div>
      </div>
    ),
    size,
  );
}
