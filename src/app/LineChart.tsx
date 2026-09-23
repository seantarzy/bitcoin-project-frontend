import { useState } from "react";
import type { DataPoint } from "./types";
import { chartScale } from "@/services/marketData";
import "./LineChart.css";

export default function LineChart({ data }: { data: DataPoint[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const points = data.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (points.length < 2) return <p className="text-center">Not enough history to draw a chart.</p>;
  const width = 900, height = 300, left = 120, top = 20, bottom = 265;
  const scale = chartScale(points);
  const x = (value: number) => left + scale.x(value) * (width - left - 10);
  const y = (value: number) => bottom - scale.y(value) * (bottom - top);
  const line = points.map((point, i) => `${i ? "L" : "M"} ${x(point.x)} ${y(point.y)}`).join(" ");
  const first = points[0], last = points[points.length - 1];
  const active = selected === null ? null : points[selected];
  const label = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  const choosePoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const cursor = (event.clientX - bounds.left) / bounds.width * width;
    let nearest = 0;
    points.forEach((point, i) => { if (Math.abs(x(point.x) - cursor) < Math.abs(x(points[nearest].x) - cursor)) nearest = i; });
    setSelected(nearest);
  };
  return (
    <figure className="w-full min-w-0">
      <svg viewBox={`0 0 ${width} ${height}`} className="linechart" role="img"
        aria-label={`Bitcoin daily closing prices from ${first.d} to ${last.d}`}
        onPointerMove={choosePoint} onPointerLeave={() => setSelected(null)}>
        <title>Bitcoin daily closing prices</title>
        <desc>From {first.p} on {first.d} to {last.p} on {last.d}.</desc>
        {[scale.min, scale.max].map(value => <g key={value}>
          <line x1={left} x2={width} y1={y(value)} y2={y(value)} stroke="#64748b" strokeDasharray="5" />
          <text x={left - 10} y={y(value) + 5} textAnchor="end" fill="#99f6e4" fontSize="16">{label(value)}</text>
        </g>)}
        <path d={`${line} L ${x(last.x)} ${bottom} L ${x(first.x)} ${bottom} Z`} fill="#2dd4bf" opacity="0.12" />
        <path d={line} fill="none" stroke="#2dd4bf" strokeWidth="3" />
        <text x={left} y={height - 5} fill="#99f6e4" fontSize="16">{first.d}</text>
        <text x={width - 10} y={height - 5} fill="#99f6e4" fontSize="16" textAnchor="end">{last.d}</text>
        {active && <circle cx={x(active.x)} cy={y(active.y)} r="5" fill="#fff" stroke="#2dd4bf" />}
      </svg>
      <figcaption className="min-h-6 text-center text-sm text-teal-200">{active ? `${active.d}: ${active.p}` : "Hover or touch the chart to inspect a daily close."}</figcaption>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-teal-200">View daily prices</summary>
        <div className="mt-2 max-h-60 overflow-auto">
          <table className="w-full text-left"><caption className="sr-only">Daily closing prices</caption>
            <thead><tr><th scope="col">Date (UTC)</th><th scope="col">Price</th></tr></thead>
            <tbody>{points.map(point => <tr key={point.x}><td>{point.d}</td><td>{point.p}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
