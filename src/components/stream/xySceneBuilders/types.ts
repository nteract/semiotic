/**
 * XYSceneContext — shared context passed to all XY scene builder functions.
 *
 * Mirrors the ordinal pattern (OrdinalSceneContext in ordinalSceneBuilders/).
 * Scene builders are pure functions that receive this context instead of
 * accessing PipelineStore instance fields directly.
 */
import type { StreamScales, SceneNode, Style, CurveType, StreamLayout } from "../types"

export interface XYSceneContext {
  scales: StreamScales
  config: XYSceneConfig
  getX: (d: any) => number
  getY: (d: any) => number
  getY0?: (d: any) => number | null
  getSize?: (d: any) => number
  getColor?: (d: any) => string
  getGroup?: (d: any) => string
  getCategory?: (d: any) => string
  getPointId?: (d: any) => string
  getBounds?: (d: any) => number | null
  getOpen?: (d: any) => number
  getHigh?: (d: any) => number
  getLow?: (d: any) => number
  getClose?: (d: any) => number

  /** Style resolvers — delegate to PipelineStore's cached color management */
  resolveLineStyle: (group: string, sampleDatum?: Record<string, any>) => Style
  resolveAreaStyle: (group: string, sampleDatum?: Record<string, any>) => Style
  resolveBoundsStyle: (group: string, sampleDatum?: Record<string, any>) => Style
  resolveColorMap: (data: Record<string, any>[]) => Map<string, string>
  resolveGroupColor: (group: string) => string | null

  /** Group data by lineBy/colorBy accessor */
  groupData: (data: Record<string, any>[]) => { key: string; data: Record<string, any>[] }[]

  /** Instance-scoped mutable cache for bar category ordering (prevents cross-instance leaks) */
  barCategoryCache?: { key: string; order: string[] } | null
}

/** Subset of PipelineConfig fields that scene builders need */
export interface XYSceneConfig {
  chartType: string
  curve?: CurveType
  colorScheme?: string | string[]
  normalize?: boolean
  gradientFill?: boolean | { topOpacity?: number; bottomOpacity?: number } | { colorStops: Array<{ offset: number; color: string }> }
  areaGroups?: Set<string>
  lineGradient?: { colorStops: Array<{ offset: number; color: string }> }
  annotations?: Record<string, any>[]

  // Point/bubble
  pointStyle?: (d: any) => Style & { r?: number }
  sizeRange?: [number, number]

  // Heatmap
  xAccessor?: string | ((d: any) => any)
  yAccessor?: string | ((d: any) => any)
  valueAccessor?: string | ((d: any) => any)
  heatmapAggregation?: "count" | "sum" | "mean"
  heatmapXBins?: number
  heatmapYBins?: number
  showValues?: boolean
  heatmapValueFormat?: (v: number) => string

  // Bar (realtime histogram)
  binSize?: number
  barColors?: Record<string, string>

  // Swarm
  swarmStyle?: { radius?: number; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number }

  // Waterfall
  waterfallStyle?: { positiveColor?: string; negativeColor?: string; gap?: number; stroke?: string; strokeWidth?: number; connectorStroke?: string; connectorWidth?: number }

  // Candlestick
  candlestickStyle?: { upColor?: string; downColor?: string; wickColor?: string; wickWidth?: number; bodyWidth?: number; rangeColor?: string }

  // Bounds
  boundsStyle?: Style | ((d: any, group: string) => Style)
  lineStyle?: Style | ((d: any, group: string) => Style)
  areaStyle?: (d: any) => Style
}
