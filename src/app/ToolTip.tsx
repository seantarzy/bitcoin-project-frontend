import React from "react";
import "./ToolTip.css";
import { ActivePoint } from "./types";

const WIDTH = 100;

export function ToolTip({
  hoverLoc,
  activePoint
}: {
  hoverLoc: number;
  activePoint: ActivePoint;
}) {
  const svgLocation = document
    .getElementsByClassName("linechart")[0]
    .getBoundingClientRect();

  let placementStyles: {
    left: number;
    right: number;
    width: string;
  } = {
    left: 0,
    right: 0,
    width: "auto"
  };
  placementStyles.width = WIDTH + "px";
  placementStyles.left = hoverLoc + svgLocation.left - WIDTH / 2;

  return (
    <div className="hover" style={placementStyles}>
      <div className="date">{activePoint.d}</div>
      <div className="price">{activePoint.p}</div>
    </div>
  );
}

export default ToolTip;
