import type { ReactNode } from "react"
import type { Datum } from "../components/charts/shared/datumTypes"
import type { StreamXYFrameProps, Style } from "../components/stream/types"
import type { StreamOrdinalFrameProps } from "../components/stream/ordinalTypes"
import type { StreamNetworkFrameProps } from "../components/stream/networkTypes"
import type { StreamGeoFrameProps } from "../components/stream/geoTypes"

type CapturedStyleResult = Required<Style> & { pointerEvents: string }
type CapturedStyle = (datum: Datum, group?: string) => CapturedStyleResult
type CapturedNumberAccessor = (datum: Datum) => number
type CapturedValueAccessor = (datum: Datum) => number | string | Date
type CapturedStringAccessor = (datum: Datum) => string
type CapturedTooltip = (datum: Datum) => ReactNode

interface CapturedLegendItem {
  label: ReactNode
  value?: string | number
  color?: string
}

interface CapturedLegend {
  legendGroups: Array<{
    label?: ReactNode
    items: CapturedLegendItem[]
    styleFn: CapturedStyle
  }>
}

interface CapturedNetworkLayoutConfig {
  bands: Array<Datum & { id: string }>
  ribbons: Datum[]
}

export type CapturedXYFrameProps = Omit<
  Required<StreamXYFrameProps>,
  | "lineStyle"
  | "pointStyle"
  | "tooltipContent"
  | "legend"
  | "xAccessor"
  | "yAccessor"
  | "groupAccessor"
> & {
  lineStyle: CapturedStyle
  pointStyle: CapturedStyle
  tooltipContent: CapturedTooltip
  legend: CapturedLegend
  xAccessor: CapturedValueAccessor
  yAccessor: CapturedNumberAccessor
  groupAccessor: CapturedStringAccessor
}

export type CapturedOrdinalFrameProps = Omit<
  Required<StreamOrdinalFrameProps>,
  | "pieceStyle"
  | "summaryStyle"
  | "tooltipContent"
  | "legend"
  | "oAccessor"
  | "rAccessor"
> & {
  pieceStyle: CapturedStyle
  summaryStyle: CapturedStyle
  tooltipContent: CapturedTooltip
  legend: CapturedLegend
  oAccessor: CapturedStringAccessor
  rAccessor: CapturedNumberAccessor
}

export type CapturedNetworkFrameProps = Omit<
  Required<StreamNetworkFrameProps>,
  | "nodeStyle"
  | "edgeStyle"
  | "hierarchySum"
  | "nodeLabel"
  | "layoutConfig"
> & {
  nodeStyle: CapturedStyle
  edgeStyle: CapturedStyle
  hierarchySum: CapturedNumberAccessor
  nodeLabel: CapturedStringAccessor
  layoutConfig: CapturedNetworkLayoutConfig
}

export type CapturedGeoFrameProps = Omit<
  Required<StreamGeoFrameProps>,
  | "areaStyle"
  | "lineStyle"
  | "pointStyle"
  | "xAccessor"
  | "yAccessor"
  | "tooltipContent"
  | "legend"
  | "foregroundGraphics"
> & {
  areaStyle: CapturedStyle
  lineStyle: CapturedStyle
  pointStyle: CapturedStyle
  xAccessor: CapturedNumberAccessor
  yAccessor: CapturedNumberAccessor
  tooltipContent: CapturedTooltip
  legend: CapturedLegend
  foregroundGraphics: ReactNode
}
