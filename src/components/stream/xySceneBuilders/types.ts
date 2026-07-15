import type { Datum } from "../../charts/shared/datumTypes"
import type { CoercibleNumber } from "../accessorUtils"
import type { AreaGradientConfig } from "./areaGradient"
/**
 * XYSceneContext — shared context passed to all XY scene builder functions.
 *
 * Mirrors the ordinal pattern (OrdinalSceneContext in ordinalSceneBuilders/).
 * Scene builders are pure functions that receive this context instead of
 * accessing PipelineStore instance fields directly.
 */
import type { StreamScales, Style, CurveType, BarStyle, ThemeSemanticColors } from "../types"
import type { SymbolName } from "../symbolPath"
import type { ResolvedRibbon } from "./ribbonScene"

export interface XYSceneContext {
  scales: StreamScales
  config: XYSceneConfig
  getX: (d: Datum) => number
  getY: (d: Datum) => number
  getY0?: (d: Datum) => number | null
  getSize?: (d: Datum) => number
  getColor?: (d: Datum) => string
  /** Categorical accessor → glyph shape (scatter/bubble symbolBy). */
  getSymbol?: (d: Datum) => string
  getGroup?: (d: Datum) => string
  getCategory?: (d: Datum) => string
  getPointId?: (d: Datum) => string
  /** Resolved ribbons — unified list from `boundsAccessor` + `band`. The
   *  scene builders iterate this once instead of carrying two parallel
   *  code paths. Empty when neither prop is set. */
  ribbons?: ResolvedRibbon[]
  getOpen?: (d: Datum) => number
  getHigh?: (d: Datum) => number
  getLow?: (d: Datum) => number
  getClose?: (d: Datum) => number

  /** Style resolvers — delegate to PipelineStore's cached color management */
  resolveLineStyle: (group: string, sampleDatum?: Datum) => Style
  resolveAreaStyle: (group: string, sampleDatum?: Datum) => Style
  resolveBoundsStyle: (group: string, sampleDatum?: Datum) => Style
  resolveColorMap: (data: Datum[]) => Map<string, string>
  resolveGroupColor: (group: string) => string | null

  /** Group data by lineBy/colorBy accessor */
  groupData: (data: Datum[]) => { key: string; data: Datum[] }[]

  /** Instance-scoped mutable cache for bar category ordering (prevents cross-instance leaks) */
  barCategoryCache?: { key: string; order: string[] } | null
}

/** Subset of PipelineConfig fields that scene builders need */
export interface XYSceneConfig {
  chartType?: string
  curve?: CurveType
  colorScheme?: string | string[] | Record<string, string>
  normalize?: boolean
  /** Stacked area baseline. "zero" (default), "wiggle" (streamgraph), "silhouette" (centered), "diverging" (signed y above/below 0). */
  baseline?: "zero" | "wiggle" | "silhouette" | "diverging"
  /** Stack order — see PipelineConfig.stackOrder. */
  stackOrder?: "key" | "input" | "insideOut" | "asc" | "desc"
  gradientFill?: AreaGradientConfig
  areaGroups?: Set<string>
  lineGradient?: { colorStops: Array<{ offset: number; color: string }> }
  annotations?: Datum[]

  // Point/bubble
  pointStyle?: (d: Datum) => Style & { r?: number }
  sizeRange?: [number, number]
  /** Explicit `{category → shape}` map for symbolBy; unmapped auto-assign. */
  symbolMap?: Record<string, SymbolName>

  // Heatmap
  xAccessor?: string | ((d: Datum) => CoercibleNumber)
  yAccessor?: string | ((d: Datum) => CoercibleNumber)
  valueAccessor?: string | ((d: Datum) => CoercibleNumber)
  heatmapAggregation?: "count" | "sum" | "mean"
  heatmapXBins?: number
  heatmapYBins?: number
  showValues?: boolean
  heatmapValueFormat?: (v: number) => string

  // Bar (realtime histogram)
  binSize?: number
  barColors?: Record<string, string>
  /** Bar fill/stroke/strokeWidth/gap. Threaded through from RealtimeHistogram. */
  barStyle?: BarStyle

  // Theme-resolved semantic role colors — default fallbacks when no user
  // color is set. Populated by the Stream Frame from active SemioticTheme.
  // See `ThemeSemanticColors` in ../types for the canonical definition.
  themeSemantic?: Partial<ThemeSemanticColors>
  /** Theme sequential scheme name — fallback when colorScheme is not set (heatmap). */
  themeSequential?: string
  /** Theme diverging scheme name — fallback when colorScheme is not set. */
  themeDiverging?: string

  // Swarm
  swarmStyle?: { radius?: number; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number }

  // Waterfall
  waterfallStyle?: { positiveColor?: string; negativeColor?: string; gap?: number; stroke?: string; strokeWidth?: number; opacity?: number; connectorStroke?: string; connectorWidth?: number }

  // Candlestick
  candlestickStyle?: { upColor?: string; downColor?: string; wickColor?: string; wickWidth?: number; bodyWidth?: number; rangeColor?: string }
  /** True when candlestick is in range/dumbbell mode (no open/close accessors provided) */
  candlestickRangeMode?: boolean

  // Bounds
  boundsStyle?: Style | ((d: Datum, group: string) => Style)
  lineStyle?: Style | ((d: Datum, group: string) => Style)
  areaStyle?: (d: Datum) => Style
}
