import { ImageResponse } from "next/og";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "The Daily Bitcoin. Real things. Bitcoin prices.";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#141514",
        color: "#f6f5ed",
        padding: "70px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", fontSize: 23, color: "#dafa5c" }}>
        BITCOIN / IN REAL LIFE
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 106,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: -6,
        }}
      >
        <span>The Daily</span>
        <span style={{ color: "#dafa5c" }}>Bitcoin.</span>
      </div>
      <div style={{ display: "flex", fontSize: 28 }}>
        Real listings. Surprising possibilities. One find at a time.
      </div>
    </div>,
    size,
  );
}
