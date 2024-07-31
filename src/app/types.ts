export type ActivePoint = {
  d: string;
  p: string;
};

export interface DataPoint extends ActivePoint {
  x: number;
  y: number;
  cy: number; // converted y value (for display)
}

export interface SvgPoint extends ActivePoint {
  svgX: number;
  svgY: number;
}
