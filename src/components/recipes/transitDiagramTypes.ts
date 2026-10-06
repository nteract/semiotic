import type { ReactNode } from "react"
import type { Datum } from "../charts/shared/datumTypes"

export interface TransitDiagramLineDescriptor {
  id: string
  color?: string
  label?: string
}

export type TransitDiagramLineValue =
  | string
  | number
  | TransitDiagramLineDescriptor
  | ReadonlyArray<string | number | TransitDiagramLineDescriptor>

export type TransitDiagramMode = "primary" | "compact" | "minimap"

export interface TransitDiagramStationRenderInfo {
  /** Raw station datum supplied to the chart. */
  station: Datum
  /** Fitted center in plot coordinates. */
  x: number
  /** Fitted center in plot coordinates. */
  y: number
  /** Radius resolved for the active detail mode. */
  radius: number
  /** Ordered line ids that pass through this station. */
  lineIds: readonly string[]
  interchange: boolean
  mode: Exclude<TransitDiagramMode, "minimap">
}

export interface TransitDiagramConfig {
  /** Complete authored x/y positions win by default; otherwise use topology. */
  layoutMode?: "auto" | "authored" | "automatic"
  /** Station and track level of detail. @default "primary" */
  mode?: TransitDiagramMode
  xAccessor?: string | ((d: Datum) => number | undefined)
  yAccessor?: string | ((d: Datum) => number | undefined)
  labelAccessor?: string | ((d: Datum) => string)
  lineAccessor?: string | ((d: Datum) => TransitDiagramLineValue | undefined)
  lineColorAccessor?: string | ((d: Datum) => string | undefined)
  /** Derive one line per source node and propagate it through a directed DAG. */
  lineMode?: "source-rooted"
  /** Source-node color used by source-rooted lines. Defaults to `color`. */
  sourceColorAccessor?: string | ((d: Datum) => string)
  lineColors?: Record<string, string>
  /** Preferred global order for parallel lines. Remaining lines sort by id. */
  lineOrder?: string[]
  /** Field containing authored intermediate `{x,y}` points. @default "points" */
  pointsAccessor?: string
  padding?: number
  componentGap?: number
  /** Preferred endpoint for the automatic topology layout. */
  rootId?: string
  direction?: "left-to-right" | "right-to-left"
  lineWidth?: number
  lineGap?: number
  cornerRadius?: number
  stationRadius?: number
  interchangeRadius?: number
  stationFill?: string
  stationStroke?: string
  /** Replace primary/compact station circles with SVG rendered above the tracks. */
  renderStation?: (info: TransitDiagramStationRenderInfo) => ReactNode
  /** Place custom station content upright or on the projected ground. @default "upright" */
  chromePlacement?: "upright" | "ground"
  /** Screen extents [left, right, top, bottom] around custom station content; defaults to radius on each side. */
  stationBounds?: (
    info: TransitDiagramStationRenderInfo
  ) => readonly [number, number, number, number]
  showLabels?: boolean
  labelFontSize?: number
  labelColor?: string
  dimOpacity?: number
}
