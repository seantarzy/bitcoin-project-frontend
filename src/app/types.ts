export type ActivePoint = {
  d: string;
  p: string;
};

export interface DataPoint extends ActivePoint {
  x: number;
  y: number;
}

export interface SvgPoint extends ActivePoint {
  svgX: number;
  svgY: number;
}
