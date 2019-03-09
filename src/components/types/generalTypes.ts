export type GenericObject = { [key: string]: any }

export interface MarginType {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type ProjectionTypes = "vertical" | "horizontal" | "radial"

export interface ProjectedPoint {
  x: number;
  y: number;
  yTop?: number;
  yMiddle?: number;
  yBottom?: number;
  parentSummary?: object;
  parentLine?: object;
  percent?: number;
  data?: object;
}

export interface ProjectedLine {
  data: ProjectedPoint[];
}

export interface ProjectedSummary {
  _baseData: object[];
  _xyfCoordinates: object[][][] | object[][];
  data: object[];
  y: number;
  x: number;
  parentSummary?: GenericObject;
}

export type CanvasPostProcessTypes = Function | "chuckClose"

export type ExtentSettingsType = { extent?: Array<number>, onChange?: Function }

export type accessorType = any

export interface AccessorFnType {
  <T>(arg: GenericObject): T;
}

export type BasicLineTypes =
  | "line"
  | "area"
  | "summary"
  | "cumulative"
  | "cumulative-reverse"
  | "linepercent"
  | "stackedarea"
  | "stackedarea-invert"
  | "stackedpercent"
  | "bumparea"
  | "bumparea-invert"
  | "bumpline"
  | "stackedpercent-invert"
  | "difference"
export interface LineTypeSettings {
  type: BasicLineTypes | Function;
}

export type BasicSummaryTypes = "basic" | "contour" | "hexbin" | "heatmap"

export interface SummaryTypeSettings {
  type: BasicSummaryTypes | Function;
}

export interface RawLine {}

export interface RawSummary {
  processedData?: object[];
}

export interface RawPoint {}

export interface CustomAreaMarkProps {
  d: object;
  baseMarkProps: object;
  margin: object;
  styleFn: Function;
  classFn: Function;
  renderFn: Function;
  chartSize: Function;
  adjustedSize: number[];
}

export interface ProjectedBin {
  x: number;
  y: number;
  binItems: object[];
  customMark?: (props: CustomAreaMarkProps) => JSX.Element;
  _xyfCoordinates: Array<number[]>;
  value: number;
  percent: number;
  data: object;
  parentSummary: object;
  centroid: boolean;
}

export interface D3ScaleType {
  (): any;
  invert: Function;
}
