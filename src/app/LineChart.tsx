import React, { useState } from "react";
import "./LineChart.css";
import { DataPoint, SvgPoint } from "./types";

interface LineChartProps {
  data: DataPoint[];
  color?: string;
  pointRadius?: number;
  svgHeight?: number;
  svgWidth?: number;
  xLabelSize?: number;
  yLabelSize?: number;
  onChartHover?: (
    hoverLoc: number | null,
    activePoint: SvgPoint | null
  ) => void;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  color = "#2196F3",
  pointRadius = 5,
  svgHeight = 300,
  svgWidth = 900,
  xLabelSize = 20,
  yLabelSize = 80,
  onChartHover = () => {}
}) => {
  const [hoverLoc, setHoverLoc] = useState<number | null>(null);
  const [activePoint, setActivePoint] = useState<SvgPoint | null>(null);

  const getX = () => {
    return {
      min: data[0].x,
      max: data[data.length - 1].x
    };
  };

  const getY = () => {
    return {
      min: data.reduce((min, p) => (p.y < min ? p.y : min), data[0].y),
      max: data.reduce((max, p) => (p.y > max ? p.y : max), data[0].y)
    };
  };

  const getSvgX = (x: number) => {
    return yLabelSize + (x / getX().max) * (svgWidth - yLabelSize);
  };

  const getSvgY = (y: number) => {
    const gY = getY();
    return (
      ((svgHeight - xLabelSize) * gY.max - (svgHeight - xLabelSize) * y) /
      (gY.max - gY.min)
    );
  };

  const makePath = () => {
    let pathD = `M ${getSvgX(data[0].x)} ${getSvgY(data[0].y)} `;

    pathD += data
      .map((point) => `L ${getSvgX(point.x)} ${getSvgY(point.y)} `)
      .join("");

    return (
      <path className="linechart_path" d={pathD} style={{ stroke: color }} />
    );
  };

  const makeArea = () => {
    let pathD = `M ${getSvgX(data[0].x)} ${getSvgY(data[0].y)} `;

    pathD += data
      .map((point) => `L ${getSvgX(point.x)} ${getSvgY(point.y)} `)
      .join("");

    const x = getX();
    const y = getY();
    pathD += `L ${getSvgX(x.max)} ${getSvgY(y.min)} L ${getSvgX(
      x.min
    )} ${getSvgY(y.min)} `;

    return <path className="linechart_area" d={pathD} />;
  };

  const makeAxis = () => {
    const x = getX();
    const y = getY();

    return (
      <g className="linechart_axis">
        <line
          x1={getSvgX(x.min) - yLabelSize}
          y1={getSvgY(y.min)}
          x2={getSvgX(x.max)}
          y2={getSvgY(y.min)}
          strokeDasharray="5"
        />
        <line
          x1={getSvgX(x.min) - yLabelSize}
          y1={getSvgY(y.max)}
          x2={getSvgX(x.max)}
          y2={getSvgY(y.max)}
          strokeDasharray="5"
        />
      </g>
    );
  };

  const makeLabels = () => {
    const padding = 5;

    return (
      <g className="linechart_label">
        {/* Y AXIS LABELS */}
        <text
          transform={`translate(${yLabelSize / 2}, 20)`}
          textAnchor="middle"
        >
          {getY().max.toLocaleString("us-EN", {
            style: "currency",
            currency: "USD"
          })}
        </text>
        <text
          transform={`translate(${yLabelSize / 2}, ${
            svgHeight - xLabelSize - padding
          })`}
          textAnchor="middle"
        >
          {getY().min.toLocaleString("us-EN", {
            style: "currency",
            currency: "USD"
          })}
        </text>
        {/* X AXIS LABELS */}
        <text
          transform={`translate(${yLabelSize}, ${svgHeight})`}
          textAnchor="start"
        >
          {data[0].d}
        </text>
        <text
          transform={`translate(${svgWidth}, ${svgHeight})`}
          textAnchor="end"
        >
          {data[data.length - 1].d}
        </text>
      </g>
    );
  };

  const getCoords = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const svgLocation = document
      .getElementsByClassName("linechart")[0]
      .getBoundingClientRect();
    const adjustment = (svgLocation.width - svgWidth) / 2; // takes padding into consideration
    const relativeLoc = e.clientX - svgLocation.left - adjustment;

    const svgData: SvgPoint[] = data.map((point: DataPoint) => ({
      svgX: getSvgX(point.x),
      svgY: getSvgY(point.y),
      d: point.d,
      p: point.p
    }));

    let closestPoint = {} as SvgPoint;
    for (let i = 0, c = 500; i < svgData.length; i++) {
      if (Math.abs(svgData[i].svgX - relativeLoc) <= c) {
        c = Math.abs(svgData[i].svgX - relativeLoc);
        closestPoint = svgData[i];
      }
    }

    if (relativeLoc - yLabelSize < 0) {
      stopHover();
    } else {
      setHoverLoc(relativeLoc);
      setActivePoint(closestPoint);
      onChartHover(relativeLoc, closestPoint);
    }
  };

  const stopHover = () => {
    setHoverLoc(null);
    setActivePoint(null);
    onChartHover(null, null);
  };

  const makeActivePoint = () => {
    return (
      <circle
        className="linechart_point"
        style={{ stroke: color }}
        r={pointRadius}
        cx={activePoint?.svgX}
        cy={activePoint?.svgY}
      />
    );
  };

  const createLine = () => {
    return (
      <line
        className="hoverLine"
        x1={hoverLoc!}
        y1={-8}
        x2={hoverLoc!}
        y2={svgHeight - xLabelSize}
      />
    );
  };

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className={"linechart"}
      onMouseLeave={stopHover}
      onMouseMove={(e) => getCoords(e)}
    >
      <g>
        {makeAxis()}
        {makePath()}
        {makeArea()}
        {makeLabels()}
        {hoverLoc ? createLine() : null}
        {hoverLoc ? makeActivePoint() : null}
      </g>
    </svg>
  );
};

export default LineChart;
