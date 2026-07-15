/**
 * PipelineStore configuration types + growing-window capacity constants.
 */
import type { Datum } from "../charts/shared/datumTypes"
import type {
  StreamChartType,
  ArrowOfTime,
  WindowMode,
  DecayConfig,
  PulseConfig,
  TransitionConfig,
  StalenessConfig,
  CurveType,
  BarStyle,
  ThemeSemanticColors,
  BandConfig,
  CandlestickStyle,
  Style
} from "./types"
import type { SymbolName } from "./symbolPath"
import type { CoercibleNumber } from "./accessorUtils"
import type { CustomLayout } from "./customLayout"
import type { CustomLayoutSelection } from "./customLayoutSelection"
import type { MarginType } from "../types/marginType"

export interface PipelineConfig {
  chartType: StreamChartType
  runtimeMode?: "streaming" | "bounded"
  /** Optional monotonic clock owned by a frame runtime or embedding host. */
  clock?: () => number
  windowSize: number
  windowMode: WindowMode
  arrowOfTime: ArrowOfTime
  extentPadding: number
  /** Pixel inset on scale ranges to prevent glyph clipping at chart edges. Default 0. */
  scalePadding?: number
  /** When `"exact"`, the x and y axis domains pin to the literal data
   *  min/max — `extentPadding` is skipped so the first and last ticks
   *  read as the actual data bounds. Default `"nice"` keeps the existing
   *  padded domain so glyphs at the extremes don't clip the plot edge. */
  axisExtent?: import("../charts/shared/axisExtent").AxisExtentMode
  /**
   * Hard cap for `windowMode: "growing"`. Defaults to
   * {@link DEFAULT_GROWING_MAX_CAPACITY} (100_000). Canvas scene graphs
   * degrade well before the previous 1e6 ceiling; pass a higher value
   * only when you know the host can afford it.
   */
  maxCapacity?: number

  // Accessors
  xAccessor?: string | ((d: Datum) => CoercibleNumber)
  yAccessor?: string | ((d: Datum) => CoercibleNumber)
  timeAccessor?: string | ((d: Datum) => CoercibleNumber)
  valueAccessor?: string | ((d: Datum) => CoercibleNumber)
  colorAccessor?: string | ((d: Datum) => string)
  sizeAccessor?: string | ((d: Datum) => CoercibleNumber)
  /** Categorical accessor → glyph shape (scatter/bubble). Emits SymbolSceneNodes. */
  symbolAccessor?: string | ((d: Datum) => string)
  /** Explicit `{category → shape}` map; unmapped categories auto-assign. */
  symbolMap?: Record<string, SymbolName>
  groupAccessor?: string | ((d: Datum) => string)
  categoryAccessor?: string | ((d: Datum) => string)
  lineDataAccessor?: string
  /**
   * Escape hatch for the unusual case where a *stable* function accessor's
   * captured semantics change without its identity changing (e.g. a
   * `useCallback([])`-memoized closure that reads external mutable state).
   * Accessor equality is identity-based, so such a change is invisible to the
   * store. Bump this number to force the store to re-derive domains and rebuild
   * the scene against the current accessor. Prefer changing the accessor
   * identity (add the captured value to the `useCallback` dependency array);
   * reach for `accessorRevision` only when you cannot. */
  accessorRevision?: number

  // Scale types
  xScaleType?: "linear" | "log" | "time"
  yScaleType?: "linear" | "log" | "symlog"

  // Fixed extents (partial: [min] or [min, undefined] to set only min)
  xExtent?: [number | undefined, number | undefined] | [number]
  yExtent?: [number | undefined, number | undefined] | [number]
  sizeRange?: [number, number]

  // Bar/heatmap specifics
  binSize?: number
  normalize?: boolean
  /** Stacked area baseline mode. Only consulted by stackedarea chart type. */
  baseline?: "zero" | "wiggle" | "silhouette" | "diverging"
  /** Stack order — see StreamXYFrameProps.stackOrder. */
  stackOrder?: "key" | "input" | "insideOut" | "asc" | "desc"

  // Candlestick accessors
  openAccessor?: string | ((d: Datum) => CoercibleNumber)
  highAccessor?: string | ((d: Datum) => CoercibleNumber)
  lowAccessor?: string | ((d: Datum) => CoercibleNumber)
  closeAccessor?: string | ((d: Datum) => CoercibleNumber)
  candlestickStyle?: CandlestickStyle
  /** Internal: set by PipelineStore when open/close accessors are both missing */
  candlestickRangeMode?: boolean

  // Bounds/uncertainty
  boundsAccessor?: string | ((d: Datum) => CoercibleNumber)
  boundsStyle?: Style | ((d: Datum, group?: string) => Style)

  // Per-point area baseline (for band/ribbon charts like percentile bands)
  y0Accessor?: string | ((d: Datum) => CoercibleNumber)

  // Asymmetric min/max band(s) drawn under the lines/areas. Single
  // BandConfig or array (fan chart). Normalized into the unified
  // `resolvedRibbons: ResolvedRibbon[]` at store construction alongside
  // any `boundsAccessor` ribbon.
  band?: BandConfig | BandConfig[]

  // Area gradient fill (opacity or multi-color)
  gradientFill?: { topOpacity: number; bottomOpacity: number } | { colorStops: Array<{ offset: number; color: string }> }
  // Series names rendered as areas in "mixed" chart type
  areaGroups?: Set<string>
  // Horizontal gradient for line strokes
  lineGradient?: { colorStops: Array<{ offset: number; color: string }> }

  // Style
  lineStyle?: Style | ((d: Datum, group?: string) => Style)
  pointStyle?: (d: Datum) => Style & { r?: number }
  areaStyle?: (d: Datum) => Style
  swarmStyle?: { radius?: number; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number }
  waterfallStyle?: { positiveColor?: string; negativeColor?: string; connectorStroke?: string; connectorWidth?: number; gap?: number; stroke?: string; strokeWidth?: number }
  colorScheme?: string | string[] | Record<string, string>
  /** Theme categorical palette — used as fallback when colorScheme is not an explicit array */
  themeCategorical?: string[]
  /**
   * Theme-resolved semantic role colors. Scene builders use these as the
   * default before falling back to hardcoded hex. Populated by the Stream
   * Frame from the in-memory `SemioticTheme.colors` object at render time
   * — the values are concrete hex (or whatever the preset declares), not
   * `var(...)` strings, and so this channel does NOT participate in the
   * DOM CSS cascade. Changing the ambient theme (`<ThemeProvider>`) or
   * swapping to a nested provider is how you override these values.
   *
   * Per-scope overrides via CSS custom properties
   * (e.g. `<div style={{ "--semiotic-danger": "#c00" }}>`) work only for
   * values a user explicitly passes through as `var(--...)` strings in
   * chart props — those are resolved via `getComputedStyle` in the
   * canvas renderer at paint time (see `resolveCSSColor.ts`). The theme
   * defaults in this field don't read CSS.
   */
  themeSemantic?: ThemeSemanticColors
  /** Theme sequential scheme name (e.g. "blues") — fallback when `colorScheme` is not explicitly set for magnitude encodings (heatmap, choropleth, size). */
  themeSequential?: string
  /** Theme diverging scheme name (e.g. "RdBu") — fallback when `colorScheme` is not explicitly set for midpoint encodings (likert, bivariate, ± deviation). */
  themeDiverging?: string
  barColors?: Record<string, string>
  /** Histogram bar style — fill/stroke/strokeWidth/gap. Accepted by RealtimeHistogram and routed through to the bar scene builder. */
  barStyle?: BarStyle

  // Annotations (threshold coloring uses these)
  annotations?: Datum[]

  // Realtime encoding
  decay?: DecayConfig
  pulse?: PulseConfig
  transition?: TransitionConfig
  /** Whether to animate elements on first render (points scale up, lines/areas clip from left, rects grow from baseline) */
  introAnimation?: boolean
  staleness?: StalenessConfig

  // Streaming heatmap
  heatmapAggregation?: "count" | "sum" | "mean"
  heatmapXBins?: number
  heatmapYBins?: number

  // Heatmap value labels
  showValues?: boolean
  heatmapValueFormat?: (v: number) => string

  // Point identification (for point-anchored annotations)
  pointIdAccessor?: string | ((d: Datum) => string)

  // Curve interpolation for line/area charts
  curve?: CurveType

  // ── customLayout escape hatch ─────────────────────────────────────
  /** When provided, replaces chart-type dispatch in scene building.
   *  Receives a LayoutContext (scales, dimensions, theme, resolveColor)
   *  and returns scene nodes plus optional overlays. */
  customLayout?: CustomLayout
  /** Called when `customLayout` throws. The previous successful custom scene
   * remains visible when one exists; inspect the diagnostic's `recovery` to
   * distinguish that case from an initial empty-scene failure. */
  onLayoutError?: (
    diagnostic: import("./customLayoutFailure").CustomLayoutFailureDiagnostic
  ) => void
  /** User-supplied config blob threaded through to LayoutContext.config. */
  layoutConfig?: object
  /** Resolved margin — passed through so LayoutContext.dimensions.margin reflects what the frame actually used. */
  layoutMargin?: MarginType
  /** Resolved shared selection projected into LayoutContext.selection. Owned by
   *  a dedicated frame effect (kept off the rebuild-triggering path). */
  layoutSelection?: CustomLayoutSelection | null
}

// ── Growing-window capacity ────────────────────────────────────────────

/** Default hard cap for `windowMode: "growing"`. */
export const DEFAULT_GROWING_MAX_CAPACITY = 100_000

/**
 * Dev-only warning threshold: when a growing buffer first crosses this
 * size we log once so unbounded push loops surface before the hard cap.
 */
export const GROWING_CAPACITY_WARN_THRESHOLD = 50_000

// ── PipelineStore ──────────────────────────────────────────────────────
